// src/state/ApiCredentialsStateManager.ts

/**
 * This module manages the API credentials state using the VS Code global state.
 * It provides functionality to get and set API keys and JSON credentials paths
 * within the global state.
 */

import * as vscode from 'vscode';
import { ConfigKeys } from '../constants/ConfigKeys';
import { CoreLogger } from '../logging/CoreLogger';

/**
 * The ApiCredentialsStateManager class is responsible for managing the API 
 * credentials stored in the VS Code global state. It provides methods to 
 * retrieve and update the API key and the path to the JSON credentials file.
 * 
 * Key Features:
 * - Retrieves API keys and JSON credentials paths from the global state.
 * - Updates API keys and JSON credentials paths in the global state.
 */
export class ApiCredentialsStateManager {
    private globalState: vscode.Memento;
    private logger: CoreLogger;

    constructor(globalState: vscode.Memento) {
        this.globalState = globalState;
        this.logger = CoreLogger.getInstance();
        this.logger.info('ApiCredentialsStateManager initialized');
    }

    /**
     * Retrieves the API key from the global state.
     * 
     * @returns The API key as a string, or null/undefined if not set.
     */
    public getApiKey(): string | null | undefined {
        const apiKey = this.globalState.get<string>(ConfigKeys.ApiKey);
        this.logger.debug(`Retrieved API key from global state. Key ${apiKey ? 'exists' : 'does not exist'}`);
        return apiKey;
    }

    /**
     * Sets the API key in the global state.
     * 
     * @param apiKey - The API key to be stored. Can be null to remove the key.
     * @returns A promise that resolves when the API key has been set.
     */
    public async setApiKey(apiKey: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.ApiKey, apiKey);
        this.logger.info(`API key ${apiKey ? 'updated' : 'removed'} in global state`);
    }

    /**
     * Retrieves the JSON credentials path from the global state.
     * 
     * @returns The path to the JSON credentials as a string, or null/undefined if not set.
     */
    public getJsonCredentialsPath(): string | null | undefined {
        const path = this.globalState.get<string>(ConfigKeys.JsonCredentialsPath);
        this.logger.debug(`Retrieved JSON credentials path from global state. Path ${path ? 'exists' : 'does not exist'}`);
        return path;
    }

    /**
     * Sets the JSON credentials path in the global state.
     * 
     * @param path - The path to the JSON credentials to be stored. Can be null to remove the path.
     * @returns A promise that resolves when the JSON credentials path has been set.
     */
    public async setJsonCredentialsPath(path: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.JsonCredentialsPath, path);
        this.logger.info(`JSON credentials path ${path ? 'updated' : 'removed'} in global state`);
    }
}