// src/services/CredentialsManager.ts

import { CoreLogger } from '../logging/CoreLogger';
import { StateManager } from '../state/StateManager';
import { promptForJsonCredentialsPath } from './UserPrompts';

const logger = CoreLogger.getInstance();

export async function getJsonCredentialsPath(): Promise<string> {
    logger.debug('Attempting to retrieve JSON credentials path');
    const stateManager = StateManager.getInstance();
    let jsonCredentialsPath = stateManager.getApiCredentialsStateManager().getJsonCredentialsPath();

    if (!jsonCredentialsPath) {
        logger.info('JSON credentials path not found in state, prompting user');
        jsonCredentialsPath = await promptForJsonCredentialsPath();
        await stateManager.getApiCredentialsStateManager().setJsonCredentialsPath(jsonCredentialsPath);
        logger.info(`JSON credentials path set and saved to state: ${jsonCredentialsPath}`);
    } else {
        logger.debug(`Retrieved existing JSON credentials path: ${jsonCredentialsPath}`);
    }

    return jsonCredentialsPath;
}
