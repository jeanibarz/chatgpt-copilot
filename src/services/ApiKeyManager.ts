// src/services/ApiKeyManager.ts

import { CoreLogger } from '../logging/CoreLogger';
import { StateManager } from '../state/StateManager';
import { promptForApiKey } from './UserPrompts';

const logger = CoreLogger.getInstance();

export async function getApiKey(): Promise<string | undefined> {
    logger.info('Attempting to retrieve API key');
    const stateManager = StateManager.getInstance();
    let apiKey = stateManager.getApiCredentialsStateManager().getApiKey();

    if (!apiKey) {
        logger.info('API key not found in state, prompting user for input');
        apiKey = await promptForApiKey();
        if (apiKey) {
            logger.info('API key provided by user, saving to state');
            await stateManager.getApiCredentialsStateManager().setApiKey(apiKey);
        } else {
            logger.error('User failed to provide a valid API key');
            throw new Error(`Can't proceed without a valid API key`);
        }
    } else {
        logger.info('API key successfully retrieved from state');
    }

    logger.debug('Returning API key (length: ' + apiKey.length + ')');
    return apiKey;
}
