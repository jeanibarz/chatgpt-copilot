// src/services/ConfigurationManager.ts

/**
 * This module handles loading and managing configuration settings 
 * for the extension. It initializes configuration values and provides 
 * access to them for other components within the application.
 */

import * as vscode from 'vscode';

import { inject, injectable } from "inversify";
import { getConfig, getRequiredConfig } from "../config/Configuration";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { ModelManager } from "./ModelManager";

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
    public modelManager: ModelManager; // Instance of ModelManager to manage models

    // Configuration flags and settings
    public subscribeToResponse: boolean = false; // Flag to determine if responses should be subscribed to
    public autoScroll: boolean = false; // Flag to enable auto-scrolling of responses
    public conversationHistoryEnabled: boolean = true; // Flag to enable conversation history
    public apiBaseUrl?: string; // Base URL for API calls

    /**
     * Constructor for the `ConfigurationManager` class.
     * Initializes the logger and model manager, and loads the configuration.
     * 
     * @param modelManager - An instance of `ModelManager` to manage models.
     */
    constructor(
        @inject(TYPES.ModelManager) modelManager: ModelManager
    ) {
        this.modelManager = modelManager;
        this.loadConfiguration(); // Load configuration upon instantiation
    }

    /**
     * Loads the configuration settings from the VS Code configuration files.
     * Initializes various configuration flags and settings based on the loaded values.
     */
    public loadConfiguration(): void {
        // Load the model configuration and response settings
        this.modelManager.model = getRequiredConfig<string>("gpt3.model");
        this.subscribeToResponse = getConfig<boolean>("response.showNotification", false);
        this.autoScroll = !!getConfig<boolean>("response.autoScroll", false);
        this.conversationHistoryEnabled = getConfig<boolean>("conversationHistoryEnabled", true);

        // Check for custom model configuration
        if (this.modelManager.model === "custom") {
            this.modelManager.model = getRequiredConfig<string>("gpt3.customModel");
        }
        this.apiBaseUrl = getRequiredConfig<string>("gpt3.apiBaseUrl");

        // Ensure Azure model names are valid
        if (this.apiBaseUrl?.includes("azure")) {
            this.modelManager.model = this.modelManager.model?.replace(".", "");
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