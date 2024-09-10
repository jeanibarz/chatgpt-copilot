/**
 * This module handles the communication between the webview and the extension within a VS Code environment.
 * It manages incoming messages from the webview and allows for sending responses back to the webview.
 * 
 * The `WebviewMessageHandler` class is responsible for processing messages received from the webview,
 * executing the appropriate commands based on the message type, and sending responses back to the webview.
 * 
 * Key Features:
 * - Listens for messages from the webview and processes them accordingly.
 * - Supports sending messages and data back to the webview.
 * - Handles different types of messages, enabling extensible command processing.
 */

import * as vscode from "vscode";
import { ChatGptViewProvider, CommandType } from "./chatgptViewProvider";
import { CommandHandler } from "./commandHandler";
import { CoreLogger } from "./coreLogger";

/**
 * The `WebviewMessageHandler` class manages the message communication 
 * between the webview and the VS Code extension. It processes incoming 
 * messages and performs actions based on the message type.
 */
export class WebviewMessageHandler {
    private logger: CoreLogger; // Logger instance for logging events
    private commandHandler: CommandHandler; // Command handler for executing commands

    /**
     * Constructor for the `WebviewMessageHandler` class.
     * Initializes the message handler with a logger instance and command handler.
     * 
     * @param logger - An instance of `CoreLogger` for logging events.
     * @param commandHandler - An instance of `CommandHandler` for executing commands.
     */
    constructor(logger: CoreLogger, commandHandler: CommandHandler) {
        this.logger = logger;
        this.commandHandler = commandHandler;
    }

    /**
     * Sets up the message listener for the webview.
     * This method should be called to start listening for messages.
     * 
     * @param webviewView - The webview instance to listen for messages from.
     * @param chatGptViewProvider - The ChatGptViewProvider instance for additional context.
     */
    public handleMessages(webviewView: vscode.WebviewView, chatGptViewProvider: ChatGptViewProvider) {
        webviewView.webview.onDidReceiveMessage(async (data: {
            type: CommandType; // The type of command to execute
            value: any; // The value associated with the command
            language?: string; // Optional language information
        }) => {
            this.logger.info(`Message received of type: ${data.type}`);

            try {
                await this.commandHandler.executeCommand(data.type, data); // Execute the command
            } catch (error) {
                this.logger.logError(error, `Error handling command ${data.type}`); // Log any errors
            }
        });
    }
}