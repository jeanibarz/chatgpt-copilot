// src/view/WebviewMessageHandler.ts

import { inject, injectable } from "inversify";
import * as vscode from "vscode";
import { CommandHandler } from "../controllers";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";

/**
 * The `WebviewMessageHandler` class manages the message communication 
 * between the webview and the VS Code extension. It processes incoming 
 * messages and performs actions based on the message type.
 */
@injectable()
export class WebviewMessageHandler {
    private logger: CoreLogger = CoreLogger.getInstance();

    /**
     * Constructor for the `WebviewMessageHandler` class.
     * Initializes the message handler with a logger instance and command handler.
     * 
     * @param logger - An instance of `CoreLogger` for logging events.
     * @param commandHandler - An instance of `CommandHandler` for executing commands.
     */
    constructor(
        @inject(TYPES.CommandHandler) private commandHandler: CommandHandler
    ) {
        this.logger.info("WebviewMessageHandler initialized");
    }

    /**
     * Sets up the message listener for the webview.
     * This method should be called to start listening for messages.
     * 
     * @param webviewView - The webview instance to listen for messages from.
     */
    public handleMessages(webviewView: vscode.WebviewView): void {
        this.logger.info("Setting up message listener for webview");
        webviewView.webview.onDidReceiveMessage(async (data: {
            type: ChatGPTCommandType; // The type of command to execute
            value: any; // The value associated with the command
            language?: string; // Optional language information
        }) => {
            this.logger.info(`Received message of type: ${data.type}`, { messageData: JSON.stringify(data) });

            try {
                this.logger.debug(`Executing command: ${data.type}`);
                // Execute the command based on the type received from the webview
                await this.commandHandler.executeCommand(data.type, data);
                this.logger.info(`Successfully executed command: ${data.type}`);
            } catch (error) {
                this.logger.error(`Error handling command ${data.type}`, { error: error instanceof Error ? error.message : String(error) });
            }
        });
        this.logger.info("Message listener setup completed");
    }
}
