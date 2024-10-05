// src/state/ConfigurationStateManager.ts

/**
 * This module manages the configuration state for the extension, providing 
 * methods to retrieve and handle configuration values from the VS Code 
 * workspace settings.
 */

import * as vscode from 'vscode';
import { ExtensionConfigPrefix } from "../constants/ConfigKeys";
import { CoreLogger } from '../logging/CoreLogger';

/**
 * The ConfigurationStateManager class is responsible for managing the 
 * configuration settings of the extension. It provides methods to get 
 * configuration values, ensure required configurations are present, and 
 * listen for configuration changes.
 * 
 * Key Features:
 * - Retrieves configuration values with optional default values.
 * - Ensures required configuration values are present, throwing errors if not.
 * - Listens for changes in configuration and triggers callbacks.
 */
export class ConfigurationStateManager {
    private logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance();
    }

    /**
     * Retrieves the configuration value for a given key, returning a default 
     * value if the key is not found.
     * 
     * @param key - The configuration key to retrieve.
     * @param defaultValue - An optional default value to return if the key is not found.
     * @returns The configuration value or the default value if not found.
     */
    public getConfig<T>(key: string, defaultValue?: T): T {
        const configValue = vscode.workspace.getConfiguration(ExtensionConfigPrefix).get<T>(key);
        return configValue !== undefined ? configValue : (defaultValue as T);
    }

    /**
     * Retrieves a required configuration value for a given key, throwing an 
     * error if the key is not found.
     * 
     * @param key - The configuration key to retrieve.
     * @returns The required configuration value.
     * @throws Error if the configuration value is not found.
     */
    public getRequiredConfig<T>(key: string): T {
        const value = this.getConfig<T>(key);
        if (value === undefined) {
            const errorMessage = `Configuration value for "${key}" is required but not found.`;
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        }
        return value;
    }

    /**
     * Sets up a listener for configuration changes, executing the provided 
     * callback when the relevant configuration is changed.
     * 
     * @param callback - A function to call when the configuration changes.
     */
    public onConfigurationChanged(callback: () => void): void {
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(ExtensionConfigPrefix)) {
                this.logger.info('Configuration for "chatgpt" changed.');
                callback();
            }
        });
    }
}