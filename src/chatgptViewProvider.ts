// File: src/chatgpt-view-provider.ts

/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/naming-convention */
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
 * This module provides a view provider for the ChatGPT VS Code extension.
 * It manages the webview that interacts with the user, handling messages
 * and commands related to the chat functionality.
 * 
 * The `ChatGptViewProvider` class implements the `vscode.WebviewViewProvider` interface,
 * facilitating the initialization and configuration of the webview for user interaction.
 * It handles incoming messages from the webview, dispatches commands, and manages
 * chat history and conversation state.
 * 
 * Key Features:
 * - Initializes and configures the webview for user interaction.
 * - Handles incoming messages from the webview and dispatches commands.
 * - Manages chat history and conversation state.
 * - Provides methods for processing user input, including adding questions and editing code.
 * - Supports interaction with the OpenAI API for chat functionality.
 * 
 * Usage:
 * - The `resolveWebviewView` method sets up the webview and initializes event handling.
 * - Various command handlers are implemented to manage user interactions and update the UI.
 * - The `sendApiRequest` method sends prompts to the AI model and processes the responses.
 */


import { OpenAIChatLanguageModel, OpenAICompletionLanguageModel } from "@ai-sdk/openai/internal";
import { LanguageModelV1 } from "@ai-sdk/provider";
import * as fs from "fs";
import * as vscode from "vscode";
import { ChatHistoryManager } from "./chatHistoryManager";
import { CommandHandler } from "./commandHandler";
import { getConfig, onConfigurationChanged } from "./config/configuration";
import { ConfigurationManager } from "./configurationManager";
import { ContextManager } from "./contextManager";
import { ConversationManager } from './conversationManager';
import { CoreLogger } from "./coreLogger";
import { DocstringGenerator } from './docstringGenerator';
import { ErrorHandler } from "./errorHandler";
import { ChatModelFactory } from './llm_models/chatModelFactory';
import { IChatModel } from './llm_models/IChatModel';
import { ModelManager } from "./modelManager";
import { ResponseHandler } from "./responseHandler";
import { SessionManager } from './sessionManager';
import { Utility } from "./utility";
import { WebviewManager } from "./webviewManager";
import { WebviewMessageHandler } from "./webviewMessageHandler";

/**
 * Enum representing the different command types for the ChatGPT extension.
 */
export enum CommandType {
  AddFreeTextQuestion = "addFreeTextQuestion",
  EditCode = "editCode",
  OpenNew = "openNew",
  ClearConversation = "clearConversation",
  ClearBrowser = "clearBrowser",
  ClearGpt3 = "cleargpt3",
  Login = "login",
  OpenSettings = "openSettings",
  OpenSettingsPrompt = "openSettingsPrompt",
  ListConversations = "listConversations",
  ShowConversation = "showConversation",
  StopGenerating = "stopGenerating",
  GenerateDocstrings = "generateDocstrings"
}

/**
 * Interface defining the options required to create a ChatGptViewProvider.
 */
export interface ChatGptViewProviderOptions {
  context: vscode.ExtensionContext;
  logger: CoreLogger;
  webviewManager: WebviewManager;
  commandHandler: CommandHandler;
  modelManager: ModelManager;
  configurationManager: ConfigurationManager;
  chatHistoryManager: ChatHistoryManager;
}

/**
 * The `ChatGptViewProvider` class implements the `vscode.WebviewViewProvider` interface.
 * It manages the webview view for the ChatGPT extension, handling user interactions,
 * messages, and commands related to chat functionality.
 */
export class ChatGptViewProvider implements vscode.WebviewViewProvider {
  public webView?: vscode.WebviewView;
  public logger: CoreLogger;
  private context: vscode.ExtensionContext;
  public webviewManager: WebviewManager; // Responsible for handling webview initialization and interactions.
  public modelManager: ModelManager;
  public configurationManager: ConfigurationManager; // Responsible for managing and loading configuration values.
  public sessionManager: SessionManager;
  public conversationManager: ConversationManager;
  public chatHistoryManager: ChatHistoryManager;
  public contextManager: ContextManager;
  public messageHandler: WebviewMessageHandler;
  public responseHandler: ResponseHandler;
  public errorHandler: ErrorHandler;
  public commandHandler: CommandHandler; // CommandHandler: Responsible for managing command execution.

  public apiCompletion?: OpenAICompletionLanguageModel | LanguageModelV1;
  public apiChat?: OpenAIChatLanguageModel | LanguageModelV1;
  public docstringGenerator: DocstringGenerator;
  public conversationId?: string;
  public questionCounter: number = 0;
  public inProgress: boolean = false;
  public abortController?: AbortController;
  public currentMessageId: string = "";
  public response: string = "";
  public generatedDocstring: string = "";

  /**
   * Message to be rendered lazily if they haven't been rendered
   * in time before resolveWebviewView is called.
   */
  private leftOverMessage?: any;

