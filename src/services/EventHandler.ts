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

export class EventHandler {
    private logger = CoreLogger.getInstance();

    constructor(
        @inject(TYPES.ExplicitFilesManager) private explicitFilesManager: ExplicitFilesManager,
        @inject(TYPES.CoreLogger) logger: CoreLogger,
        private onChangeCallback: () => void
    ) {
        this.logger = logger;
    }

    /**
     * Initializes event subscriptions for monitoring file changes.
     * It sets up a debounced refresh mechanism that triggers the provided 
     * callback when file changes are detected.
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