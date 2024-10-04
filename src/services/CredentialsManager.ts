// src/services/CredentialsManager.ts

import { CoreLogger } from '../logging/CoreLogger';
import { StateManager } from '../state/StateManager';
import { promptForJsonCredentialsPath } from './UserPrompts';

const logger = CoreLogger.getInstance();

export async function getJsonCredentialsPath(): Promise<string> {
    const stateManager = StateManager.getInstance();
    let jsonCredentialsPath = stateManager.getJsonCredentialsPath();

    if (!jsonCredentialsPath) {
        jsonCredentialsPath = await promptForJsonCredentialsPath();
        await stateManager.setJsonCredentialsPath(jsonCredentialsPath);
        logger.info(`JSON credentials path set to: ${jsonCredentialsPath}`);
    }

    return jsonCredentialsPath;
}
