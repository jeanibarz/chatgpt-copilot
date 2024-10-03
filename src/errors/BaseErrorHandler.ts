// src/errors/BaseErrorHandler.ts

/**
 * This module provides an abstract base class for error handling in the application.
 * It defines a structure for logging errors using a logger instance.
 */

import { injectable } from "inversify";
import { CoreLogger } from "../logging/CoreLogger";

@injectable()
export abstract class BaseErrorHandler {
    protected logger: CoreLogger = CoreLogger.getInstance();

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