  /**
   * Constructor for the `ChatGptViewProvider` class.
   * Initializes the view provider with the necessary options and sets up event handling.
   * 
   * @param options - The options required to initialize the view provider.
   */
  constructor(options: ChatGptViewProviderOptions) {
    const { context, logger, webviewManager, commandHandler, modelManager, configurationManager } = options;
    this.context = context;
    this.logger = logger;
    this.webviewManager = webviewManager;
    this.commandHandler = commandHandler;
    this.modelManager = modelManager;
    this.configurationManager = configurationManager;
    this.sessionManager = new SessionManager(this);
    this.conversationManager = new ConversationManager(this);
    this.chatHistoryManager = new ChatHistoryManager();
    this.contextManager = new ContextManager(this);
    this.messageHandler = new WebviewMessageHandler(logger, commandHandler);
    this.responseHandler = new ResponseHandler(this);
    this.errorHandler = new ErrorHandler(logger);
    this.docstringGenerator = new DocstringGenerator(options.logger, this);

    this.initializeConfiguration();
    this.logger.info("ChatGptViewProvider initialized");
  }

  /**
   * Initialize configuration settings and listeners.
   */
  private initializeConfiguration() {
    this.configurationManager.loadConfiguration();
    onConfigurationChanged(() => {
      this.configurationManager.loadConfiguration();
    });
  }

  /**
   * Retrieves the workspace configuration for the extension.
   * 
   * @returns The workspace configuration object for the "chatgpt" extension.
   */
  public getWorkspaceConfiguration() {
    return vscode.workspace.getConfiguration("chatgpt");
  }

  /**
     * Resolves the webview view with the provided context and sets up necessary event handling.
     * 
     * @param webviewView - The webview view that is being resolved.
     * @param _context - Context information related to the webview view.
     * @param _token - A cancellation token to signal if the operation is cancelled.
     */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this.logger.info("resolveWebviewView called");

