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

import * as path from 'path';
import * as vscode from 'vscode';

import AbortController from "abort-controller";
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createChatGptViewProvider } from "./factory";
import { Logger } from "./logger";

const logger = Logger.getInstance("ChatGPT Copilot");

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

export class ContextDecorationProvider implements vscode.FileDecorationProvider {
  private _explicitFiles: Map<string, boolean> = new Map<string, boolean>();
  private _onDidChange = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
  readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[]> = this._onDidChange.event;

  constructor(private context: vscode.ExtensionContext) {
    // Load saved files and folders from global state
    this._loadExplicitFilesFromState();
    this.context.subscriptions.push(vscode.window.registerFileDecorationProvider(this));
  }

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

    // Save the updated files/folders to global state
    this._saveExplicitFilesToState();
  }

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

  private _addFile(filePath: string) {
    if (!this._explicitFiles.has(filePath)) {
      this._explicitFiles.set(filePath, true);
    }
  }

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

  clearAllFiles() {
    this._explicitFiles.clear();
    this._onDidChange.fire(undefined); // Trigger event to refresh decorations
    this._saveExplicitFilesToState();  // Clear saved state
    vscode.window.showInformationMessage('Cleared all files and folders from ChatGPT context.');
  }

  // Load the saved files/folders from the global state
  private _loadExplicitFilesFromState() {
    const savedFiles = this.context.globalState.get<string[]>('chatgpt.explicitFiles', []);
    savedFiles.forEach((filePath) => {
      this._explicitFiles.set(filePath, true);
    });
  }

  // Save the current files/folders to the global state
  private _saveExplicitFilesToState() {
    const filePaths = Array.from(this._explicitFiles.keys());
    this.context.globalState.update('chatgpt.explicitFiles', filePaths);
  }

  dispose() {
    this._onDidChange.dispose();
  }
}


export async function activate(context: vscode.ExtensionContext) {
  const contextProvider = new ContextDecorationProvider(context);

  let adhocCommandPrefix: string =
    context.globalState.get("chatgpt-adhoc-prompt") || "";

  const logger = Logger.getInstance("ChatGPT Copilot");

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

  const showTypeHint = vscode.commands.registerCommand('chatgpt-copilot.showTypeHint', async () => {
    provider.showFiles();
  });

  context.subscriptions.push(view, showTypeHint);

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

  const resetThread = vscode.commands.registerCommand(
    "chatgpt-copilot.clearConversation",
    async () => {
      provider?.sendMessage({ type: "clearConversation" });
    },
  );

  const exportConversation = vscode.commands.registerCommand(
    "chatgpt-copilot.exportConversation",
    async () => {
      provider?.sendMessage({ type: "exportConversation" });
    },
  );

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

  const configChanged = vscode.workspace.onDidChangeConfiguration((e) => {
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

export function deactivate() { }
