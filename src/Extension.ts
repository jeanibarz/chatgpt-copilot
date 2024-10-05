// src/Extension.ts

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

import 'reflect-metadata';
import * as vscode from 'vscode';

import AbortController from "abort-controller";
import fetch, {
  Headers,
  Request,
  Response
} from 'node-fetch';
import { ConfigKeys, ExtensionConfigPrefix } from "./constants/ConfigKeys";
import { ChatGPTCommandType } from "./interfaces/enums/ChatGPTCommandType";
import { configureContainer, container } from "./inversify.config";
import TYPES from "./inversify.types";
import { CoreLogger } from "./logging/CoreLogger";
import { StateManager } from "./state/StateManager";
import { FilteredTreeDataProvider } from './tree/FilteredTreeDataProvider';
import { Utility } from "./Utility";
import { ChatGptViewProvider } from "./view/ChatGptViewProvider";

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

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

const logger = CoreLogger.getInstance();

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
  StateManager.initialize(context);
  const stateManager = StateManager.getInstance();

  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot = (workspaceFolders && workspaceFolders.length > 0)
    ? workspaceFolders[0].uri.fsPath : null;

  if (!workspaceRoot) {
    throw Error('No workspace root');
  }

  // Pass the context to the container configuration
  configureContainer(context, workspaceRoot);

  const logger = CoreLogger.getInstance();

  // Retrieve the adhoc command prefix from global state
  let adhocCommandPrefix = stateManager.getCommandStateManager().getAdhocCommandPrefix();

  // Instantiate the ChatGptViewProvider
  const provider = container.get<ChatGptViewProvider>(TYPES.ChatGptViewProvider);
  if (!provider) {
    throw Error("provider not instantiated ");
  }

  provider.commandHandler.registerAllCommands();
  await provider.configurationManager.loadConfiguration();
  provider.initializeConfiguration();

  // Register the webview provider
  const view = vscode.window.registerWebviewViewProvider(
    "chatgpt-copilot.view",
    provider,
    { webviewOptions: { retainContextWhenHidden: true } },
  );

  // Register commands related to file and folder context management
  registerContextCommands(context, provider.treeDataProvider);

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
        .getConfiguration(`${ExtensionConfigPrefix}.${ConfigKeys.PromptPrefix}`)
        .get<boolean>(`${command}-enabled`);
      stateManager.getCommandStateManager().setCommandEnabledState(command, enabled);
    });

    // Handle generateCode command separately
    const generateCodeEnabled = stateManager.getModelConfigStateManager().isGenerateCodeEnabled();
    stateManager.getCommandStateManager().setCommandEnabledState('generateCode', generateCodeEnabled);
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
  treeDataProvider: FilteredTreeDataProvider,
) {
  // Command to add a specific file or folder to the context
  const addFileOrFolderToContext = vscode.commands.registerCommand('chatgpt-copilot.addFileOrFolderToContext', async (target: vscode.Uri | vscode.TreeItem) => {
    let uri: vscode.Uri | undefined;

    // Check if the target is a URI directly (Project Explorer)
    if (target instanceof vscode.Uri) {
      uri = target;
    }
    // Check if the target is a TreeItem (Custom Tree View)
    else if (target instanceof vscode.TreeItem && target.resourceUri) {
      uri = target.resourceUri;
    }

    if (uri && uri.fsPath) {
      await treeDataProvider.explicitFilesManager.addResource(uri);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Added resource to ChatGPT-Copilot Context: ${uri.fsPath}`);
    } else {
      vscode.window.showErrorMessage("No file or folder selected.");
    }
  });

  // Command to remove a specific file or folder from the context
  const removeFileOrFolderFromContext = vscode.commands.registerCommand('chatgpt-copilot.removeFileOrFolderFromContext', async (target: vscode.Uri | vscode.TreeItem) => {
    let uri: vscode.Uri | undefined;

    // Check if the target is a URI directly (Project Explorer)
    if (target instanceof vscode.Uri) {
      uri = target;
    }
    // Check if the target is a TreeItem (Custom Tree View)
    else if (target instanceof vscode.TreeItem && target.resourceUri) {
      uri = target.resourceUri;
    }

    if (uri && uri.fsPath) {
      console.log(`Removing resource to E: ${uri.fsPath}`);
      await treeDataProvider.explicitFilesManager.removeResource(uri);
      // Refresh the tree or other views as needed
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Removed from ChatGPT-Copilot Context: ${uri.fsPath}`);
    } else {
      vscode.window.showErrorMessage("No file or folder selected.");
    }
  });

  // Command to clear all explicitly added files and folders
  const clearAllFilesFromContext = vscode.commands.registerCommand('chatgpt-copilot.clearAllFilesFromContext', async () => {
    treeDataProvider.explicitFilesManager.clearAllResources();
    treeDataProvider.refresh();
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
        .getConfiguration(`${ExtensionConfigPrefix}.${ConfigKeys.PromptPrefix}`)
        .get<string>(command);

      if (!prompt) {
        logger.error(`Prompt for command "${command}" not found.`);
        vscode.window.showErrorMessage(`Prompt for command "${command}" not found.`);
        return;
      }

      const editorData = getEditorAndSelection();
      if (!editorData) {
        return; // Early exit if editor or selection is invalid
      }
      const { editor, selection } = editorData;

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
  adhocCommandPrefix: string | null | undefined = '',
) {
  const stateManager = StateManager.getInstance();

  // Command to execute an ad-hoc request to the ChatGPT API
  const adhocCommand = vscode.commands.registerCommand(
    "chatgpt-copilot.adhoc",
    async () => {
      const editorData = getEditorAndSelection();
      if (!editorData) {
        return; // Early exit if editor or selection is invalid
      }
      const { editor, selection } = editorData;

      let dismissed = false;
      await vscode.window
        .showInputBox({
          title: "Add prefix to your ad-hoc command",
          prompt:
            "Prefix your code with your custom prompt. i.e. Explain this",
          ignoreFocusOut: true,
          placeHolder: "Ask anything...",
          value: adhocCommandPrefix ?? '',
        })
        .then((value) => {
          if (value === undefined) {
            dismissed = true;
            return;
          }

          adhocCommandPrefix = value.trim() || "";
          stateManager.getCommandStateManager().setAdhocCommandPrefix(adhocCommandPrefix);
        });

      if (!dismissed && adhocCommandPrefix && adhocCommandPrefix.length > 0) {
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
      const editorData = getEditorAndSelection();
      if (!editorData) {
        return; // Early exit if editor or selection is invalid
      }
      const { editor, selection } = editorData;

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
      await provider.sendMessage({ type: "clearConversation" });
    },
  );

  // Command to export the current conversation
  const exportConversation = vscode.commands.registerCommand(
    "chatgpt-copilot.exportConversation",
    async () => {
      await provider.sendMessage({ type: "exportConversation" });
    },
  );

  // Command to clear the session tokens
  const clearSession = vscode.commands.registerCommand(
    "chatgpt-copilot.clearSession",
    async () => {
      const stateManager = StateManager.getInstance();
      const apiCredentialsStateManager = stateManager.getApiCredentialsStateManager();
      const modelConfigStateManager = stateManager.getModelConfigStateManager();
      const sessionStateManager = stateManager.getSessionStateManager();

      await sessionStateManager.setSessionToken(null);
      await sessionStateManager.setClearanceToken(null);
      await sessionStateManager.setUserAgent(null);
      await apiCredentialsStateManager.setApiKey(null);
      await modelConfigStateManager.setOrganization(null);
      await modelConfigStateManager.setMaxTokens(null);
      await modelConfigStateManager.setTemperature(null);
      await modelConfigStateManager.setSystemPrompt(null);
      await modelConfigStateManager.setTopP(null);

      const provider = container.get<ChatGptViewProvider>(TYPES.ChatGptViewProvider);
      try {
        await Utility.stopGenerationRequest();
        provider.conversationManager.clearConversation();
        logger.info("Session cleared successfully");
      } catch (error) {
        logger.error("Failed to clear session", { error });
      }
      await provider.sendMessage({ type: "clearConversation" });
    },
  );

  // Command to generate docstrings
  const generateDocstringsCommand = vscode.commands.registerCommand('chatgpt-copilot.generateDocstrings', async () => {
    await provider.commandHandler.executeCommand(ChatGPTCommandType.GenerateDocstrings, {});
  });

  // Command to generate mermaid diagrams
  const generateMermaidDiagramsCommand = vscode.commands.registerCommand(
    'chatgpt-copilot.generateMermaidDiagrams',
    async (target: vscode.Uri, selectedFiles?: vscode.Uri[]) => {
      // If there are multiple files selected, use the array of selected files
      const targets = selectedFiles && selectedFiles.length > 0 ? selectedFiles : [target];

      // Execute the unified GenerateMermaidDiagramsCommand with the targets (single file or folder)
      await provider.commandHandler.executeCommand(ChatGPTCommandType.GenerateMermaidDiagrams, targets);
    }
  );

  context.subscriptions.push(
    resetThread,
    exportConversation,
    clearSession,
    generateDocstringsCommand,
    generateMermaidDiagramsCommand,
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
  const stateManager = StateManager.getInstance();

  const configChanged = (configKey: string) => e.affectsConfiguration(`${ExtensionConfigPrefix}.${configKey}`);

  // Logging changes to the modelSource
  if (configChanged(ConfigKeys.ModelSource)) {
    logger.info('Model source value has changed');
  }

  // Update provider configuration for notifications and auto-scroll
  if (configChanged(ConfigKeys.ShowNotification)) {
    provider.configurationManager.subscribeToResponse = stateManager.getUserPreferencesStateManager().getShowNotification();
  }

  if (configChanged(ConfigKeys.AutoScroll)) {
    provider.configurationManager.autoScroll = stateManager.getUserPreferencesStateManager().getAutoScrollSetting();
  }

  // Update model settings when model or custom model changes
  if (configChanged(ConfigKeys.Model)) {
    provider.modelManager.model = stateManager.getModelConfigStateManager().getGpt3Model();
  }

  if (configChanged(ConfigKeys.CustomModel) && provider.modelManager.model === "custom") {
    provider.modelManager.model = stateManager.getModelConfigStateManager().getGpt3Model();
  }

  // Handle multiple configurations related to the conversation manager
  const conversationRelatedKeys = [
    ConfigKeys.ApiBaseUrl,
    ConfigKeys.Model,
    ConfigKeys.ApiKey,
    ConfigKeys.CustomModel,
    ConfigKeys.Organization,
    ConfigKeys.MaxTokens,
    ConfigKeys.Temperature,
    ConfigKeys.SystemPrompt,
    ConfigKeys.TopP
  ];
  if (conversationRelatedKeys.some(configChanged)) {
    provider.conversationManager.prepareConversation(true);
  }

  // Update command context when related configurations change
  const contextRelatedKeys = [
    ConfigKeys.PromptPrefix,
    ConfigKeys.GenerateCodeEnabled,
    ConfigKeys.Model
  ];
  if (contextRelatedKeys.some(configChanged)) {
    setContext();
  }

  // Handle file inclusion/exclusion regex updates
  const fileRegexKeys = [
    ConfigKeys.FileInclusionRegex,
    ConfigKeys.FileExclusionRegex
  ];
  if (fileRegexKeys.some(configChanged)) {
    logger.info('File inclusion/exclusion regex has changed');
  }
}

function getEditorAndSelection(): { editor: vscode.TextEditor, selection: string; } | null {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    logger.error("No active editor found.");
    vscode.window.showErrorMessage("No active editor found.");
    return null;
  }

  const selection = editor.document.getText(editor.selection);
  if (!selection) {
    logger.error("No text selected.");
    vscode.window.showErrorMessage("No text selected.");
    return null;
  }

  return { editor, selection };
}


export function deactivate() { }
