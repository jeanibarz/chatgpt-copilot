// src/base/BaseHandler.ts

/**
 * 
 * This module provides an abstract base class for handlers that execute operations 
 * within the application. The `BaseHandler` class implements the `IHandler<T>` interface 
 * and provides a common structure for logging errors encountered during operation execution.
 * 
 * Key Features:
 * - Implements a common interface for handling operations.
 * - Provides logging capabilities for error handling.
 * - Requires subclasses to implement specific handling logic through the `execute` method.
 */

import { inject } from "inversify";
import { IHandler } from "../interfaces/IHandler";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";

export abstract class BaseHandler<T> implements IHandler<T> {
    protected logger: CoreLogger; // Logger instance for logging events

    /**
     * Constructor for the `BaseHandler` class.
     * Initializes the handler with a logger instance for logging events.
     * 
     * @param logger - An instance of ILogger for logging purposes.
     */
    constructor(
        @inject(TYPES.CoreLogger) logger: CoreLogger
    ) {
        this.logger = logger;
    }

    /**
     * Executes the handler's logic with the provided data.
     * This method must be implemented by subclasses to define specific behavior.
     * 
     * @param data - The data to process.
     * @returns A Promise that resolves when the execution is complete.
     */
    public abstract execute(data: T): Promise<void>;

    /**
     * Handles an error by logging it using the logger instance.
     * 
     * @param error - The error object to log.
     */
    protected handleError(error: any): void {
        this.logger.logError(error, "BaseHandler");
    }
}