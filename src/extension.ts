// extension.ts

/**
 * @author Pengfei Ni
 *
 * @license
 * Copyright (c) 2022 - 2023, Ali Gençay
 * Copyright (c) 2024 - Present, Pengfei Ni
 *
 * All rights reserved. Code licensed under the ISC license
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */

/**
 * This module serves as the main entry point for the ChatGPT VS Code extension.
 * It manages the activation and deactivation of the extension, sets up commands,
 * and provides the necessary context for file decorations and interactions with
 * the ChatGPT API.
 * 
 * Key Features:
 * - Implements the `ContextDecorationProvider` to manage file decorations for
 *   files and folders explicitly included in the ChatGPT context.
 * - Provides commands for adding/removing files and folders from the context,
 *   clearing the context, and sending requests to the ChatGPT API.
 * - Handles configuration changes and updates the context and commands accordingly.
 * - Integrates with the VS Code API to manage user interactions and display
 *   information in the editor.
 * 
 * Usage:
 * - The `activate` function initializes the extension and registers all commands
 *   and providers needed for functionality.
 * - The `deactivate` function allows for cleanup when the extension is deactivated.
 */

import * as path from 'path';
import * as vscode from 'vscode';

import AbortController from "abort-controller";
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { CoreLogger } from "./coreLogger";
import { createChatGptViewProvider } from "./factory";

global.AbortController = AbortController;

const menuCommands = [
  "addTests",
  "findProblems",
  "optimize",
  "explain",
  "addComments",
  "completeCode",
  "generateCode",
  "customPrompt1",
  "customPrompt2",
  "adhoc",
];

const logFilePath = path.join(__dirname, 'error.log');

/**
 * Provides file decorations for files and folders in the ChatGPT context.
 * Implements the `vscode.FileDecorationProvider` interface to manage
 * visual indicators for files that are explicitly included in the context.
 */
export class ContextDecorationProvider implements vscode.FileDecorationProvider {
  private _explicitFiles: Map<string, boolean> = new Map<string, boolean>();
  private _onDidChange = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
  readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[]> = this._onDidChange.event;

  /**
   * Creates an instance of `ContextDecorationProvider`.
   * 
   * This constructor initializes the provider by loading previously saved
   * files and folders from the global state and registers the provider
   * with the VS Code window. It sets up the necessary event emitters
   * for file decoration changes.
   * 
   * @param context - The extension context, providing access to the global state
   *                  and enabling the registration of commands and providers.
   */
  constructor(private context: vscode.ExtensionContext) {
    // Load saved files and folders from global state
    this._loadExplicitFilesFromState();
    this.context.subscriptions.push(vscode.window.registerFileDecorationProvider(this));
  }

  /**
   * Provides file decoration for a given URI.
   * 
   * This method checks if the specified file or folder is explicitly added
   * to the ChatGPT context and returns the corresponding decoration if it is.
   * 
   * @param uri - The URI of the file or folder for which to provide decoration.
   * @returns A `vscode.FileDecoration` object if the file is in the context; otherwise, `undefined`.
   */
  provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    // Check if the file or folder is explicitly added to the context
    const isExplicitlyAdded = this._explicitFiles.get(uri.fsPath);

    if (isExplicitlyAdded) {
      return {
        badge: '★',
        tooltip: 'This file/folder is in the ChatGPT context',
        color: new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'),
      };
    }

