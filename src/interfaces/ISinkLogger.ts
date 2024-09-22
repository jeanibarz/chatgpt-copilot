/**
 * src/ISinkLogger.ts
 * 
 * This module defines the `ISinkLogger` interface, which outlines the common 
 * functionalities required for various sink loggers. Implementations of this 
 * interface are responsible for providing mechanisms to log messages to different 
 * logging sinks, ensuring a consistent logging approach across different components.
 * 
 * Key Features:
 * - Defines a standard method for logging messages.
 * - Allows for extensibility by enabling the creation of different sink logger 
 *   implementations.
 */

/**
 * The ISinkLogger interface defines the common functionalities for various sink loggers.
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