// src/webviewMessageHandler.ts

import * as vscode from "vscode";
import { ChatGptViewProvider, CommandType } from "./chatgptViewProvider";
import { CommandHandler } from "./commandHandler";
import { Logger, LogLevel } from "./logger";

export class WebviewMessageHandler {
    private logger: Logger;
    private commandHandler: CommandHandler;

    constructor(logger: Logger, commandHandler: CommandHandler) {
        this.logger = logger;
        this.commandHandler = commandHandler;
    }

    /**
     * Handles incoming messages from the webview, delegating command execution
     * and logging the events.
     */
    public handleMessages(webviewView: vscode.WebviewView, chatGptViewProvider: ChatGptViewProvider) {
        webviewView.webview.onDidReceiveMessage(async (data: {
            type: CommandType;
            value: any;
            language?: string;
        }) => {
            this.logger.log(LogLevel.Info, `Message received of type: ${data.type}`);

            try {
                await this.commandHandler.executeCommand(data.type, data, chatGptViewProvider);
            } catch (error) {
                chatGptViewProvider.handleCommandError(error, data.type);
            }
        });
    }
}