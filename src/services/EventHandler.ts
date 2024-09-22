// src/services/EventHandler.ts

import { CoreLogger } from '../logging/CoreLogger';
import { Utility } from '../Utility';
import { ExplicitFilesManager } from './ExplicitFilesManager';

export class EventHandler {
    private logger = CoreLogger.getInstance();

    constructor(
        private explicitFilesManager: ExplicitFilesManager,
        private onChangeCallback: () => void
    ) { }

    /**
     * Initializes event subscriptions.
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
