// errorHandler.ts
import * as vscode from "vscode";
import { Logger, LogLevel } from "./logger";

export class ErrorHandler {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    public handleApiError(error: any, prompt: string, options: any, sendMessage: (message: any) => void, configurationManager: any) {
        let message;
        let apiMessage =
            error?.response?.data?.error?.message ||
            error?.tostring?.() ||
            error?.message ||
            error?.name;

        this.logger.log(LogLevel.Error, "api-request-failed");

        if (error?.response?.status || error?.response?.statusText) {
            message = `${error?.response?.status || ""} ${error?.response?.statusText || ""}`;

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
        } else if (error.statusCode === 400) {
            message = `Your model: '${options.model}' may be incompatible or one of your parameters is unknown. Reset your settings to default. (HTTP 400 Bad Request)`;
        } else if (error.statusCode === 401) {
            message = "Make sure you are properly signed in. ... (HTTP 401 Unauthorized)";
        } else if (error.statusCode === 403) {
            message = "Your token has expired. Please try authenticating again. (HTTP 403 Forbidden)";
        } else if (error.statusCode === 404) {
            message = `Your model: '${options.model}' may be incompatible or you may have exhausted your ChatGPT subscription allowance. (HTTP 404 Not Found)`;
        } else if (error.statusCode === 429) {
            message = "Too many requests; try again later. (HTTP 429 Too Many Requests)";
        } else if (error.statusCode === 500) {
            message = "The server had an error while processing your request. (HTTP 500 Internal Server Error)";
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
}
