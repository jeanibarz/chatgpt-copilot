// src/state/SessionStateManager.ts

/**
 * This module manages session state for the application, facilitating 
 * the storage and retrieval of session-related tokens and user agent 
 * information using the VSCode Memento API.
 */

import * as vscode from 'vscode';
import { ConfigKeys } from "../constants/ConfigKeys";
import { CoreLogger } from '../logging/CoreLogger';

/**
 * The SessionStateManager class is responsible for managing session 
 * tokens and user agent information in a persistent manner using 
 * VSCode's Memento API.
 * 
 * Key Features:
 * - Stores and retrieves session tokens and user agent details.
 * - Utilizes CoreLogger for logging operations.
 */
export class SessionStateManager {
    private logger: CoreLogger;
    private globalState: vscode.Memento;

    constructor(globalState: vscode.Memento) {
        this.logger = CoreLogger.getInstance();
        this.globalState = globalState;
    }

    /**
     * Retrieves the session token from the global state.
     * 
     * @returns The session token as a string, or null/undefined if not set.
     */
    public getSessionToken(): string | null | undefined {
        return this.globalState.get<string>(ConfigKeys.SessionToken);
    }

    /**
     * Sets the session token in the global state.
     * 
     * @param token - The session token to be stored, or null to clear it.
     */
    public async setSessionToken(token: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.SessionToken, token);
    }

    /**
     * Retrieves the clearance token from the global state.
     * 
     * @returns The clearance token as a string, or null/undefined if not set.
     */
    public getClearanceToken(): string | null | undefined {
        return this.globalState.get<string>(ConfigKeys.ClearanceToken);
    }

    /**
     * Sets the clearance token in the global state.
     * 
     * @param token - The clearance token to be stored, or null to clear it.
     */
    public async setClearanceToken(token: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.ClearanceToken, token);
    }

    /**
     * Retrieves the user agent from the global state.
     * 
     * @returns The user agent as a string, or null/undefined if not set.
     */
    public getUserAgent(): string | null | undefined {
        return this.globalState.get<string>(ConfigKeys.UserAgent);
    }

    /**
     * Sets the user agent in the global state.
     * 
     * @param agent - The user agent to be stored, or null to clear it.
     */
    public async setUserAgent(agent: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.UserAgent, agent);
    }
}