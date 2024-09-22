/**
 * src/ILogger.ts
 * 
 * This module defines the ILogger interface for logging functionalities 
 * within the application. It specifies the methods required for logging 
 * messages at various levels (info, warn, debug, error) and handling 
 * errors in a structured manner.
 * 
 * The `ILogger` interface allows for the implementation of different logging 
 * mechanisms, enabling flexibility in how logs are captured and reported 
 * throughout the application.
 */

import { LogLevel } from "../logging/CoreLogger";

/**
 * The ILogger interface outlines the contract for logging functionalities 
 * that must be implemented by any logging service. It includes methods for 
 * logging messages at various levels, as well as a method for handling 
 * errors with optional user messaging.
 */
export interface ILogger {
    /**
     * Logs a message at a specified log level.
     * 
     * @param level - The severity level of the log message.
     * @param message - The log message to be recorded.
     * @param properties - Optional additional properties to include with the log.
     */
    log(level: LogLevel, message: string, properties?: any): void;

    /**
     * Logs an informational message.
     * 
     * @param message - The informational message to be logged.
     * @param properties - Optional additional properties to include with the log.
     */
    info(message: string, properties?: any): void;

    /**
     * Logs a warning message.
     * 
     * @param message - The warning message to be logged.
     * @param properties - Optional additional properties to include with the log.
     */
    warn(message: string, properties?: any): void;

    /**
     * Logs a debug message.
     * 
     * @param message - The debug message to be logged.
     * @param properties - Optional additional properties to include with the log.
     */
    debug(message: string, properties?: any): void;

    /**
     * Logs an error message.
     * 
     * @param message - The error message to be logged.
     * @param properties - Optional additional properties to include with the log.
     */
    error(message: string, properties?: any): void;

    /**
     * Logs an error object with additional context.
     * 
     * @param error - The error object to be logged.
     * @param context - A string providing additional context about the error.
     * @param showUserMessage - Optional flag indicating whether to show a user-friendly message.
     */
    logError(error: any, context: string, showUserMessage?: boolean): void;
}