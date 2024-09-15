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

import * as vscode from 'vscode';

import AbortController from "abort-controller";
import { CoreLogger } from "./CoreLogger";
import { ContextDecorationProvider } from './decorators/ContextDecorationProvider';
import { ExplicitFilesManager } from './ExplicitFilesManager';
import { ChatGptViewProvider, CommandType } from "./view/ChatGptViewProvider";
import { createChatGptViewProvider } from "./view/ChatGptViewProviderFactory";
import { initialize } from './config/Configuration';

global.AbortController = AbortController;

// Define an enum for ChatGPT commands
enum ChatGptCommand {
  AddTests = "addTests",
  FindProblems = "findProblems",
  Optimize = "optimize",
  Explain = "explain",
  AddComments = "addComments",
  CompleteCode = "completeCode",
  GenerateCode = "generateCode",
  CustomPrompt1 = "customPrompt1",
  CustomPrompt2 = "customPrompt2",
  Adhoc = "adhoc",
  FreeText = "freeText",
}

// List of menu commands
const menuCommands: ChatGptCommand[] = [
  ChatGptCommand.AddTests,
  ChatGptCommand.FindProblems,
  ChatGptCommand.Optimize,
  ChatGptCommand.Explain,
  ChatGptCommand.AddComments,
  ChatGptCommand.CompleteCode,
  ChatGptCommand.CustomPrompt1,
  ChatGptCommand.CustomPrompt2,
];

// Special commands that require custom handling
const specialCommands: ChatGptCommand[] = [
  ChatGptCommand.GenerateCode,
  ChatGptCommand.Adhoc,
  ChatGptCommand.FreeText,
];

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
  // Instantiate the ExplicitFilesManager
  const explicitFilesManager = new ExplicitFilesManager(context);

  // Instantiate the ContextDecorationProvider
  const contextDecorationProvider = new ContextDecorationProvider(explicitFilesManager);

  // Instantiate the Configuration, which load prompts
  initialize(context);

  // Retrieve the adhoc command prefix from global state
  let adhocCommandPrefix: string =
    context.globalState.get("chatgpt-adhoc-prompt") || "";

  const logger = CoreLogger.getInstance();

  // Instantiate the ChatGptViewProvider
  const provider = createChatGptViewProvider(context, logger);

  // Register the webview provider
  const view = vscode.window.registerWebviewViewProvider(
    "chatgpt-copilot.view",
    provider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    },
  );

  // Register commands related to file and folder context management
  registerContextCommands(context, explicitFilesManager, contextDecorationProvider);

  // Register menu commands using the utility function
  registerCommands(context, menuCommands, provider);

  // Register special commands that require custom handling
  registerSpecialCommands(context, provider, adhocCommandPrefix);

  // Register utility commands
  registerUtilityCommands(context, provider);

  // Event listener for configuration changes
  const configChanged = vscode.workspace.onDidChangeConfiguration((e) => {
    handleConfigurationChange(e, provider, logger, setContext);
  });
  context.subscriptions.push(configChanged);

  // Set the initial context for commands
  setContext();

  /**
   * Sets the context for the commands based on the current configuration.
   * This function updates the command context for enabling or disabling
   * specific commands based on user settings.
   */
  function setContext() {
    menuCommands.forEach((command) => {
      const enabled = !!vscode.workspace
        .getConfiguration("chatgpt.promptPrefix")
        .get<boolean>(`${command}-enabled`);
      vscode.commands.executeCommand(
        "setContext",
        `${command}-enabled`,
        enabled,
      );
    });

    // Handle generateCode command separately
    let generateCodeEnabled = !!vscode.workspace
      .getConfiguration("chatgpt")
      .get<boolean>("gpt3.generateCode-enabled");
    const modelName = vscode.workspace
      .getConfiguration("chatgpt")
      .get("gpt3.model") as string;
    generateCodeEnabled =
      generateCodeEnabled && modelName.startsWith("code-");
    vscode.commands.executeCommand(
      "setContext",
      "generateCode-enabled",
      generateCodeEnabled,
    );
  }
}