    return undefined; // No decoration if not in context
  }

  /**
   * Updates the file decoration for a specific resource.
   * 
   * This method adds or removes a file or folder from the ChatGPT context,
   * triggering a refresh of the decorations in the UI. If adding, it will
   * recursively add all contents of a folder. If removing, it will also
   * remove all contents of the folder from the context.
   * 
   * @param resourceUri - The URI of the file or folder to update.
   * @param isAdding - A boolean indicating whether the resource is being added
   *                  to the context (true) or removed (false).
   */
  updateTreeFileDecoration(resourceUri: vscode.Uri, isAdding: boolean = true): void {
    const stat = statSync(resourceUri.fsPath);

    if (isAdding) {
      if (stat.isDirectory()) {
        // Add folder and its contents recursively
        this._addFolderAndContents(resourceUri.fsPath);
      } else if (stat.isFile()) {
        // Add individual file
        this._addFile(resourceUri.fsPath);
      }
    } else {
      // Remove the file/folder from the context
      this._removeFileOrFolder(resourceUri.fsPath);
    }

    // Trigger an event to refresh decorations
    this._onDidChange.fire(undefined);

    // Save the current explicit files and folders to the global state.
    this._saveExplicitFilesToState();
  }

  /**
   * Recursively adds a folder and all its contents to the explicit files map.
   * 
   * This method checks if the specified folder is already in the explicit files
   * map, and if not, it adds it. It then iterates through all entries in the
   * folder, adding each file and subfolder recursively.
   * 
   * @param folderPath - The path of the folder to add to the explicit files.
   */
  private _addFolderAndContents(folderPath: string) {
    if (!this._explicitFiles.has(folderPath)) {
      this._explicitFiles.set(folderPath, true); // Add the folder itself
    }

    const entries = readdirSync(folderPath);
    entries.forEach((entry) => {
      const entryPath = join(folderPath, entry);
      const entryStat = statSync(entryPath);

      if (entryStat.isDirectory()) {
        this._addFolderAndContents(entryPath); // Recursively add subfolders
      } else if (entryStat.isFile()) {
        this._addFile(entryPath); // Add individual files
      }
    });
  }

  /**
   * Adds a file to the explicit files map.
   * 
   * This method checks if the specified file is already in the explicit files
   * map, and if not, it adds it.
   * 
   * @param filePath - The path of the file to add to the explicit files.
   */
  private _addFile(filePath: string) {
    if (!this._explicitFiles.has(filePath)) {
      this._explicitFiles.set(filePath, true);
    }
  }

  /**
   * Removes a file or folder from the ChatGPT context.
   * 
   * This method deletes the specified file or folder from the explicit files map.
   * If the specified path is a directory, it will recursively remove all its contents.
   * After removal, it shows a notification indicating the resource has been removed.
   * 
   * @param filePath - The path of the file or folder to be removed from the context.
   */
  private _removeFileOrFolder(filePath: string) {
    if (this._explicitFiles.has(filePath)) {
      this._explicitFiles.delete(filePath);
    }

    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      // Recursively remove contents of the folder
      const entries = readdirSync(filePath);
      entries.forEach((entry) => {
        const entryPath = join(filePath, entry);
        const entryStat = statSync(entryPath);

        if (entryStat.isDirectory()) {
          this._removeFileOrFolder(entryPath);
        } else if (entryStat.isFile()) {
          this._explicitFiles.delete(entryPath);
        }
      });
    }

    vscode.window.showInformationMessage(`Removed from ChatGPT context: ${filePath}`);
  }

  /**
   * Clears all files and folders from the ChatGPT context.
   * 
   * This method removes all entries from the explicit files map and 
   * triggers an event to refresh the decorations in the UI. It also
   * saves the updated state to the global state, ensuring that the 
   * cleared context is reflected in subsequent sessions.
   */
  clearAllFiles() {
    this._explicitFiles.clear();
    this._onDidChange.fire(undefined); // Trigger event to refresh decorations
    this._saveExplicitFilesToState();  // Clear saved state
    vscode.window.showInformationMessage('Cleared all files and folders from ChatGPT context.');
  }

  /**
   * Loads the saved files and folders from the global state into the explicit files map.
   * 
   * This method retrieves the previously saved file paths from the global state and
   * adds them to the explicit files map, allowing the context to persist across sessions.
   */
  private _loadExplicitFilesFromState() {
    const savedFiles = this.context.globalState.get<string[]>('chatgpt.explicitFiles', []);
    savedFiles.forEach((filePath) => {
      this._explicitFiles.set(filePath, true);
    });
  }

  /**
   * Saves the current explicit files and folders to the global state.
   * 
   * This method converts the keys of the explicit files map into an array
   * and stores it in the extension's global state. This ensures that
   * the explicit files are persisted across sessions and can be reloaded
   * when the extension is activated.
   */
  private _saveExplicitFilesToState() {
    const filePaths = Array.from(this._explicitFiles.keys());
    this.context.globalState.update('chatgpt.explicitFiles', filePaths);
  }

  /**
   * Disposes of the context decoration provider, cleaning up resources.
   * 
   * This method should be called when the provider is no longer needed
   * to ensure that event listeners and resources are properly released.
   * It unsubscribes from all events and cleans up any allocated resources
   * to prevent memory leaks.
   */
  dispose() {
    this._onDidChange.dispose();
  }
}


