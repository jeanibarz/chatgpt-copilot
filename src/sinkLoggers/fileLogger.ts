// File: src/sinkLoggers/fileLogger.ts

import * as fs from "fs";
import { ISinkLogger } from "../interfaces/ISinkLogger";

/**
 * The `FileLogger` class is responsible for logging messages to a file.
 * It appends messages to the specified log file, maintaining a record of events
 * or errors that occur during the application's execution.
 */
export class FileLogger implements ISinkLogger {
    private logFilePath: string;

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
    public log(message: string) {
        fs.appendFileSync(this.logFilePath, message + '\n', { encoding: 'utf8' });
    }
}