/**
 * Registers context-related commands for adding, removing, and clearing files/folders.
 * 
 * @param context - The extension context.
 * @param explicitFilesManager - The manager for explicit files.
 * @param contextDecorationProvider - The provider for file decorations.
 */
function registerContextCommands(
  context: vscode.ExtensionContext,
  explicitFilesManager: ExplicitFilesManager,
  contextDecorationProvider: ContextDecorationProvider
) {
  // Command to add a specific file or folder to the context
  const addFileOrFolderToContext = vscode.commands.registerCommand('chatgpt-copilot.addFileOrFolderToContext', async (uri: vscode.Uri) => {
    if (uri && uri.fsPath) {
      explicitFilesManager.addResource(uri);
      contextDecorationProvider.refresh();
      vscode.window.showInformationMessage(`Added to ChatGPT context: ${uri.fsPath}`);
      explicitFilesManager.saveExplicitFilesToState();
    } else {
      vscode.window.showErrorMessage("No file or folder selected.");
    }
  });

  // Command to remove a specific file or folder from the context
  const removeFileOrFolderFromContext = vscode.commands.registerCommand('chatgpt-copilot.removeFileOrFolderFromContext', async (uri: vscode.Uri) => {
    if (uri && uri.fsPath) {
      explicitFilesManager.removeResource(uri);
      contextDecorationProvider.refresh();
      vscode.window.showInformationMessage(`Removed from ChatGPT context: ${uri.fsPath}`);
      explicitFilesManager.saveExplicitFilesToState();
    } else {
      vscode.window.showErrorMessage("No file or folder selected.");
    }
  });

  // Command to clear all explicitly added files and folders
  const clearAllFilesFromContext = vscode.commands.registerCommand('chatgpt-copilot.clearAllFilesFromContext', async () => {
    explicitFilesManager.clearAllResources();
    contextDecorationProvider.refresh();
  });

  context.subscriptions.push(
    addFileOrFolderToContext,
    removeFileOrFolderFromContext,
    clearAllFilesFromContext,
  );
}

/**
 * Registers standard menu commands using a utility function to reduce code duplication.
 * 
 * @param context - The extension context.
 * @param commands - The list of ChatGptCommand enums to register.
 * @param provider - The ChatGptViewProvider instance.
 */
function registerCommands(
  context: vscode.ExtensionContext,
  commands: ChatGptCommand[],
  provider: ChatGptViewProvider
): void {
  commands.forEach((command) => {
    const disposable = vscode.commands.registerCommand(`chatgpt-copilot.${command}`, async () => {
      const prompt = vscode.workspace
        .getConfiguration("chatgpt.promptPrefix")
        .get<string>(command);

      if (!prompt) {
        vscode.window.showErrorMessage(`Prompt for command "${command}" not found.`);
        return;
      }

      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const selection = editor.document.getText(editor.selection);
      if (!selection) {
        vscode.window.showErrorMessage("No text selected.");
        return;
      }

      provider.sendApiRequest(prompt, {
        command,
        code: selection,
        language: editor.document.languageId,
      });
    });
    context.subscriptions.push(disposable);
  });
}

/**
 * Registers special commands that require custom handling.
 * 
 * @param context - The extension context.
 * @param provider - The ChatGptViewProvider instance.
 * @param adhocCommandPrefix - The prefix for ad-hoc commands.
 */
