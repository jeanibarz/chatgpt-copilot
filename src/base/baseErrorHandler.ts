import { ILogger } from "../interfaces/ILogger";

/**
 * The `BaseErrorHandler` class serves as an abstract base class for error handlers.
 * It provides a common interface and shared functionality for handling errors 
 * in the application. Subclasses must implement specific error handling logic 
 * as needed.
 */
export abstract class BaseErrorHandler {
    protected logger: ILogger;

    /**
     * Constructor for the `BaseErrorHandler` class.
     * Initializes the error handler with a logger instance for logging error events.
     * 
     * @param logger - An instance of ILogger for logging purposes.
     */
    constructor(logger: ILogger) {
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