/**
 * Activates the extension, setting up commands, providers, and event listeners.
 * This function is called when the extension is activated by the user.
 * 
 * It initializes the context decoration provider, registers various commands
 * for interacting with files and folders, and sets up event listeners for
 * configuration changes. The function also prepares the webview provider for
 * displaying ChatGPT interactions.
 * 
 * @param context - The extension context, providing information about the
 *                  extension's lifecycle, including subscriptions to commands
 *                  and services.
 */
export async function activate(context: vscode.ExtensionContext) {
  const contextProvider = new ContextDecorationProvider(context);

  let adhocCommandPrefix: string =
    context.globalState.get("chatgpt-adhoc-prompt") || "";

  const logger = CoreLogger.getInstance();

  // Command to add a specific file or folder to the context
  const addFileOrFolderToContext = vscode.commands.registerCommand('chatgpt-copilot.addFileOrFolderToContext', async (uri: vscode.Uri) => {
    if (uri && uri.fsPath) {
      contextProvider.updateTreeFileDecoration(uri);
      vscode.window.showInformationMessage(`Added file/folder to ChatGPT context: ${uri.fsPath}`);
    } else {
      vscode.window.showErrorMessage("No file or folder selected.");
    }
  });

  // Command to remove a specific file or folder from the context
  const removeFileOrFolderFromContext = vscode.commands.registerCommand('chatgpt-copilot.removeFileOrFolderFromContext', async (uri: vscode.Uri) => {
    if (uri && uri.fsPath) {
      contextProvider.updateTreeFileDecoration(uri, false);
      vscode.window.showInformationMessage(`Removed file/folder from ChatGPT context: ${uri.fsPath}`);
    } else {
      vscode.window.showErrorMessage("No file or folder selected.");
    }
  });

  // Command to clear all explicitly added files and folders
  const clearAllFilesFromContext = vscode.commands.registerCommand('chatgpt-copilot.clearAllFilesFromContext', async () => {
    contextProvider.clearAllFiles();
  });

  context.subscriptions.push(
    addFileOrFolderToContext,
    removeFileOrFolderFromContext,
    clearAllFilesFromContext,
  );

  const provider = createChatGptViewProvider(context, logger);

  const view = vscode.window.registerWebviewViewProvider(
    "chatgpt-copilot.view",
    provider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    },
  );

  /**
   * Command to show the files in the ChatGPT view.
   * 
   * This command triggers the display of the files currently in the ChatGPT context.
   */
  const showTypeHint = vscode.commands.registerCommand('chatgpt-copilot.showTypeHint', async () => {
    provider.showFiles();
  });

  context.subscriptions.push(view, showTypeHint);

  /**
   * Command to send free text to the ChatGPT API.
   * 
   * This command prompts the user for input and sends the entered text to the
   * ChatGPT API for processing.
   */
  const freeText = vscode.commands.registerCommand(
    "chatgpt-copilot.freeText",
    async () => {
      const value = await vscode.window.showInputBox({
        prompt: "Ask anything...",
      });

      if (value) {
        provider?.sendApiRequest(value, { command: "freeText" });
      }
    },
  );

  /**
   * Command to reset the conversation thread.
   * 
   * This command clears the current conversation in the ChatGPT context.
   */
  const resetThread = vscode.commands.registerCommand(
    "chatgpt-copilot.clearConversation",
    async () => {
      provider?.sendMessage({ type: "clearConversation" });
    },
  );

  /**
   * Command to export the current conversation.
   * 
   * This command sends a message to the ChatGPT context to export the current
   * conversation.
   */
  const exportConversation = vscode.commands.registerCommand(
    "chatgpt-copilot.exportConversation",
    async () => {
      provider?.sendMessage({ type: "exportConversation" });
    },
  );

  /**
   * Command to clear the session tokens.
   * 
   * This command resets the session tokens and clears any stored user agent
   * and API key information.
   */
  const clearSession = vscode.commands.registerCommand(
    "chatgpt-copilot.clearSession",
    () => {
      context.globalState.update("chatgpt-session-token", null);
      context.globalState.update("chatgpt-clearance-token", null);
      context.globalState.update("chatgpt-user-agent", null);
      context.globalState.update("chatgpt-gpt3-apiKey", null);
      provider?.clearSession();
      provider?.sendMessage({ type: "clearConversation" });
    },
  );

  /**
   * Event listener for changes in the workspace configuration.
   * 
   * This method responds to configuration changes related to the ChatGPT
   * extension, updating the provider's settings accordingly. It checks
   * for changes in various configuration keys and updates the model,
   * notification settings, and other parameters as needed.
   * 
   * @param e - The configuration change event, containing information about
   *            which configuration keys were affected.
   */
  const configChanged = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("chatgpt.gpt3.modelSource")) {
      logger.info('modelSource value has changed');
    }

    if (e.affectsConfiguration("chatgpt.response.showNotification")) {
      provider.configurationManager.subscribeToResponse =
        vscode.workspace
          .getConfiguration("chatgpt")
          .get("response.showNotification") || false;
    }

    if (e.affectsConfiguration("chatgpt.response.autoScroll")) {
      provider.configurationManager.autoScroll = !!vscode.workspace
        .getConfiguration("chatgpt")
        .get("response.autoScroll");
    }

    if (e.affectsConfiguration("chatgpt.gpt3.model")) {
      provider.modelManager.model = vscode.workspace
        .getConfiguration("chatgpt")
        .get("gpt3.model");
    }

    if (e.affectsConfiguration("chatgpt.gpt3.customModel")) {
      if (provider.modelManager.model === "custom") {
        provider.modelManager.model = vscode.workspace
          .getConfiguration("chatgpt")
          .get("gpt3.customModel");
      }
    }

    if (
      e.affectsConfiguration("chatgpt.gpt3.apiBaseUrl") ||
      e.affectsConfiguration("chatgpt.gpt3.model") ||
      e.affectsConfiguration("chatgpt.gpt3.apiKey") ||
      e.affectsConfiguration("chatgpt.gpt3.customModel") ||
      e.affectsConfiguration("chatgpt.gpt3.organization") ||
      e.affectsConfiguration("chatgpt.gpt3.maxTokens") ||
      e.affectsConfiguration("chatgpt.gpt3.temperature") ||
      e.affectsConfiguration("chatgpt.systemPrompt") ||
      e.affectsConfiguration("chatgpt.gpt3.top_p")
    ) {
      provider.prepareConversation(true);
    }

    if (
      e.affectsConfiguration("chatgpt.promptPrefix") ||
      e.affectsConfiguration("chatgpt.gpt3.generateCode-enabled") ||
      e.affectsConfiguration("chatgpt.gpt3.model")
    ) {
      setContext();
    }

    if (e.affectsConfiguration("chatgpt.fileInclusionRegex") || e.affectsConfiguration("chatgpt.fileExclusionRegex")) {
      // TODO: Handle any specific actions needed when these configurations change
    }
  });

  /**
   * Command to execute an ad-hoc request to the ChatGPT API.
   * 
   * This command allows the user to prefix their code with a custom prompt
   * and send it to the ChatGPT API for processing.
   */
  const adhocCommand = vscode.commands.registerCommand(
    "chatgpt-copilot.adhoc",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        return;
      }

      const selection = editor.document.getText(editor.selection);
      let dismissed = false;
      if (selection) {
        await vscode.window
          .showInputBox({
            title: "Add prefix to your ad-hoc command",
            prompt:
              "Prefix your code with your custom prompt. i.e. Explain this",
            ignoreFocusOut: true,
            placeHolder: "Ask anything...",
            value: adhocCommandPrefix,
          })
          .then((value) => {
            if (!value) {
              dismissed = true;
              return;
            }

            adhocCommandPrefix = value.trim() || "";
            context.globalState.update(
              "chatgpt-adhoc-prompt",
              adhocCommandPrefix,
            );
          });

        if (!dismissed && adhocCommandPrefix?.length > 0) {
          provider?.sendApiRequest(adhocCommandPrefix, {
            command: "adhoc",
            code: selection,
          });
        }
      }
    },
  );

  /**
   * Command to generate code based on the selected text.
   * 
   * This command sends the selected code to the ChatGPT API for code generation.
   */
  const generateCodeCommand = vscode.commands.registerCommand(
    `chatgpt-copilot.generateCode`,
    () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        return;
      }

      const selection = editor.document.getText(editor.selection);
      if (selection) {
        provider?.sendApiRequest(selection, {
          command: "generateCode",
          language: editor.document.languageId,
        });
      }
    },
  );

  // Skip AdHoc - as it was registered earlier
  const registeredCommands = menuCommands
    .filter((command) => command !== "adhoc" && command !== "generateCode")
    .map((command) =>
      vscode.commands.registerCommand(`chatgpt-copilot.${command}`, () => {
        const prompt = vscode.workspace
          .getConfiguration("chatgpt")
          .get<string>(`promptPrefix.${command}`);
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
          return;
        }

        const selection = editor.document.getText(editor.selection);
        if (selection && prompt) {
          provider?.sendApiRequest(prompt, {
            command,
            code: selection,
            language: editor.document.languageId,
          });
        }
      }),
    );

  context.subscriptions.push(
    view,
    freeText,
    resetThread,
    exportConversation,
    clearSession,
    configChanged,
    adhocCommand,
    generateCodeCommand,
    ...registeredCommands,
  );

  /**
   * Sets the context for the commands based on the current configuration.
   * 
   * This function updates the command context for enabling or disabling
   * specific commands based on user settings.
   */
  const setContext = () => {
    menuCommands.forEach((command) => {
      if (command === "generateCode") {
        let generateCodeEnabled = !!vscode.workspace
          .getConfiguration("chatgpt")
          .get<boolean>("gpt3.generateCode-enabled");
        const modelName = vscode.workspace
          .getConfiguration("chatgpt")
          .get("gpt3.model") as string;
        generateCodeEnabled =
          generateCodeEnabled &&
          modelName.startsWith("code-");
        vscode.commands.executeCommand(
          "setContext",
          "generateCode-enabled",
          generateCodeEnabled,
        );
      } else {
        const enabled = !!vscode.workspace
          .getConfiguration("chatgpt.promptPrefix")
          .get<boolean>(`${command}-enabled`);
        vscode.commands.executeCommand(
          "setContext",
          `${command}-enabled`,
          enabled,
        );
      }
    });
  };

  setContext();
}

/**
 * Deactivates the extension, performing any necessary cleanup.
 * 
 * This function is called when the extension is deactivated, allowing
 * for cleanup of resources or subscriptions if necessary.
 */
export function deactivate() { }
