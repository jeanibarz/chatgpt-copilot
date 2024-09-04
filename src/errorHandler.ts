// src/errorHandler.ts
import * as vscode from "vscode";
import { BaseErrorHandler } from "./base/baseErrorHandler";
import { Logger } from "./logger";
import { delay } from "./utils/delay";
import { logError } from "./utils/errorLogger";

export class ErrorHandler extends BaseErrorHandler {
    private handlers: Map<number, (error: any, options: any, sendMessage: (message: any) => void) => string> = new Map();

    constructor(logger: Logger) {
        super(logger);
    }

    public registerHandler(statusCode: number, handler: (error: any, options: any, sendMessage: (message: any) => void) => string) {
        this.handlers.set(statusCode, handler);
    }

    public unregisterHandler(statusCode: number) {
        this.handlers.delete(statusCode);
    }

    public handleApiError(error: any, prompt: string, options: any, sendMessage: (message: any) => void, configurationManager: any) {
        let message;
        let apiMessage =
            error?.response?.data?.error?.message ||
            error?.toString?.() ||
            error?.message ||
            error?.name;

        logError(this.logger, "api-request-failed", "API Request");

        if (error?.response) {
            const { status, statusText } = error.response;
            message = `${status || ""} ${statusText || ""}`;

            vscode.window
                .showErrorMessage(
                    "An error occurred. If this is due to max_token, you could try `ChatGPT: Clear Conversation` command and retry sending your prompt.",
                    "Clear conversation and retry",
                )
                .then(async (choice) => {
                    if (choice === "Clear conversation and retry") {
                        await vscode.commands.executeCommand("chatgpt-copilot.clearConversation");
                        await delay(250);
                        // Call the API request again if necessary
                    }
                });
        }

        const handler = this.handlers.get(error?.statusCode);
        if (handler) {
            message = handler(error, options, sendMessage);
        } else {
            // Fallback for unhandled status codes
            message = this.getDefaultErrorMessage(error, options);
        }

        if (apiMessage) {
            message = `${message ? message + " " : ""} ${apiMessage}`;
        }

        sendMessage({
            type: "addError",
            value: message,
            autoScroll: configurationManager.autoScroll,
        });
    }

    public handleError(error: any, context: string): void {
        this.logger.logError(error, context, true);
    }

    private getDefaultErrorMessage(error: any, options: any): string {
        switch (error?.statusCode) {
            case 400:
                return `Your model: '${options.model}' may be incompatible or one of your parameters is unknown. Reset your settings to default. (HTTP 400 Bad Request)`;
            case 401:
                return "Make sure you are properly signed in. ... (HTTP 401 Unauthorized)";
            case 403:
                return "Your token has expired. Please try authenticating again. (HTTP 403 Forbidden)";
            case 404:
                return `Your model: '${options.model}' may be incompatible or you may have exhausted your ChatGPT subscription allowance. (HTTP 404 Not Found)`;
            case 429:
                return "Too many requests; try again later. (HTTP 429 Too Many Requests)";
            case 500:
                return "The server had an error while processing your request. (HTTP 500 Internal Server Error)";
            default:
                return "An unknown error occurred."; // Default message for unhandled status codes
        }
    }
}
