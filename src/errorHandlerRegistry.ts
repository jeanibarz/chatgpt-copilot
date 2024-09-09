// File: src/errorHandlerRegistry.ts

/**
 * This module provides a centralized registry for managing error handlers
 * associated with different HTTP status codes within a VS Code extension.
 * The `ErrorHandlerRegistry` class allows for registering, unregistering,
 * and retrieving error handlers, enabling flexible error handling strategies.
 * 
 * Key Features:
 * - Register and unregister error handlers for specific status codes.
 * - Retrieve error handlers by status code for consistent error processing.
 * - Log registration and unregistration events for observability.
 * 
 * Usage:
 * - The `registerHandler` method allows you to associate a handler function
 *   with a specific HTTP status code.
 * - The `unregisterHandler` method removes a previously registered handler.
 * - The `getHandler` method retrieves the handler associated with a given
 *   status code for use in error processing.
 */

import { ILogger } from "./interfaces/ILogger";

/**
 * The `ErrorHandlerRegistry` class manages a collection of error handlers
 * for various HTTP status codes. It allows for dynamic registration and
 * retrieval of handlers to facilitate customized error responses.
 */
export class ErrorHandlerRegistry {
    private handlers: Map<number, (error: any) => string> = new Map();  // Map to store error handlers by status code
    private logger: ILogger; // Logger instance for logging events

    /**
     * Constructor for the `ErrorHandlerRegistry` class.
     * Initializes the registry with a logger instance for logging events.
     * 
     * @param logger - An instance of `ILogger` for logging events.
     */
    constructor(logger: ILogger) {
        this.logger = logger;
    }

    /**
     * Registers a new error handler for a specific HTTP status code.
     * 
     * @param statusCode - The HTTP status code to associate with the handler.
     * @param handler - A function that takes an error object and returns a string message.
     */
    public registerHandler(statusCode: number, handler: (error: any) => string) {
        this.handlers.set(statusCode, handler);
        this.logger.info(`Handler registered for status code: ${statusCode}`);
    }

    /**
     * Unregisters the error handler for the specified HTTP status code.
     * 
     * @param statusCode - The HTTP status code for which to unregister the handler.
     */
    public unregisterHandler(statusCode: number) {
        this.handlers.delete(statusCode);
        this.logger.info(`Handler unregistered for status code: ${statusCode}`);
    }

    /**
     * Retrieves the error handler for the specified HTTP status code.
     * 
     * @param statusCode - The HTTP status code for which to retrieve the handler.
     * @returns The error handler function associated with the status code, or undefined if not found.
     */
    public getHandler(statusCode: number) {
        return this.handlers.get(statusCode);
    }
}
