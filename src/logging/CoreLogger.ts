// src/logging/CoreLogger.ts

/**
 * This module provides a logging utility that supports both file-based and output channel-based loggers.
 * It allows logging messages with varying levels of severity and manages loggers through a registry.
 */

import * as vscode from "vscode";

import { LoggerRegistry } from "./LoggerRegistry";
import { FileLogger } from "./sinkLoggers/FileLogger";
import { OutputChannelLogger } from "./sinkLoggers/OutputChannelLogger";

/**
 * Enum representing the different log levels supported by the logger.
 */
export enum LogLevel {
    Info = "INFO",
    Debug = "DEBUG",
    Warning = "WARNING",
    Error = "ERROR",
}

/**
 * Interface for logger options used to configure the creation of a logger.
 * 
 * @interface CoreLoggerOptions
 * @property {string} loggerName - Required name for the logger.
 * @property {string} [channelName] - Optional name for the VS Code output channel.
 * @property {string} [logFilePath] - Optional path for logging to a file.
 */
interface CoreLoggerOptions {
    loggerName: string; // Required logger name
    channelName?: string; // Optional channel name
    logFilePath?: string; // Optional file path for the file logger
}

/**
 * The `CoreLogger` class handles logging for both file-based and output channel-based loggers.
 * A logger can log messages with varying levels of severity and can log to multiple sinks
 * (file and/or output channel).
 * 
 * This class also interacts with a `LoggerRegistry` to manage named loggers and prevent 
 * duplicate logger creation.
 */
export class CoreLogger {
    private loggerName: string; // The name of the logger
    private static registry: LoggerRegistry = new LoggerRegistry(); // Logger registry for managing loggers
    private fileSinkLogger?: FileLogger; // Optional file logger instance
    private outputChannelSinkLogger?: OutputChannelLogger; // Optional output channel logger instance

    /**
     * Constructor for the `CoreLogger` class.
     * Requires a `loggerName` but allows optional channelName and logFilePath.
     * If `logFilePath` is provided, logs will be written to a file. If no `channelName` is provided,
     * the `loggerName` will be used as the output channel name.
     * 
     * @param options - The configuration options for the logger.
     */
    public constructor(options: CoreLoggerOptions) {
        // loggerName is mandatory here
        this.loggerName = options.loggerName;

        // Create file logger if logFilePath is provided
        if (options.logFilePath) {
            this.fileSinkLogger = new FileLogger(options.logFilePath);
        }

        // If both channelName and logFilePath are not provided, use loggerName for channel name
        if (!options.channelName && !options.logFilePath) {
            options.channelName = this.loggerName;
        }

        // Create the OutputChannelLogger with the channel name
        if (options.channelName) {
            this.outputChannelSinkLogger = new OutputChannelLogger(options.channelName);
        }
    }

    /**
     * Static method to get an instance of `CoreLogger`.
     * If no logger with the given name exists, it will create a new logger. If `options` is not
     * provided, it defaults to creating a logger with the name "ChatGPT Copilot".
     * 
     * @param options - Optional configuration for creating the logger. If not provided, 
     *                  defaults to `{ loggerName: 'ChatGPT Copilot' }`.
     * @returns A `CoreLogger` instance.
     */
    public static getInstance(options?: CoreLoggerOptions): CoreLogger {
        // Default to "ChatGPT Copilot" if loggerName is not provided
        const loggerName = options?.loggerName || 'ChatGPT Copilot';
        const existingLogger = CoreLogger.registry.getLoggerByName(loggerName);

        if (existingLogger) {
            return existingLogger;
        }

        // Ensure loggerName is set in the options for the constructor
        const newLoggerOptions: CoreLoggerOptions = {
            loggerName,
            channelName: options?.channelName,
            logFilePath: options?.logFilePath
        };

        const newLogger = new CoreLogger(newLoggerOptions);
        CoreLogger.registry.addLogger(newLogger);
        return newLogger;
    }

    /**
     * Retrieves the name of the logger.
     * 
     * @returns The logger name.
     */
    public getLoggerName(): string {
        return this.loggerName;
    }

    /**
     * Retrieves the name of the output channel, if one exists.
     * 
     * @returns The channel name or undefined if no output channel is configured.
     */
    public getChannelName(): string | undefined {
        return this.outputChannelSinkLogger?.getChannelName();
    }

    /**
     * Removes the logger from the `LoggerRegistry`.
     */
    public removeFromRegistry(): void {
        CoreLogger.registry.removeLoggerByName(this.getLoggerName());
    }

    /**
     * Logs a message with the specified log level.
     * If both file and output channel loggers are defined, the message is logged to both.
     * 
     * @param level - The log level (Info, Debug, Warning, Error).
     * @param message - The message to log.
     * @param properties - Optional properties to include in the log.
     */
    public log(level: LogLevel, message: string, properties?: any): void {
        const formattedMessage = `${level} ${message} ${properties ? JSON.stringify(properties) : ""
            }`.trim();

        if (!this.outputChannelSinkLogger && !this.fileSinkLogger) {
            console.warn("No sink logger available to log the message.");
            return;
        }

        if (this.outputChannelSinkLogger) {
            this.outputChannelSinkLogger.log(formattedMessage);
        }
        if (this.fileSinkLogger) {
            this.fileSinkLogger.log(formattedMessage);
        }
    }

    /**
     * Convenience method for logging messages with log level Info.
     * 
     * @param message - The info message to log.
     * @param properties - Optional properties to include in the log.
     */
    public info(message: string, properties?: any): void {
        this.log(LogLevel.Info, message, properties);
    }

    /**
     * Convenience method for logging messages with log level Warning.
     * 
     * @param message - The warning message to log.
     * @param properties - Optional properties to include in the log.
     */
    public warn(message: string, properties?: any): void {
        this.log(LogLevel.Warning, message, properties);
    }

    /**
     * Convenience method for logging messages with log level Debug.
     * 
     * @param message - The debug message to log.
     * @param properties - Optional properties to include in the log.
     */
    public debug(message: string, properties?: any): void {
        this.log(LogLevel.Debug, message, properties);
    }

    /**
     * Convenience method for logging messages with log level Error.
     * 
     * @param message - The error message to log.
     * @param properties - Optional properties to include in the log.
     */
    public error(message: string, properties?: any): void {
        this.log(LogLevel.Error, message, properties);
    }

    /**
     * Logs an error and optionally shows the error to the user via VS Code's error message window.
     * 
     * @param error - The error object or message to log.
     * @param context - The context in which the error occurred.
     * @param showUserMessage - If true, show an error message to the user in the UI.
     */
    public logError(error: any, context: string, showUserMessage: boolean = false): void {
        const message = error instanceof Error ? error.message : String(error);
        this.error(`Error in ${context}: ${message}`);

        if (showUserMessage) {
            vscode.window.showErrorMessage(`Error in ${context}: ${message}`);
        }
    }
}