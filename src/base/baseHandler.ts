import { IHandler } from "../interfaces/IHandler";
import { ILogger } from "../interfaces/ILogger";

/**
 * The `BaseHandler` class serves as an abstract base class for handlers that execute operations.
 * It implements the `IHandler<T>` interface and provides a common structure for logging errors.
 * 
 * Subclasses must implement the `execute` method to define their specific handling logic.
 */
export abstract class BaseHandler<T> implements IHandler<T> {
    protected logger: ILogger;

    /**
     * Constructor for the `BaseHandler` class.
     * Initializes the handler with a logger instance for logging events.
     * 
     * @param logger - An instance of ILogger for logging purposes.
     */
    constructor(logger: ILogger) {
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
