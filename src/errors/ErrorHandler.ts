/**
 * src/errors/ErrorHandler.ts
 * 
 * This module provides a centralized error handling mechanism for use within a VS Code extension.
 * The `ErrorHandler` class manages error handlers for different HTTP status codes,
 * allowing for customized responses and logging for various error scenarios.
 * 
 * Key Features:
 * - Register and unregister error handlers for specific HTTP status codes.
 * - Handle API errors with appropriate messaging and logging.
 * - Provide default error messages for common HTTP status codes.
 * 
 * Usage:
 * - The `handleApiError` method processes API errors, retrieves the appropriate handler,
 *   and logs the error with context.
 * - The `registerHandler` and `unregisterHandler` methods allow for dynamic management
 *   of error handlers for specific status codes.
 */

import * as vscode from "vscode";
import { CoreLogger } from "../logging/CoreLogger";
import { Utility } from "../Utility";
import { BaseErrorHandler } from "./BaseErrorHandler";
import { ErrorHandlerRegistry } from "./ErrorHandlerRegistry";

/**
 * The `ErrorHandler` class extends the `BaseErrorHandler` and provides specific error handling logic.
 * It manages a registry of error handlers for different HTTP status codes and facilitates
 * the logging and reporting of errors that occur during API requests.
 */
export class ErrorHandler extends BaseErrorHandler {
    private registry: ErrorHandlerRegistry;

    /**
     * Constructor for the `ErrorHandler` class.
     * Initializes the error handler with a logger instance and an error handler registry.
     * 
     * @param logger - An instance of `CoreLogger` for logging events.
     */
    constructor(logger: CoreLogger) {
        super(logger);
        this.registry = new ErrorHandlerRegistry(logger);
    }

    /**
     * Registers a new error handler for a specific HTTP status code.
     * 
     * @param statusCode - The HTTP status code to associate with the handler.
     * @param handler - A function that takes an error object and returns a string message.
     */
    public registerHandler(statusCode: number, handler: (error: any) => string): void {
        this.registry.registerHandler(statusCode, handler);
    }

    /**
     * Unregisters the error handler for the specified HTTP status code.
     * 
     * @param statusCode - The HTTP status code for which to unregister the handler.
     */
    public unregisterHandler(statusCode: number): void {
        this.registry.unregisterHandler(statusCode);
    }

    /**
     * Handles API errors that occur during requests.
     * Retrieves the appropriate error handler from the registry based on the error's status code.
     * Logs the error and provides feedback to the user if necessary.
     * 
     * @param error - The error object that was thrown during the API request.
     * @param options - Options related to the API request that failed.
     * @param sendMessage - A function to send messages back to the webview.
     * @param configurationManager - The configuration manager instance for accessing settings.
     */
    public handleApiError(error: any, options: any, sendMessage: (message: any) => void, configurationManager: any): void {
        const handler = this.registry.getHandler(error?.statusCode);
        let message;

        if (handler) {
            message = handler(error);
        } else {
            message = this.getDefaultErrorMessage(error, options);
            this.logger.warn(`Fallback error message used for status code: ${error?.statusCode}`);
        }

        // Log the error with context
        const apiMessage = error?.response?.data?.error?.message || error?.toString?.() || error?.message || error?.name;
        this.logger.logError("api-request-failed", `API Request failed: ${apiMessage}`);

        if (error?.response) {
            const { status, statusText } = error.response;
            message = `${status || ""} ${statusText || ""}`;

            vscode.window
                .showErrorMessage(
                    "An error occurred. If this is due to max_token, you could try `ChatGPT: Clear Conversation` command and retry sending your prompt.",
                    "Clear conversation and retry"
                )
                .then(async (choice) => {
                    if (choice === "Clear conversation and retry") {
                        await this.clearConversationAndRetry(options, sendMessage);
                    }
                });
        }

        if (handler) {
            message = handler(error);
        } else {
            // Fallback for unhandled status codes
            message = this.getDefaultErrorMessage(error, options);
        }

        if (apiMessage) {
            message = `${message ? message + " " : ""} ${apiMessage}`;
        }
    }

    /**
     * Logs an error using the logger instance.
     * 
     * @param error - The error object to log.
     * @param context - The context in which the error occurred.
     */
    public handleError(error: any, context: string): void {
        this.logger.logError(error, context, true);
    }

    /**
     * Provides a default error message based on the HTTP status code.
     * 
     * @param error - The error object containing the status code.
     * @param options - Options related to the API request that failed.
     * @returns A string message describing the error.
     */
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

    /**
     * Clears the current conversation and retries the API request.
     * 
     * @param options - Options related to the API request that failed.
     * @param sendMessage - A function to send messages back to the webview.
     */
    private async clearConversationAndRetry(options: any, sendMessage: (message: any) => void) {
        await vscode.commands.executeCommand("chatgpt-copilot.clearConversation");
        await Utility.delay(250);

        // Here you would call the API request again with the necessary parameters
        // For example:
        // await this.callApiAgain(options, sendMessage);
    }
}