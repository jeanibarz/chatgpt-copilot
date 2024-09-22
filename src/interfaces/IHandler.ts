/**
 * src/IHandler.ts
 * 
 * This module defines the interface for handling asynchronous operations 
 * within the application. It provides a generic contract for creating 
 * handler classes that can execute tasks based on the provided data type.
 * 
 * The `IHandler` interface ensures that any implementing class will have 
 * an `execute` method that accepts data of a specified type and returns 
 * a promise, allowing for asynchronous processing of that data.
 */

/**
 * The IHandler interface defines the structure for handler classes that 
 * perform operations on data of a specific type.
 * 
 * Implementing classes must provide an `execute` method that processes 
 * the given data asynchronously.
 * 
 * @template T - The type of data that the handler will process.
 */
export interface IHandler<T> {
    /**
     * Executes the operation with the provided data.
     * 
     * @param data - The input data of type T to be processed.
     * @returns A promise that resolves when the operation is complete.
     */
    execute(data: T): Promise<void>;
}