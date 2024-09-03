// src/utils/errorLogger.ts
import * as vscode from "vscode";
import { ILogger } from "../interfaces/ILogger";
import { LogLevel } from "../logger";

export function logError(logger: ILogger, error: any, context: string, showUserMessage: boolean = false): void {
    const message = error instanceof Error ? error.message : String(error);
    logger.log(LogLevel.Error, `Error in ${context}: ${message}`);

    if (showUserMessage) {
        vscode.window.showErrorMessage(`Error in ${context}: ${message}`);
    }
}
