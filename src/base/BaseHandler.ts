// src/base/BaseHandler.ts

/**
 * This module defines the `BaseHandler` abstract class, which serves as a 
 * base for implementing various handlers. It provides a common interface 
 * for handling data and logging errors.
 */

import { injectable } from "inversify";
import { IHandler } from "../interfaces/IHandler";
import { CoreLogger } from "../logging/CoreLogger";

/**
 * The BaseHandler class provides a base implementation for handlers, 
 * ensuring that all handlers have a logger for logging events and 
 * an abstract method for execution.
 * 
 * Key Features:
 * - Provides a logger instance for logging errors and events.
 * - Requires subclasses to implement the execute method for processing data.
 */
@injectable()
export abstract class BaseHandler<T> implements IHandler<T> {
    protected logger: CoreLogger = CoreLogger.getInstance();

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