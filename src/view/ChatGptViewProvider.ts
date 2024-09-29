// src/view/ChatGptViewProvider.ts

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
import { inject, injectable } from "inversify";
import * as vscode from "vscode";
import { onConfigurationChanged } from "../config/Configuration";
import { CommandHandler, ResponseHandler, SessionManager } from "../controllers";
import { ConversationManager } from '../ConversationManager';
import { DocstringGenerator } from '../DocstringGenerator';
import { ErrorHandler } from "../errors/ErrorHandler";
import { ApiRequestOptions, ChatGPTCommandType, IChatGPTMessage, IChatModel } from "../interfaces";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { MermaidDiagramGenerator } from "../MermaidDiagramGenerator";
import { CreateChatModelRequest } from "../requests/CreateChatModelRequest";
import { HandleApiErrorRequest } from "../requests/HandleApiErrorRequest";
import { SendMessageRequest } from "../requests/SendMessageRequest";
import { ShowSideBySideComparisonRequest } from "../requests/ShowSideBySideComparisonRequest";
import { ChatHistoryManager, ConfigurationManager, ContextManager, FileManager, ModelManager } from "../services";
import { MediatorService } from "../services/MediatorService";
import { FilteredTreeDataProvider, TreeRenderer } from "../tree";
import { Utility } from "../Utility";
import { WebviewManager } from "./WebviewManager";
import { WebviewMessageHandler } from "./WebviewMessageHandler";

/**
 * The `ChatGptViewProvider` class implements the `vscode.WebviewViewProvider` interface.
 * It manages the webview view for the ChatGPT extension, handling user interactions,
 * messages, and commands related to chat functionality.
 */
@injectable()
export class ChatGptViewProvider implements vscode.WebviewViewProvider {
  public webView?: vscode.WebviewView;
  public logger: CoreLogger;
  private context: vscode.ExtensionContext;
  private mediatorService: MediatorService;
  public webviewManager: WebviewManager;
  public modelManager: ModelManager;
  public treeDataProvider: FilteredTreeDataProvider;
  public treeRenderer: TreeRenderer;
  public configurationManager: ConfigurationManager;
  public sessionManager: SessionManager;
  public conversationManager: ConversationManager;
  public chatHistoryManager: ChatHistoryManager;
  public fileManager: FileManager;
  public contextManager: ContextManager;
  public messageHandler: WebviewMessageHandler;
  public responseHandler: ResponseHandler;
  public errorHandler: ErrorHandler;
  public commandHandler: CommandHandler;
  public docstringGenerator: DocstringGenerator;
  public mermaidDiagramGenerator: MermaidDiagramGenerator;

  public apiCompletion?: OpenAICompletionLanguageModel | LanguageModelV1;
  public apiChat?: OpenAIChatLanguageModel | LanguageModelV1;
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
  private leftOverMessage?: IChatGPTMessage;