    this.webView = webviewView;
    this.webviewManager.initializeWebView(webviewView, this.context.extensionUri, Utility.getRandomId());
    this.messageHandler.handleMessages(webviewView, this);
  }

  /**
   * Sends a message to the webview via the webview manager.
   * 
   * @param message - The message to be sent to the webview.
   */
  public sendMessage(message: any) {
    this.webviewManager.sendMessage(message);
  }

  /**
   * Opens a side-by-side comparison between the original file and the generated docstring.
   * 
   * @param originalFilePath - The path to the original file.
   * @param generatedDocstringPath - The path to the file containing the generated docstring.
   */
  public async showSideBySideComparison(originalFilePath: string, generatedDocstringPath: string) {
    // Check if the original file exists
    if (!fs.existsSync(originalFilePath)) {
      vscode.window.showErrorMessage(`Original file not found: ${originalFilePath}`);
      return;
    }

    // Check if the generated file exists
    if (!fs.existsSync(generatedDocstringPath)) {
      vscode.window.showErrorMessage(`Generated docstring file not found: ${generatedDocstringPath}`);
      return;
    }

    // Open side-by-side diff view in VS Code
    await vscode.commands.executeCommand(
      'vscode.diff',
      vscode.Uri.file(originalFilePath),
      vscode.Uri.file(generatedDocstringPath),
      'Generated Docstring vs Original Code'
    );
  }

  /**
   * Processes the provided question, appending contextual information from the current project files.
   * 
   * @param question - The original question to process.
   * @param code - Optional code block associated with the question.
   * @param language - The programming language of the code, if present.
   * @returns A Promise that resolves to the processed question string.
   */
  public async processQuestion(question: string, code?: string, language?: string) {
    this.logger.info("processQuestion called");

    // Format the question to send, keeping the context separate
    const formattedQuestion = code != null
      ? `${question}${language ? ` (The following code is in ${language} programming language)` : ""}: ${code}`
      : question;

    this.logger.info("returning question processed...");
    return formattedQuestion;
  }

  /**
   * Sends an API request to generate a response to the provided prompt.
   * 
   * @param prompt - The prompt to be sent to the API.
   * @param options - Additional options related to the API call, including command, code, etc.
   */
  public async sendApiRequest(
    prompt: string,
    options: {
      command: string;
      code?: string;
      previousAnswer?: string;
      language?: string;
    },
  ) {
    // Focus the webview if not already focused
    await this.commandHandler.executeCommand(CommandType.ShowConversation, {});

    if (this.inProgress) {
      return; // Prevent new requests if one is already in progress
    }

    this.inProgress = true;
    this.abortController = new AbortController();

    this.questionCounter++;
    this.logger.info("api-request-sent", {
      "chatgpt.command": options.command,
      "chatgpt.hasCode": String(!!options.code),
      "chatgpt.hasPreviousAnswer": String(!!options.previousAnswer),
    });

    try {
      if (!(await this.conversationManager.prepareConversation())) {
        return;
      }
    } catch (error) {
      this.logger.logError(error, "Failed to prepare conversation", true);
      return;
    }

    this.response = "";

    let additionalContext = "";
    try {
      additionalContext = await this.contextManager.retrieveContextForPrompt();
    } catch (error) {
      this.logger.logError(error, "Failed to retrieve context for prompt", true);
      return;
    }

    const formattedQuestion = await this.processQuestion(prompt, options.code, options.language);

    // If the ChatGPT view is not in focus/visible; focus on it to render Q&A
    try {
      if (this.webView == null) {
        vscode.commands.executeCommand("chatgpt-copilot.view.focus");
      } else {
        this.webView?.show?.(true);
      }
    } catch (error) {
      this.logger.logError(error, "Failed to focus or show the ChatGPT view", true);
    }

    this.logger.info("Preparing to create chat model...");

    const modelType = this.modelManager.model;
    const modelConfig = this.modelManager.modelConfig;

    this.logger.info(`Model Type: ${modelType}`);
    this.logger.info(`Model Config: ${JSON.stringify(modelConfig)}`);

    let chatModel: IChatModel;
    try {
      chatModel = await ChatModelFactory.createChatModel(this, modelConfig);
    } catch (error) {
      this.logger.logError(error, "Failed to create chat model", true);
      return;
    }

    this.logger.info('Chat model created successfully');

    this.sendMessage({
      type: "showInProgress",
      inProgress: this.inProgress,
      showStopButton: true,
    });
    this.currentMessageId = Utility.getRandomId();

    try {
      this.sendMessage({
        type: "addQuestion",
        value: prompt,
        code: options.code,
        autoScroll: this.configurationManager.autoScroll,
      });
      this.logger.info('handle chat response...');
      await this.responseHandler.handleChatResponse(chatModel, formattedQuestion, additionalContext, options); // Centralized response handling
    } catch (error: any) {
      this.logger.logError(error, "Error in handleChatResponse", true);
      this.handleApiError(error, formattedQuestion, options);
    } finally {
      this.inProgress = false;
      this.sendMessage({ type: "showInProgress", inProgress: this.inProgress });
    }
  }

  /**
   * Handles errors that occur during API requests, logging the error and
   * interacting with the user to provide feedback on the issue.
   * 
   * @param error - The error object that was thrown during the API request.
   * @param prompt - The original prompt that was being processed.
   * @param options - Options related to the API request that failed.
   */
  public handleApiError(error: any, prompt: string, options: any) {
    const errorId = Utility.getRandomId(); // Generate a unique error ID
    this.logger.error(`Error ID: ${errorId} - API request failed`, { error, prompt, options });


    // Check if the error is an AbortError
    if (error.name === 'AbortError') {
      vscode.window.showInformationMessage("Completion has been cancelled by the user.");
    } else {
      // Handle other types of errors
      const apiMessage = error?.response?.data?.error?.message || error?.toString?.() || error?.message || error?.name;
      vscode.window.showErrorMessage(`Something went wrong. Please try again. Error ID: ${errorId}`);
    }
  }

  /**
   * Updates the list of files in the webview with information about 
   * the available files in the current project.
   * 
   * @param files - An array of file objects containing path and line numbers.
   */
  public updateFilesList(files: { path: string; lines: number; }[]) {
    if (this.webView) {
      this.webView.webview.postMessage({ type: "updateFilesList", files });
    } else {
      this.leftOverMessage = { type: "updateFilesList", files };
    }
  }

  /**
   * Displays a list of files that match the inclusion and exclusion patterns 
   * specified in the configuration.
   * 
   * @returns A Promise that resolves to an array of matched files.
   */
  public async showFiles() {
    const inclusionRegex = getConfig<string>("fileInclusionRegex");
    const exclusionRegex = getConfig<string>("fileExclusionRegex");

    if (!inclusionRegex) {
      vscode.window.showErrorMessage("Inclusion regex is not set in the configuration.");
      return [];
    }

    this.logger.info("Inclusion Regex", { inclusionRegex });
    this.logger.info("Exclusion Regex", { exclusionRegex });

    try {
      const files = await this.contextManager.findMatchingFiles(inclusionRegex, exclusionRegex);
      this.logger.info("Matched Files", { files });

      const filesWithLineCount = files.map(file => ({
        path: file,
        lines: ContextManager.getLineCount(file)
      }));
      this.updateFilesList(filesWithLineCount);

      return files;  // Return matched files
    } catch (error) {
      let errorMessage: string;

      if (error instanceof Error) {
        errorMessage = `Error finding files: ${error.message}\n${error.stack}`;
      } else {
        // Fallback for unknown error types
        errorMessage = `Unknown error finding files: ${String(error)}`;
      }

      vscode.window.showErrorMessage(errorMessage);
      this.logger.logError(error, errorMessage);
      return [];
    }
  }

  /**
   * Retrieves the context of the current extension, which contains useful state information.
   * This function finds files that match the inclusion pattern and retrieves their content.
   * 
   * @returns The extension context associated with the provider.
   */
  public getContext() {
    return this.context;
  }

  public async getActiveEditorText(): Promise<string | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found.");
      return null;
    }
    return editor.document.getText();
  }
}
