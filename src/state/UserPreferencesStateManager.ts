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
    }

    /**
     * Retrieves the setting for auto-scrolling.
     * When true, the view auto-scrolls when a model generates a response.
     * 
     * @returns A boolean indicating whether auto-scrolling is enabled.
     */
    public getAutoScrollSetting(): boolean {
        return !!vscode.workspace.getConfiguration(ExtensionConfigPrefix).get<boolean>(ConfigKeys.AutoScroll);
    }

    /**
     * Retrieves the setting for showing notifications.
     * When true, a notification is shown upon task completion.
     * 
     * @returns A boolean indicating whether notifications are enabled, or null/undefined if not set.
     */
    public getShowNotification(): boolean | null | undefined {
        return vscode.workspace.getConfiguration(ExtensionConfigPrefix).get<boolean>(ConfigKeys.ShowNotification);
    }

    /**
     * Retrieves the setting for enabling conversation history.
     * 
     * @returns A boolean indicating whether conversation history is enabled, or null/undefined if not set.
     */
    public getConversationHistoryEnabled(): boolean | null | undefined {
        return vscode.workspace.getConfiguration(ExtensionConfigPrefix).get<boolean>(ConfigKeys.ConversationHistoryEnabled);
    }
}