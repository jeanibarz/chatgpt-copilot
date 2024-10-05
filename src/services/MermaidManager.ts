// src/services/MermaidManager.ts

import { CoreLogger } from '../logging/CoreLogger';
import { StateManager } from '../state/StateManager';

const logger = CoreLogger.getInstance();

export function getMermaidOutputFolder(): string | null | undefined {
    const stateManager = StateManager.getInstance();
    return stateManager.getFileManagementStateManager().getMermaidOutputFolder();
}

export async function setMermaidOutputFolder(folderPath: string): Promise<void> {
    const stateManager = StateManager.getInstance();
    await stateManager.getFileManagementStateManager().setMermaidOutputFolder(folderPath);
    logger.info(`Mermaid output folder set to: ${folderPath}`);
}
