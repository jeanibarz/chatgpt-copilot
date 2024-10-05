// src/services/ConfigurationManager.ts

/**
 * This module handles loading and managing configuration settings 
 * for the extension. It initializes configuration values and provides 
 * access to them for other components within the application.
 */

import * as vscode from 'vscode';

import { injectable } from "inversify";
import { CoreLogger } from "../logging/CoreLogger";
import { ModelManager } from "../models/ModelManager";
import { StateManager } from "../state/StateManager";
import { Utility } from "../Utility";

/**
 * Interface for the configuration manager that defines the methods 
 * for loading configuration and accessing workspace settings.
 */
interface IConfigurationManager {
    loadConfiguration(): void;
    getWorkspaceConfiguration(): any; // Define a more specific type if possible
}

/**
 * The `ConfigurationManager` class handles loading and managing 
 * configuration settings for the extension. It initializes 
 * configuration values and provides access to them for other 
 * components within the application.
 */
@injectable()
export class ConfigurationManager implements IConfigurationManager {
    private logger = CoreLogger.getInstance(); // Logger instance for logging configuration events

    // Configuration flags and settings
    public subscribeToResponse: boolean | undefined | null = false; // Flag to determine if responses should be subscribed to
    public autoScroll: boolean | undefined | null = false; // Flag to enable auto-scrolling of responses
    public conversationHistoryEnabled: boolean = true; // Flag to enable conversation history
    public apiBaseUrl?: string | null; // Base URL for API calls

    constructor() { }

    /**
     * Loads the configuration settings from the VS Code configuration files.
     * Initializes various configuration flags and settings based on the loaded values.
     */
    public async loadConfiguration(): Promise<void> {
        const stateManager = StateManager.getInstance();
        const modelManager: ModelManager = (await Utility.getProvider()).modelManager;

        // Load the model configuration and response settings
        modelManager.model = stateManager.getModelConfigStateManager().getModel();
        this.subscribeToResponse = stateManager.getUserPreferencesStateManager().getShowNotification();
        this.autoScroll = !!stateManager.getUserPreferencesStateManager().getShowNotification();
        this.conversationHistoryEnabled = stateManager.getUserPreferencesStateManager().getConversationHistoryEnabled() ?? true;

        // Check for custom model configuration
        if (modelManager.model === "custom") {
            modelManager.model = stateManager.getModelConfigStateManager().getCustomModelName();
        }
        this.apiBaseUrl = stateManager.getModelConfigStateManager().getApiBaseUrl() ?? null;

        // Ensure Azure model names are valid
        if (this.apiBaseUrl?.includes("azure")) {
            modelManager.model = modelManager.model?.replace(".", "");
        }

        // Log that the configuration has been successfully loaded
        this.logger.info("Configuration loaded");
    }

    /**
     * Retrieves the workspace configuration for the extension.
     * 
     * @returns The workspace configuration object for the "chatgpt" extension.
     */
    public getWorkspaceConfiguration(): any {
        return vscode.workspace.getConfiguration("chatgpt");
    }
}