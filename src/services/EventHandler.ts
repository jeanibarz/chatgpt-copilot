// src/services/EventHandler.ts

/**
 * This module handles events related to file changes and triggers necessary 
 * callbacks. It integrates with the ExplicitFilesManager to monitor file 
 * changes and utilizes a logger for event logging.
 */

import { inject } from 'inversify';
import TYPES from "../inversify.types";
import { CoreLogger } from '../logging/CoreLogger';
import { Utility } from '../Utility';
import { ExplicitFilesManager } from './ExplicitFilesManager';

/**
 * The EventHandler class is responsible for managing events related to file 
 * changes. It utilizes the ExplicitFilesManager to monitor changes and 
 * triggers callbacks when changes occur.
 * 
 * Key Features:
 * - Monitors file changes using ExplicitFilesManager.
 * - Utilizes a debounced mechanism to handle frequent file changes efficiently.
 */
export class EventHandler {
    private logger: CoreLogger = CoreLogger.getInstance();

    constructor(
        @inject(TYPES.ExplicitFilesManager) private explicitFilesManager: ExplicitFilesManager,
        private onChangeCallback: () => void
    ) { }

    /**
     * Initializes event subscriptions for monitoring file changes.
     * It sets up a debounced refresh mechanism that triggers the provided 
     * callback when file changes are detected.
     * 
     * @returns {void} This method does not return a value.
     */
    initialize(): void {
        const debouncedRefresh = Utility.debounce(() => {
            this.logger.info('Debounced refresh triggered.');
            this.onChangeCallback();
            // Additional logic if needed
        }, 1000);

        this.explicitFilesManager.onDidChangeFiles(() => {
            this.logger.info('Explicit files changed. Triggering debounced refresh.');
            debouncedRefresh();
        });
    }
}