function registerSpecialCommands(
  context: vscode.ExtensionContext,
  provider: ChatGptViewProvider,
  adhocCommandPrefix: string
) {
  // Command to execute an ad-hoc request to the ChatGPT API
  const adhocCommand = vscode.commands.registerCommand(
    "chatgpt-copilot.adhoc",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const selection = editor.document.getText(editor.selection);
      if (!selection) {
        vscode.window.showErrorMessage("No text selected.");
        return;
      }

      let dismissed = false;
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
          if (value === undefined) {
            dismissed = true;
            return;
          }

          adhocCommandPrefix = value.trim() || "";
          context.globalState.update(
            "chatgpt-adhoc-prompt",
            adhocCommandPrefix,
          );
        });

      if (!dismissed && adhocCommandPrefix.length > 0) {
        provider.sendApiRequest(adhocCommandPrefix, {
          command: "adhoc",
          code: selection,
        });
      }
    },
  );

  // Command to generate code based on the selected text
  const generateCodeCommand = vscode.commands.registerCommand(
    "chatgpt-copilot.generateCode",
    () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const selection = editor.document.getText(editor.selection);
      if (!selection) {
        vscode.window.showErrorMessage("No text selected.");
        return;
      }

      provider.sendApiRequest(selection, {
        command: "generateCode",
        language: editor.document.languageId,
      });
    },
  );

  // Command to send free text to the ChatGPT API
  const freeTextCommand = vscode.commands.registerCommand(
    "chatgpt-copilot.freeText",
    async () => {
      const value = await vscode.window.showInputBox({
        prompt: "Ask anything...",
      });

      if (value) {
        provider.sendApiRequest(value, { command: "freeText" });
      }
    },
  );

  context.subscriptions.push(adhocCommand, generateCodeCommand, freeTextCommand);
}

/**
 * Registers utility commands such as reset conversation, export conversation, etc.
 * 
 * @param context - The extension context.
 * @param provider - The ChatGptViewProvider instance.
 */
function registerUtilityCommands(
  context: vscode.ExtensionContext,
  provider: ChatGptViewProvider
) {
  // Command to reset the conversation thread
  const resetThread = vscode.commands.registerCommand(
    "chatgpt-copilot.clearConversation",
    async () => {
      provider.sendMessage({ type: "clearConversation" });
    },
  );

  // Command to export the current conversation
  const exportConversation = vscode.commands.registerCommand(
    "chatgpt-copilot.exportConversation",
    async () => {
      provider.sendMessage({ type: "exportConversation" });
    },
  );

  // Command to clear the session tokens
  const clearSession = vscode.commands.registerCommand(
    "chatgpt-copilot.clearSession",
    () => {
      context.globalState.update("chatgpt-session-token", null);
      context.globalState.update("chatgpt-clearance-token", null);
      context.globalState.update("chatgpt-user-agent", null);
      context.globalState.update("chatgpt-gpt3-apiKey", null);
      context.globalState.update("chatgpt-gpt3.organization", null);
      context.globalState.update("chatgpt-gpt3.maxTokens", null);
      context.globalState.update("chatgpt-gpt3.temperature", null);
      context.globalState.update("chatgpt.systemPrompt", null);
      context.globalState.update("chatgpt.gpt3.top_p", null);
      provider.sessionManager.clearSession();
      provider.sendMessage({ type: "clearConversation" });
    },
  );

  // // Command to show the files in the ChatGPT view
  // const showTypeHint = vscode.commands.registerCommand('chatgpt-copilot.showTypeHint', async () => {
  //   provider.showFiles();
  // });

  // Command to generate docstrings
  const generateDocstringsCommand = vscode.commands.registerCommand('chatgpt-copilot.generateDocstrings', async () => {
    await provider.commandHandler.executeCommand(CommandType.GenerateDocstrings, {});
  });

  context.subscriptions.push(
    resetThread,
    exportConversation,
    clearSession,
    showTypeHint,
    generateDocstringsCommand,
  );
}

/**
 * Handles configuration changes and updates the provider's settings accordingly.
 * 
 * @param e - The configuration change event.
 * @param provider - The ChatGptViewProvider instance.
 * @param logger - The logger instance.
 * @param setContext - The function to set command contexts.
 */
function handleConfigurationChange(
  e: vscode.ConfigurationChangeEvent,
  provider: ChatGptViewProvider,
  logger: CoreLogger,
  setContext: () => void
) {
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
    provider.conversationManager.prepareConversation(true);
  }

  if (
    e.affectsConfiguration("chatgpt.promptPrefix") ||
    e.affectsConfiguration("chatgpt.gpt3.generateCode-enabled") ||
    e.affectsConfiguration("chatgpt.gpt3.model")
  ) {
    setContext();
  }

  if (e.affectsConfiguration("chatgpt.fileInclusionRegex") || e.affectsConfiguration("chatgpt.fileExclusionRegex")) {
    // Handle specific actions when these configurations change
  }
}

export function deactivate() { }