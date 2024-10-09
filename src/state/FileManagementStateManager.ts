// src/state/FileManagementStateManager.ts

/**
 * This module manages the state of file management settings within the 
 * application, providing methods to retrieve and update configuration 
 * options related to file paths and regex patterns.
 */

import * as vscode from 'vscode';
import { ConfigKeys } from "../constants/ConfigKeys";
import { CoreLogger } from '../logging/CoreLogger';
import { ConfigurationStateManager } from "./ConfigurationStateManager";

/**
 * The FileManagementStateManager class is responsible for handling the 
 * application's file management state, including retrieving and setting 
 * configuration values related to file paths and patterns.
 * 
 * Key Features:
 * - Provides methods to get and set the output folder for Mermaid files.
 * - Retrieves inclusion and exclusion regex patterns from the configuration.
 */
export class FileManagementStateManager {
    private logger: CoreLogger;

    constructor(
        private globalState: vscode.Memento,
        private configurationStateManager: ConfigurationStateManager,
    ) {
        this.logger = CoreLogger.getInstance();
        this.logger.info('FileManagementStateManager initialized');
    }

    /**
     * Retrieves the folder path for Mermaid output from global state.
     * 
     * @returns The Mermaid output folder path, or null/undefined if not set.
     */
    public getMermaidOutputFolder(): string | null | undefined {
        const folderPath = this.globalState.get<string>(ConfigKeys.MermaidOutputFolder);
        this.logger.debug(`Retrieved Mermaid output folder: ${folderPath || 'Not set'}`);
        return folderPath;
    }

    /**
     * Updates the folder path for Mermaid output in global state.
     * 
     * @param folderPath - The new folder path to set, or null to clear the setting.
     * @returns A promise that resolves when the update is complete.
     */
    public async setMermaidOutputFolder(folderPath: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.MermaidOutputFolder, folderPath);
        this.logger.info(`Mermaid output folder ${folderPath ? `updated to: ${folderPath}` : 'cleared'}`);
    }

    /**
     * Retrieves the inclusion regex pattern for file management from the configuration.
     * 
     * @returns The inclusion regex pattern, or null/undefined if not set.
     */
    public getInclusionRegex(): string | null | undefined {
        const inclusionRegex = this.configurationStateManager.getConfig<string>(ConfigKeys.FileInclusionRegex);
        this.logger.debug(`Retrieved file inclusion regex: ${inclusionRegex || 'Not set'}`);
        return inclusionRegex;
    }

    /**
     * Retrieves the exclusion regex pattern for file management from the configuration.
     * 
     * @returns The exclusion regex pattern, or null/undefined if not set.
     */
    public getExclusionRegex(): string | null | undefined {
        const exclusionRegex = this.configurationStateManager.getConfig<string>(ConfigKeys.FileExclusionRegex);
        this.logger.debug(`Retrieved file exclusion regex: ${exclusionRegex || 'Not set'}`);
        return exclusionRegex;
    }
}