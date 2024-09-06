// src/interfaces/ISinkLogger.ts

/**
 * The `ISinkLogger` interface defines the common functionalities for various sink loggers.
 * Implementations of this interface should provide mechanisms for logging messages.
 */
export interface ISinkLogger {
    /**
     * Logs a message to the sink.
     * 
     * @param message - The message to log.
     */
    log(message: string): void;
}