  /**
   * Constructor for the `ChatGptViewProvider` class.
   * Initializes the view provider with the necessary dependencies and sets up event handling.
   * 
   * @param logger - The logger instance for logging activities.
   * @param mediatorService - The service to mediate interactions between components.
   * @param webviewManager - The manager responsible for handling webview interactions.
   * @param commandHandler - The handler for executing commands.
   * @param modelManager - The manager for handling models.
   * @param configurationManager - The manager for configuration settings.
   * @param treeDataProvider - The provider for tree data representation.
   * @param treeRenderer - The renderer for displaying tree data.
   * @param chatHistoryManager - The manager for handling chat history.
   * @param fileManager - The manager for file interactions.
   * @param contextManager - The manager for handling context-related operations.
   * @param messageHandler - The handler for processing messages from the webview.
   * @param responseHandler - The handler for processing responses from the API.
   * @param errorHandler - The handler for managing errors.
   * @param docstringGenerator - The generator for creating docstrings.
   * @param mermaidDiagramGenerator - The generator for creating Mermaid diagrams.
   * @param extensionContext - The context of the extension.
   * @param sessionManager - The manager for handling session-related operations.
   * @param conversationManager - The manager for handling conversations.
   */
  constructor(
    @inject(TYPES.CoreLogger) logger: CoreLogger,
    @inject(TYPES.MediatorService) mediatorService: MediatorService,
    @inject(TYPES.WebviewManager) webviewManager: WebviewManager,
    @inject(TYPES.CommandHandler) commandHandler: CommandHandler,
    @inject(TYPES.ModelManager) modelManager: ModelManager,
    @inject(TYPES.ConfigurationManager) configurationManager: ConfigurationManager,
    @inject(TYPES.FilteredTreeDataProvider) treeDataProvider: FilteredTreeDataProvider,
    @inject(TYPES.TreeRenderer) treeRenderer: TreeRenderer,
    @inject(TYPES.ChatHistoryManager) chatHistoryManager: ChatHistoryManager,
    @inject(TYPES.FileManager) fileManager: FileManager,
    @inject(TYPES.ContextManager) contextManager: ContextManager,
    @inject(TYPES.WebviewMessageHandler) messageHandler: WebviewMessageHandler,
    @inject(TYPES.ResponseHandler) responseHandler: ResponseHandler,
    @inject(TYPES.ErrorHandler) errorHandler: ErrorHandler,
    @inject(TYPES.DocstringGenerator) docstringGenerator: DocstringGenerator,
    @inject(TYPES.MermaidDiagramGenerator) mermaidDiagramGenerator: MermaidDiagramGenerator,
    @inject(TYPES.ExtensionContext) extensionContext: vscode.ExtensionContext,
    @inject(TYPES.SessionManager) sessionManager: SessionManager,
    @inject(TYPES.ConversationManager) conversationManager: ConversationManager,
  ) {
    this.context = extensionContext;
    this.logger = logger;
    this.mediatorService = mediatorService;
    this.webviewManager = webviewManager;
    this.commandHandler = commandHandler;
    this.modelManager = modelManager;
    this.configurationManager = configurationManager;
    this.treeRenderer = treeRenderer;
    this.treeDataProvider = treeDataProvider;
    this.chatHistoryManager = chatHistoryManager;
    this.fileManager = fileManager;
    this.contextManager = contextManager;
    this.messageHandler = messageHandler;
    this.responseHandler = responseHandler;
    this.errorHandler = errorHandler;
    this.docstringGenerator = docstringGenerator;
    this.mermaidDiagramGenerator = mermaidDiagramGenerator;
    this.sessionManager = sessionManager;
    this.conversationManager = conversationManager;

    this.responseHandler.setProvider(this);
    this.commandHandler.setProvider(this);
    this.docstringGenerator.setProvider(this);
    this.mermaidDiagramGenerator.setProvider(this);
    this.sessionManager.setProvider(this);
    this.conversationManager.setProvider(this);

    this.initializeConfiguration();
    this.logger.info("ChatGptViewProvider initialized");
  }

  /**
   * Initialize configuration settings and listeners.
   */
  public initializeConfiguration() {
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

    // Add this to handle leftOverMessage
    if (this.leftOverMessage) {
      this.sendMessage(this.leftOverMessage);
      this.leftOverMessage = undefined;
    }
  }

  /**
   * Sends a message to the webview via the webview manager.
   * 
   * @param message - The message to be sent to the webview.
   */
  public sendMessage(message: IChatGPTMessage) {
    this.mediatorService.send(new SendMessageRequest(message));
  }

  /**
   * Opens a side-by-side comparison between the original file and the generated docstring.
   * 
   * @param originalFilePath - The path to the original file.
   * @param generatedDocstringPath - The path to the file containing the generated docstring.
   */
  public async showSideBySideComparison(originalFilePath: string, generatedDocstringPath: string) {
    await this.mediatorService.send(new ShowSideBySideComparisonRequest(originalFilePath, generatedDocstringPath));
  }

  /**
   * Processes the provided question, appending contextual information from the current project files.
   * 
   * @param question - The original question to process.
   * @param code - Optional code block associated with the question.
   * @param language - The programming language of the code, if present.
   * @returns A Promise that resolves to the processed question string.
   */
  public processQuestion(question: string, code?: string, language?: string) {
    this.logger.info("processQuestion called");

    // Format the question to send, keeping the context separate
    const formattedQuestion = code != null
      ? `${question}${language ? ` (The following code is in ${language} programming language)` : ""}: ${code}`
      : question;

    this.logger.info("returning question processed...");
    return formattedQuestion;
  }

