// src/errors/BaseErrorHandler.ts

/**
 * 
 * This module provides an abstract base class for error handlers within the application.
 * The `BaseErrorHandler` class serves as a foundation for creating specific error handlers,
 * offering shared functionality and a common interface for handling various errors.
 * 
 * Key Features:
 * - Implements a common interface for handling errors.
 * - Provides logging capabilities for error handling.
 * - Requires subclasses to implement specific error handling logic.
 */

import { inject, injectable } from "inversify";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";

@injectable()
export abstract class BaseErrorHandler {
    protected logger: CoreLogger; // Logger instance for logging error events

    /**
     * Constructor for the `BaseErrorHandler` class.
     * Initializes the error handler with a logger instance for logging error events.
     * 
     * @param logger - An instance of ILogger for logging purposes.
     */
    constructor(
        @inject(TYPES.CoreLogger) logger: CoreLogger
    ) {
        this.logger = logger;
    }

    /**
     * Handles an error by logging it using the logger instance.
     * This method should be called whenever an error occurs in the application.
     * 
     * @param error - The error object to log.
     * @param context - A string providing context about where the error occurred.
     */
    public handleError(error: any, context: string): void {
        this.logger.logError(error, context);
    }
}