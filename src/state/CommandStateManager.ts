// src/state/CommandStateManager.ts

/**
 * This module manages the state of commands within the Visual Studio Code 
 * environment. It interacts with the global state to store and retrieve 
 * command-related data.
 */

import * as vscode from 'vscode';
import { ConfigKeys } from "../constants/ConfigKeys";
import { CoreLogger } from '../logging/CoreLogger';

/**
 * The CommandStateManager class is responsible for managing the state of 
 * commands in the application. It provides methods to get and set 
 * command-related information in the global state.
 * 
 * Key Features:
 * - Retrieves and updates the prefix for ad-hoc commands.
 * - Sets the enabled state of commands in the context of the application.
 */
export class CommandStateManager {
    private globalState: vscode.Memento;
    private logger: CoreLogger;

    constructor(globalState: vscode.Memento) {
        this.globalState = globalState;
        this.logger = CoreLogger.getInstance();
        this.logger.info('CommandStateManager initialized');
    }

    /**
     * Retrieves the ad-hoc command prefix from the global state.
     * 
     * @returns The ad-hoc command prefix as a string, or null/undefined if not set.
     */
    public getAdhocCommandPrefix(): string | null | undefined {
        const prefix = this.globalState.get<string>(ConfigKeys.AdhocPrompt);
        this.logger.debug(`Retrieved ad-hoc command prefix: ${prefix}`);
        return prefix;
    }

    /**
     * Sets the ad-hoc command prefix in the global state.
     * 
     * @param prefix - The prefix to set for ad-hoc commands.
     * @returns A promise that resolves when the update is complete.
     */
    public async setAdhocCommandPrefix(prefix: string): Promise<void> {
        await this.globalState.update(ConfigKeys.AdhocPrompt, prefix);
        this.logger.info(`Ad-hoc command prefix updated to: ${prefix}`);
    }

    /**
     * Sets the enabled state of a specified command in the context.
     * 
     * @param command - The name of the command to update.
     * @param enabled - A boolean indicating whether the command should be enabled.
     * @returns A promise that resolves when the command state is updated.
     */
    public async setCommandEnabledState(command: string, enabled: boolean): Promise<void> {
        await vscode.commands.executeCommand('setContext', `${command}-enabled`, enabled);
        this.logger.info(`Command '${command}' enabled state set to: ${enabled}`);
    }
}