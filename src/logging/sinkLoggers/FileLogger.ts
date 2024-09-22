/**
 * This module provides a logging mechanism that writes log messages to a specified file.
 * The `FileLogger` class is responsible for appending messages to the log file, 
 * enabling persistent logging of events or errors that occur during the application's execution.
 * 
 * Key Features:
 * - Appends log messages to a specified file.
 * - Maintains a record of events or errors across application sessions.
 */

import * as fs from "fs";
import { ISinkLogger } from "../../interfaces/ISinkLogger";

export class FileLogger implements ISinkLogger {
    private logFilePath: string; // The path to the log file where messages will be written

    /**
     * Constructor for the `FileLogger` class.
     * Initializes the logger with the path to the log file.
     * 
     * @param logFilePath - The path to the log file where messages will be written.
     */
    constructor(logFilePath: string) {
        this.logFilePath = logFilePath;
    }

    /**
     * Logs a message to the specified log file.
     * Appends the message to the file, ensuring each log entry is on a new line.
     * 
     * @param message - The message to log.
     */
    public log(message: string): void {
        fs.appendFileSync(this.logFilePath, message + '\n', { encoding: 'utf8' });
    }
}