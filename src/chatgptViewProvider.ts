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
 * Key Features:
 * - Initializes and configures the webview for user interaction.
 * - Handles incoming messages from the webview and dispatches commands.
 * - Manages chat history and conversation state.
 */

import { OpenAIChatLanguageModel, OpenAICompletionLanguageModel } from "@ai-sdk/openai/internal";
import { LanguageModelV1 } from "@ai-sdk/provider";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { ChatHistoryManager } from "./chatHistoryManager";
import { CommandHandler } from "./commandHandler";
import { getConfig, onConfigurationChanged } from "./config/configuration";
import { ConfigurationManager } from "./configurationManager";
import { CoreLogger } from "./coreLogger";
import { ErrorHandler } from "./errorHandler";
import { ChatModelFactory } from './llm_models/chatModelFactory';
import { IChatModel } from './llm_models/IChatModel';
import { ModelManager } from "./modelManager";
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
  StopGenerating = "stopGenerating"
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
  private webView?: vscode.WebviewView;
  public logger: CoreLogger;
  private context: vscode.ExtensionContext;
  public webviewManager: WebviewManager; // Responsible for handling webview initialization and interactions.
  public modelManager: ModelManager;
  public configurationManager: ConfigurationManager; // Responsible for managing and loading configuration values.
  public chatHistoryManager: ChatHistoryManager;
  public messageHandler: WebviewMessageHandler;
  public errorHandler: ErrorHandler;
  public commandHandler: CommandHandler; // CommandHandler: Responsible for managing command execution.

  public apiCompletion?: OpenAICompletionLanguageModel | LanguageModelV1;
  public apiChat?: OpenAIChatLanguageModel | LanguageModelV1;
  public conversationId?: string;
  public questionCounter: number = 0;
  public inProgress: boolean = false;
  public abortController?: AbortController;
  public currentMessageId: string = "";
  public response: string = "";

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
    this.chatHistoryManager = new ChatHistoryManager();
    this.messageHandler = new WebviewMessageHandler(logger, commandHandler);
    this.errorHandler = new ErrorHandler(logger);
    this.configurationManager.loadConfiguration();

    onConfigurationChanged(() => {
      this.configurationManager.loadConfiguration();
    });

    this.logger.info("ChatGptViewProvider initialized");
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
    this.webviewManager.initializeWebView(webviewView, this.context.extensionUri, this.getRandomId());
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
   * Handles the command to show the conversation.
   */
  public async handleShowConversation() {
    // Logic to show the conversation goes here.
    this.logger.info("Showing conversation...");
    // You can add additional implementation details here if necessary.
  }


  /**
   * Handles the command to add a free text question to the chat.
   * 
   * @param question - The question to be added.
   */
  public async handleAddFreeTextQuestion(question: string) {
    // Clear chat history if conversationHistoryEnabled is false
    if (!this.configurationManager.conversationHistoryEnabled) {
      this.chatHistoryManager.clearHistory();
    }
    this.chatHistoryManager.addMessage('user', question); // Add user message
    this.sendApiRequest(question, { command: "freeText" });
  }

  /**
   * Handles the command to edit code by inserting the provided code snippet 
   * into the active text editor.
   * 
   * @param code - The code to be inserted in the current text editor.
   */
  public async handleEditCode(code: string) {
    const escapedString = code.replace(/\$/g, "\\$");
    vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(escapedString));
    this.logger.info("Code inserted");
  }

  /**
   * Handles the command to open a new text document with the specified content and language.
   * 
   * @param content - The content to be placed in the new document.
   * @param language - The programming language of the new document.
   */
  public async handleOpenNew(content: string, language: string) {
    const document = await vscode.workspace.openTextDocument({ content, language });
    vscode.window.showTextDocument(document);
    this.logger.info(language === "markdown" ? "Markdown document opened" : "Code document opened");
  }

  /**
   * Clears the current conversation by resetting the conversation ID and chat history.
   */
  public async handleClearConversation() {
    this.conversationId = undefined;
    this.chatHistoryManager.clearHistory();
    this.logger.info("Conversation cleared");
  }

  /**
   * Handles the command to clear the browser state.
   */
  public async handleClearBrowser() {
    // TODO: implement this later ?
    this.logger.info("Browser cleared");
  }

  /**
   * Handles the command to clear GPT-3 related states.
   */
  public async handleClearGpt3() {
    this.apiCompletion = undefined;
    this.apiChat = undefined;
    this.logger.info("GPT-3 cleared");
  }

  /**
   * Handles the command to log in.
   */
  public async handleLogin() {
    const success = await this.prepareConversation();
    if (success) {
      this.sendMessage({ type: "loginSuccessful", showConversations: false });
      this.logger.info("Logged in successfully");
    }
  }

  /**
   * Handles the command to open settings.
   */
  public async handleOpenSettings() {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "@ext:jeanibarz.chatgpt-copilot chatgpt.",
    );
    this.logger.info("Settings opened");
  }

  /**
   * Handles the command to open settings prompt.
   */
  public async handleOpenSettingsPrompt() {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "@ext:jeanibarz.chatgpt-copilot promptPrefix",
    );
    this.logger.info("Prompt settings opened");
  }

  /**
   * Handles the command to list conversations.
   */
  public async handleListConversations() {
    // TODO: implement this later ?
    this.logger.info("List conversations attempted");
  }

  /**
   * Handles the command to stop generating a response.
   */
  public async handleStopGenerating(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort(); // Abort the ongoing request
    }
    this.inProgress = false;
    this.sendMessage({ type: "showInProgress", inProgress: this.inProgress });
    const responseInMarkdown = !this.modelManager.isCodexModel;
    this.sendMessage({
      type: "addResponse",
      value: this.response,
      done: true,
      id: this.currentMessageId,
      autoScroll: this.configurationManager.autoScroll,
      responseInMarkdown,
    });
    this.logger.info("Stopped generating");
  }

  /**
   * Clears the current session by resetting relevant states.
   */
  public clearSession(): void {
    this.handleStopGenerating();
    this.apiChat = undefined;
    this.apiCompletion = undefined;
    this.conversationId = undefined;
    this.logger.info("Session cleared");
  }

  /**
   * Prepares the conversation context and initializes the appropriate AI model based on current configurations.
   * 
   * @param modelChanged - A flag indicating whether the model has changed.
   * @returns A Promise which resolves to a boolean indicating success or failure.
   */
  public async prepareConversation(modelChanged = false): Promise<boolean> {
    this.logger.info("Preparing conversation", { modelChanged });

    try {
      this.conversationId = this.conversationId || this.getRandomId();

      if (await this.modelManager.prepareModelForConversation(modelChanged, this.logger, this)) {
        this.sendMessage({ type: "loginSuccessful" });
        this.logger.info("Conversation prepared successfully");
        return true;
      } else {
        return false;
      }
    } catch (error) {
      this.logger.error("Failed to prepare conversation", { error });
      return false; // Return false to indicate failure
    }
  }

  /**
   * Retrieves additional context from the codebase to be included in the prompt.
   * This function finds files that match the inclusion pattern and retrieves their content.
   * 
   * @returns A Promise that resolves to a string containing the formatted content.
   */
  public async retrieveContextForPrompt(): Promise<string> {
    try {
      const inclusionRegex = getConfig<string>("fileInclusionRegex");
      const exclusionRegex = getConfig<string>("fileExclusionRegex");

      if (!inclusionRegex) {
        this.logger.info("Inclusion regex is not set in the configuration.");
        return "";  // Return an empty string if the regex is not set
      }

      // Find matching files
      this.logger.info("Finding matching files");
      const files = await this.findMatchingFiles(inclusionRegex, exclusionRegex);

      // Get the content of the matched files
      this.logger.info("Retrieving file content");
      const contextContent = await this.getFilesContent(files);

      // Generate context for prompt
      const formattedContext = this.generateFormattedContext(contextContent);

      return formattedContext;
    } catch (error) {
      this.logger.logError(error, "retrieveContextForPrompt");
      throw error; // Rethrow the error if necessary
    }
  }

  /**
   * Generates a formatted context string from the content of files.
   * The context is structured with a title and section headers for each file's content.
   * 
   * @param fileContents - A string containing the content of files, 
   *                      where each file's content is separated by double new lines.
   * @returns A string that represents the formatted context, ready for use in a prompt.
   */
  private generateFormattedContext(fileContents: string): string {
    // Split by double new lines to handle separate file contents
    const contentSections = fileContents.split('\n\n');

    // Prepend a title for the context
    const contextTitle = "### Context from Project Files:\n\n";

    // Format each section with index for better context understanding
    const formattedContents = contentSections.map((content, idx) => {
      return `#### File ${idx + 1}:\n${content}`;
    }).join('\n\n'); // Join the formatted contents with double new lines

    return contextTitle + formattedContents; // Combine title and contents
  }

  /**
   * Processes the provided question, appending contextual information from the current project files.
   * 
   * @param question - The original question to process.
   * @param code - Optional code block associated with the question.
   * @param language - The programming language of the code, if present.
   * @returns A Promise that resolves to the processed question string.
   */
  private async processQuestion(question: string, code?: string, language?: string) {
    this.logger.info("processQuestion called");

    // Format the question to send, keeping the context separate
    const formattedQuestion = code != null
      ? `${question}${language ? ` (The following code is in ${language} programming language)` : ""}: ${code}`
      : question;

    this.logger.info("returning question processed...");
    return formattedQuestion;


    // if (code != null) {
    //   // Add prompt prefix to the code if there was a code block selected
    //   question = `${question}${language
    //     ? ` (The following code is in ${language} programming language)`
    //     : ""
    //     }: ${code}`;
    // }
    // return question + "\r\n";
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
      if (!(await this.prepareConversation())) {
        return;
      }
    } catch (error) {
      this.logger.logError(error, "Failed to prepare conversation", true);
      return;
    }

    this.response = "";

    let additionalContext = "";
    try {
      additionalContext = await this.retrieveContextForPrompt();
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
    this.currentMessageId = this.getRandomId();

    try {
      this.sendMessage({
        type: "addQuestion",
        value: prompt,
        code: options.code,
        autoScroll: this.configurationManager.autoScroll,
      });
      this.logger.info('handle chat response...');
      await this.handleChatResponse(chatModel, formattedQuestion, additionalContext, options); // Centralized response handling
    } catch (error: any) {
      this.logger.logError(error, "Error in handleChatResponse", true);
      this.handleApiError(error, formattedQuestion, options);
    } finally {
      this.inProgress = false;
      this.sendMessage({ type: "showInProgress", inProgress: this.inProgress });
    }
  }

  /**
   * Handles the chat response by sending the message to the model and updating the response.
   * 
   * @param model - The chat model to send the message to.
   * @param prompt - The prompt to send.
   * @param additionalContext - Additional context for the prompt.
   * @param options - Options related to the API call.
   */
  private async handleChatResponse(
    model: IChatModel,
    prompt: string,
    additionalContext: string,
    options: { command: string; previousAnswer?: string; }
  ) {
    const responseInMarkdown = !this.modelManager.isCodexModel;
    const updateResponse = (message: string) => {
      this.response += message;
      this.sendResponseUpdate();
    };

    try {
      await model.sendMessage(prompt, additionalContext, updateResponse);
      await this.finalizeResponse(options);
    } catch (error) {
      this.handleApiError(error, prompt, options);
    }
  }

  /**
   * Finalizes the response after processing and updates the chat history.
   * 
   * @param options - Options related to the API call.
   */
  private async finalizeResponse(options: { command: string; previousAnswer?: string; }) {
    if (options.previousAnswer != null) {
      this.response = options.previousAnswer + this.response; // Combine with previous answer
    }

    this.chatHistoryManager.addMessage('assistant', this.response); // Add assistant response

    if (this.isResponseIncomplete()) {
      await this.promptToContinue(options);
    }

    this.sendResponseUpdate(true); // Send final response indicating completion
  }

  /**
   * Sends a response update to the webview.
   * 
   * @param done - Indicates if the response is complete.
   */
  private sendResponseUpdate(done: boolean = false) {
    this.sendMessage({
      type: "addResponse",
      value: this.response,
      done,
      id: this.currentMessageId,
      autoScroll: this.configurationManager.autoScroll,
      responseInMarkdown: !this.modelManager.isCodexModel,
    });
  }

  /**
   * Checks if the response is incomplete based on markdown formatting.
   * 
   * @returns True if the response is incomplete; otherwise, false.
   */
  private isResponseIncomplete(): boolean {
    return this.response.split("```").length % 2 === 0;
  }

  /**
   * Prompts the user to continue if the response is incomplete.
   * 
   * @param options - Options related to the API call.
   */
  private async promptToContinue(options: { command: string; }) {
    const choice = await vscode.window.showInformationMessage(
      "It looks like the response was incomplete. Would you like to continue?",
      "Continue",
      "Cancel"
    );

    if (choice === "Continue") {
      await this.sendApiRequest("Continue", {
        command: options.command,
        code: undefined,
        previousAnswer: this.response,
      });
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
  private handleApiError(error: any, prompt: string, options: any) {
    const errorId = this.getRandomId(); // Generate a unique error ID
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
   * Finds files in the explicitly added files/folders that match the inclusion pattern and do not match the exclusion pattern.
   * 
   * @param inclusionPattern - Regex pattern to include files.
   * @param exclusionPattern - Optional regex pattern to exclude files.
   * @returns A Promise that resolves to an array of matching file paths.
   */
  private async findMatchingFiles(inclusionPattern: string, exclusionPattern?: string): Promise<string[]> {
    try {
      // Retrieve the explicitly added files/folders from global state
      const explicitFiles = this.context.globalState.get<string[]>('chatgpt.explicitFiles', []);
      this.logger.info("Explicit files and folders", { explicitFiles });

      if (explicitFiles.length === 0) {
        this.logger.info('No files or folders are explicitly added to the ChatGPT context.');
        return [];
      }

      this.logger.info("Finding matching files with inclusion pattern", { inclusionPattern, exclusionPattern });

      const inclusionRegex = new RegExp(inclusionPattern);
      const exclusionRegex = exclusionPattern ? new RegExp(exclusionPattern) : null;

      // Helper function to recursively collect all files from a folder
      const walk = (dir: string, fileList: string[] = []): string[] => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath, fileList);
          } else {
            fileList.push(fullPath);
          }
        });
        return fileList;
      };

      let allFiles: string[] = [];

      // Go through each explicitly added file/folder
      for (const filePath of explicitFiles) {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          // If it's a directory, add all the files within the folder
          allFiles = allFiles.concat(walk(filePath));
        } else {
          // If it's a file, just add it to the list
          allFiles.push(filePath);
        }
      }

      // Filter files based on the inclusion and exclusion patterns
      const matchedFiles = allFiles.filter(file => {
        const isFileIncluded = inclusionRegex.test(file);
        const isFileExcluded = exclusionRegex ? exclusionRegex.test(file) : false;
        return isFileIncluded && !isFileExcluded;
      });

      this.logger.info("Matched files", { matchedFiles });
      return matchedFiles;
    } catch (error) {
      this.logger.error("Error while finding matching files", { error });
      throw error;
    }
  }

  /**
   * Gets a random ID for use in message identifiers or other unique purposes.
   * 
   * @returns A randomly generated string ID.
   */
  private getRandomId(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
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
      const files = await this.findMatchingFiles(inclusionRegex, exclusionRegex);
      this.logger.info("Matched Files", { files });

      const filesWithLineCount = files.map(file => ({
        path: file,
        lines: getLineCount(file)
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

  /**
   * Retrieves the content of specified files and formats them for inclusion in a prompt to the AI model.
   * Each file's content is prefixed with its relative path.
   * 
   * @param files - An array of file paths to retrieve content from.
   * @returns A Promise that resolves to a string containing the formatted content of the files.
   */
  private async getFilesContent(files: string[]): Promise<string> {
    const fileContents: string[] = [];

    for (const file of files) {
      const relativePath = path.relative("/home/jean/git/chatgpt-copilot", file); // Adjust the root path accordingly
      const content = fs.readFileSync(file, 'utf-8');
      fileContents.push(`// -----\n// File: ${relativePath}\n// Content below: ${content}\n-----`);
    }

    return fileContents.join('\n\n'); // Join all file contents with double line breaks
  };
}

/**
 * Counts the number of lines in a specified file.
 * 
 * @param filePath - The path of the file to count lines in.
 * @returns The number of lines in the file.
 */
export function getLineCount(filePath: string): number {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return fileContent.split('\n').length;
}