  /**
   * Handles errors that occur during API requests, logging the error and
   * interacting with the user to provide feedback on the issue.
   * 
   * @param error - The error object that was thrown during the API request.
   * @param prompt - The original prompt that was being processed.
   * @param options - Options related to the API request that failed.
   */
  public async handleApiError(error: any, options: any,) {
    await this.mediatorService.send(
      new HandleApiErrorRequest(error, options, this.sendMessage.bind(this))
    );
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

  /**
   * Retrieves the text from the currently active editor.
   * 
   * @returns A Promise that resolves to the text content of the active editor, or null if no editor is active.
   */
  public async getActiveEditorText(): Promise<string | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found.");
      return null;
    }
    return editor.document.getText();
  }

  /**
   * Sends an API request to generate a response to the provided prompt.
   *
   * @param prompt - The prompt to be sent to the API.
   * @param options - Additional options related to the API call, including command, code, etc.
   */
  public async sendApiRequest(
    prompt: string,
    options: ApiRequestOptions,
  ) {
    if (!(await this.canProceedWithRequest())) {
      return;
    }

    this.initializeRequestState(options);

    if (!(await this.checkAndPrepareConversation())) {
      return;
    }

    const additionalContext = "";
    // const additionalContext = await this.retrieveAdditionalContext();
    // if (additionalContext === null) {
    //   return;
    // }

    const formattedQuestion = this.processQuestion(prompt, options.code, options.language);

    await this.focusWebview();

    const chatModel = await this.createChatModel();
    if (chatModel === null) {
      return;
    }

    this.sendInProgressMessage();

    try {
      this.addQuestionToWebview(prompt, options.code);
      await this.responseHandler.handleChatResponse(chatModel, formattedQuestion, additionalContext, options);
    } catch (error) {
      this.logger.logError(error, "Error in handleChatResponse", true);
      this.handleApiError(error, options);
    } finally {
      this.finalizeRequest();
    }
  }

  /**
   * Checks if a request can proceed by ensuring no other request is in progress.
   * If another request is in progress, it notifies the user.
   *
   * @returns A boolean indicating whether the request can proceed.
   */
  private async canProceedWithRequest(): Promise<boolean> {
    await this.commandHandler.executeCommand(ChatGPTCommandType.ShowConversation, {});

    if (this.inProgress) {
      vscode.window.showInformationMessage("Another request is already in progress. Please wait.");
      return false;
    }
    return true;
  }

  /**
   * Initializes the state for a new API request, including setting the in-progress flag,
   * creating a new abort controller, incrementing the question counter, and logging the request.
   *
   * @param options - The options related to the API request.
   */
  private initializeRequestState(options: ApiRequestOptions) {
    this.inProgress = true;
    this.abortController = new AbortController();
    this.questionCounter++;
    this.logger.info("api-request-sent", {
      "chatgpt.command": options.command,
      "chatgpt.hasCode": String(!!options.code),
      "chatgpt.hasPreviousAnswer": String(!!options.previousAnswer),
    });
  }

  /**
   * Checks and prepares the conversation by invoking the conversation manager.
   *
   * @returns A boolean indicating whether the conversation is prepared successfully.
   */
  private async checkAndPrepareConversation(): Promise<boolean> {
    try {
      if (!(await this.conversationManager.prepareConversation())) {
        return false;
      }
      return true;
    } catch (error) {
      this.logger.logError(error, "Failed to prepare conversation", true);
      return false;
    }
  }

  /**
   * Focuses the webview to ensure it is visible to the user.
   */
  private async focusWebview() {
    try {
      if (this.webView == null) {
        await vscode.commands.executeCommand("chatgpt-copilot.view.focus");
      } else {
        this.webView?.show?.(true);
      }
    } catch (error) {
      this.logger.logError(error, "Failed to focus or show the ChatGPT view", true);
    }
  }

  /**
   * Creates the chat model using the model manager and chat model factory.
   *
   * @returns The chat model instance, or null if an error occurs.
   */
  private async createChatModel(): Promise<IChatModel | null> {
    this.logger.info("Requesting chat model creation...");

    try {
      const chatModel = await this.mediatorService.send<CreateChatModelRequest, IChatModel | null>(new CreateChatModelRequest(this)); // Pass the provider here
      this.logger.info('Chat model created successfully');
      return chatModel;
    } catch (error) {
      this.logger.logError(error, "Failed to create chat model", true);
      return null;
    }
  }

  /**
   * Sends a message to the webview to indicate that a request is in progress.
   */
  private sendInProgressMessage() {
    this.sendMessage({
      type: "showInProgress",
      inProgress: this.inProgress,
      showStopButton: true,
    });
    this.currentMessageId = Utility.getRandomId();
  }

  /**
   * Adds the user's question to the webview for display.
   *
   * @param prompt - The user's prompt.
   * @param code - Optional code associated with the prompt.
   */
  public addQuestionToWebview(prompt: string, code?: string) {
    this.sendMessage({
      type: "addQuestion",
      value: prompt,
      code: code,
      autoScroll: this.configurationManager.autoScroll,
    });
  }

  /**
   * Finalizes the request by resetting the in-progress flag and updating the webview.
   */
  private finalizeRequest() {
    this.inProgress = false;
    this.sendMessage({ type: "showInProgress", inProgress: this.inProgress });
  }
}