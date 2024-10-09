// src/state/UserPreferencesStateManager.ts

/**
 * This module manages user preferences for the extension, including settings 
 * related to auto-scrolling, notifications, and conversation history.
 */

import * as vscode from 'vscode';
import { ConfigKeys, ExtensionConfigPrefix } from "../constants/ConfigKeys";
import { CoreLogger } from '../logging/CoreLogger';

export class UserPreferencesStateManager {
    private logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance();
        this.logger.info('UserPreferencesStateManager: Initialized');
    }

    /**
     * Retrieves the setting for auto-scrolling.
     * When true, the view auto-scrolls when a model generates a response.
     * 
     * @returns A boolean indicating whether auto-scrolling is enabled.
     */
    public getAutoScrollSetting(): boolean {
        const autoScroll = !!vscode.workspace.getConfiguration(ExtensionConfigPrefix).get<boolean>(ConfigKeys.AutoScroll);
        this.logger.debug(`UserPreferencesStateManager: Auto-scroll setting retrieved - ${autoScroll}`);
        return autoScroll;
    }

    /**
     * Retrieves the setting for showing notifications.
     * When true, a notification is shown upon task completion.
     * 
     * @returns A boolean indicating whether notifications are enabled, or null/undefined if not set.
     */
    public getShowNotification(): boolean | null | undefined {
        const showNotification = vscode.workspace.getConfiguration(ExtensionConfigPrefix).get<boolean>(ConfigKeys.ShowNotification);
        this.logger.debug(`UserPreferencesStateManager: Show notification setting retrieved - ${showNotification}`);
        return showNotification;
    }

    /**
     * Retrieves the setting for enabling conversation history.
     * 
     * @returns A boolean indicating whether conversation history is enabled, or null/undefined if not set.
     */
    public getConversationHistoryEnabled(): boolean | null | undefined {
        const conversationHistoryEnabled = vscode.workspace.getConfiguration(ExtensionConfigPrefix).get<boolean>(ConfigKeys.ConversationHistoryEnabled);
        this.logger.debug(`UserPreferencesStateManager: Conversation history enabled setting retrieved - ${conversationHistoryEnabled}`);
        return conversationHistoryEnabled;
    }
}