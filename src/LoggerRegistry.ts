/**
 * This module provides a centralized registry for managing loggers within a VS Code extension.
 * The `LoggerRegistry` class ensures that loggers are uniquely identified by their names and 
 * channel names, preventing the creation of duplicate loggers.
 * 
 * Key Features:
 * - Adds and removes loggers from the registry by name or channel name.
 * - Prevents duplicate loggers from being created, ensuring each logger has a unique identity.
 * - Allows retrieval of loggers by name or channel name for easy access.
 * - Provides methods to clear all loggers from the registry or retrieve all registered loggers.
 */

import { CoreLogger } from "./CoreLogger";

export class LoggerRegistry {
    private loggersByName: Map<string, CoreLogger> = new Map(); // Map to store loggers by name
    private loggersByChannel: Map<string, CoreLogger> = new Map(); // Map to store loggers by channel name

    /**
     * Adds a CoreLogger instance to the registry.
     * If both a loggerName and channelName exist, they are stored in the appropriate maps.
     * 
     * @param logger - The CoreLogger instance to add.
     * @throws Will throw an error if a logger with the same name or channel name already exists.
     */
    public addLogger(logger: CoreLogger): void {
        const loggerName = logger.getLoggerName();
        const channelName = logger.getChannelName();

        if (this.loggersByName.has(loggerName)) {
            throw new Error(`Logger with name "${loggerName}" already exists.`);
        }
        if (channelName && this.loggersByChannel.has(channelName)) {
            throw new Error(`Logger with channel name "${channelName}" already exists.`);
        }

        // Add logger to maps
        this.loggersByName.set(loggerName, logger);
        if (channelName) {
            this.loggersByChannel.set(channelName, logger);
        }
    }

    /**
     * Removes a logger from the registry by its name.
     * If the logger has an associated channelName, it is removed from the channel map as well.
     * 
     * @param loggerName - The name of the logger to remove.
     * @throws Will throw an error if no logger is found with the specified name.
     */
    public removeLoggerByName(loggerName: string): void {
        const logger = this.loggersByName.get(loggerName);

        // If no logger is found, throw an error
        if (!logger) {
            throw new Error(`No logger found with name "${loggerName}".`);
        }

        // Remove logger from the channel map if it has a channel name
        const channelName = logger.getChannelName();
        if (channelName) {
            this.loggersByChannel.delete(channelName);
        }

        // Remove logger from the name map
        this.loggersByName.delete(loggerName);
    }

    /**
     * Retrieves a logger from the registry by its name.
     * 
     * @param loggerName - The name of the logger to retrieve.
     * @returns The CoreLogger instance, or undefined if not found.
     */
    public getLoggerByName(loggerName: string): CoreLogger | undefined {
        return this.loggersByName.get(loggerName);
    }

    /**
     * Retrieves a logger from the registry by its channel name.
     * 
     * @param channelName - The channel name of the logger to retrieve.
     * @returns The CoreLogger instance, or undefined if not found.
     */
    public getLoggerByChannel(channelName: string): CoreLogger | undefined {
        return this.loggersByChannel.get(channelName);
    }

    /**
     * Returns all registered loggers in an array.
     * 
     * @returns An array of all CoreLogger instances in the registry.
     */
    public getAllLoggers(): CoreLogger[] {
        return Array.from(this.loggersByName.values());
    }

    /**
     * Clears all loggers from the registry.
     * This removes loggers from both name and channel maps.
     */
    public clear(): void {
        this.loggersByName.clear();
        this.loggersByChannel.clear();
    }
}