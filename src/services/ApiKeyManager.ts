// src/services/ApiKeyManager.ts

import { CoreLogger } from '../logging/CoreLogger';
import { StateManager } from '../state/StateManager';
import { promptForApiKey } from './UserPrompts';

const logger = CoreLogger.getInstance();

export async function getApiKey(): Promise<string | undefined> {
    const stateManager = StateManager.getInstance();
    let apiKey = stateManager.getApiCredentialsStateManager().getApiKey();

    if (!apiKey) {
        apiKey = await promptForApiKey();
        if (apiKey) {
            await stateManager.getApiCredentialsStateManager().setApiKey(apiKey);
        } else {
            throw new Error(`Can't proceed without a valid API key`);
        }
    }

    return apiKey;
}
