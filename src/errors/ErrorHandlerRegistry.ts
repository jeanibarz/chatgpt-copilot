// src/errors/ErrorHandlerRegistry.ts

/**
 * This module manages a collection of error handlers for various HTTP 
 * status codes. It allows for dynamic registration and retrieval of 
 * handlers to facilitate customized error responses.
 */

import { CoreLogger } from "../logging/CoreLogger";

/**
 * The `ErrorHandlerRegistry` class manages a collection of error handlers
 * for various HTTP status codes. It allows for dynamic registration and
 * retrieval of handlers to facilitate customized error responses.
 */
export class ErrorHandlerRegistry {
    private logger: CoreLogger = CoreLogger.getInstance();
    private handlers: Map<number, (error: any) => string> = new Map();  // Map to store error handlers by status code

    /**
     * Registers a new error handler for a specific HTTP status code.
     * 
     * @param statusCode - The HTTP status code to associate with the handler.
     * @param handler - A function that takes an error object and returns a string message.
     */
    public registerHandler(statusCode: number, handler: (error: any) => string): void {
        this.handlers.set(statusCode, handler);
        this.logger.info(`Handler registered for status code: ${statusCode}`);
    }

    /**
     * Unregisters the error handler for the specified HTTP status code.
     * 
     * @param statusCode - The HTTP status code for which to unregister the handler.
     */
    public unregisterHandler(statusCode: number): void {
        this.handlers.delete(statusCode);
        this.logger.info(`Handler unregistered for status code: ${statusCode}`);
    }

    /**
     * Retrieves the error handler for the specified HTTP status code.
     * 
     * @param statusCode - The HTTP status code for which to retrieve the handler.
     * @returns The error handler function associated with the status code, or undefined if not found.
     */
    public getHandler(statusCode: number): ((error: any) => string) | undefined {
        return this.handlers.get(statusCode);
    }
}