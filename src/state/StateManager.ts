// src/state/StateManager.ts

/**
 * This module manages the state of various components within the extension, 
 * providing a singleton instance for accessing different state managers. 
 * It encapsulates the management of API credentials, commands, configurations, 
 * file management, model configurations, prompts, user preferences, and sessions.
 * 
 * Key Features:
 * - Singleton pattern to ensure a single instance of StateManager.
 * - Provides access to various state managers for different functionalities.
 */

import * as vscode from 'vscode';
import { CoreLogger } from '../logging/CoreLogger';
import { ApiCredentialsStateManager } from './ApiCredentialsStateManager';
import { CommandStateManager } from './CommandStateManager';
import { ConfigurationStateManager } from './ConfigurationStateManager';
import { FileManagementStateManager } from './FileManagementStateManager';
import { ModelConfigStateManager } from './ModelConfigStateManager';
import { PromptStateManager } from './PromptStateManager';
import { SessionStateManager } from './SessionStateManager';
import { UserPreferencesStateManager } from './UserPreferencesStateManager';

export class StateManager {
    private static instance: StateManager;
    private apiCredentialsStateManager: ApiCredentialsStateManager;
    private commandStateManager: CommandStateManager;
    private configurationStateManager: ConfigurationStateManager;
    private fileManagementStateManager: FileManagementStateManager;
    private modelConfigStateManager: ModelConfigStateManager;
    private promptStateManager: PromptStateManager;
    private sessionStateManager: SessionStateManager;
    private userPreferencesStateManager: UserPreferencesStateManager;
    private logger: CoreLogger;

    private constructor(private extensionContext: vscode.ExtensionContext) {
        this.logger = CoreLogger.getInstance();
        this.logger.info('StateManager: Initializing state managers');

        const globalState = extensionContext.globalState;

        this.configurationStateManager = new ConfigurationStateManager();
        this.promptStateManager = new PromptStateManager();
        this.userPreferencesStateManager = new UserPreferencesStateManager();
        this.sessionStateManager = new SessionStateManager(globalState);
        this.commandStateManager = new CommandStateManager(globalState);
        this.apiCredentialsStateManager = new ApiCredentialsStateManager(globalState);
        this.fileManagementStateManager = new FileManagementStateManager(globalState, this.configurationStateManager);
        this.modelConfigStateManager = new ModelConfigStateManager(globalState, this.configurationStateManager);

        this.logger.info('StateManager: All state managers initialized successfully');
    }

    /**
     * Initializes the StateManager singleton instance with the given extension context.
     * 
     * @param extensionContext - The context of the extension, providing global state access.
     */
    public static initialize(extensionContext: vscode.ExtensionContext): void {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager(extensionContext);
            CoreLogger.getInstance().info('StateManager: Singleton instance initialized');
        } else {
            CoreLogger.getInstance().warn('StateManager: Attempted to initialize an already existing instance');
        }
    }

    /**
     * Retrieves the singleton instance of the StateManager.
     * 
     * @returns The StateManager instance.
     * @throws Error if the StateManager is not initialized.
     */
    public static getInstance(): StateManager {
        if (!StateManager.instance) {
            CoreLogger.getInstance().error('StateManager: Attempted to get instance before initialization');
            throw new Error('StateManager not initialized. Call initialize() first.');
        }
        return StateManager.instance;
    }

    /**
     * Gets the extension context.
     * 
     * @returns The vscode.ExtensionContext associated with the StateManager.
     */
    public getExtensionContext(): vscode.ExtensionContext {
        this.logger.debug('StateManager: Retrieving extension context');
        return this.extensionContext;
    }

    /**
     * Gets the API credentials state manager.
     * 
     * @returns The ApiCredentialsStateManager instance.
     */
    public getApiCredentialsStateManager(): ApiCredentialsStateManager {
        this.logger.debug('StateManager: Retrieving ApiCredentialsStateManager');
        return this.apiCredentialsStateManager;
    }

    /**
     * Gets the command state manager.
     * 
     * @returns The CommandStateManager instance.
     */
    public getCommandStateManager(): CommandStateManager {
        this.logger.debug('StateManager: Retrieving CommandStateManager');
        return this.commandStateManager;
    }

    /**
     * Gets the configuration state manager.
     * 
     * @returns The ConfigurationStateManager instance.
     */
    public getConfigurationStateManager(): ConfigurationStateManager {
        this.logger.debug('StateManager: Retrieving ConfigurationStateManager');
        return this.configurationStateManager;
    }

    /**
     * Gets the file management state manager.
     * 
     * @returns The FileManagementStateManager instance.
     */
    public getFileManagementStateManager(): FileManagementStateManager {
        this.logger.debug('StateManager: Retrieving FileManagementStateManager');
        return this.fileManagementStateManager;
    }

    /**
     * Gets the model configuration state manager.
     * 
     * @returns The ModelConfigStateManager instance.
     */
    public getModelConfigStateManager(): ModelConfigStateManager {
        this.logger.debug('StateManager: Retrieving ModelConfigStateManager');
        return this.modelConfigStateManager;
    }

    /**
     * Gets the prompt state manager.
     * 
     * @returns The PromptStateManager instance.
     */
    public getPromptStateManager(): PromptStateManager {
        this.logger.debug('StateManager: Retrieving PromptStateManager');
        return this.promptStateManager;
    }

    /**
     * Gets the session state manager.
     * 
     * @returns The SessionStateManager instance.
     */
    public getSessionStateManager(): SessionStateManager {
        this.logger.debug('StateManager: Retrieving SessionStateManager');
        return this.sessionStateManager;
    }

    /**
     * Gets the user preferences state manager.
     * 
     * @returns The UserPreferencesStateManager instance.
     */
    public getUserPreferencesStateManager(): UserPreferencesStateManager {
        this.logger.debug('StateManager: Retrieving UserPreferencesStateManager');
        return this.userPreferencesStateManager;
    }
}