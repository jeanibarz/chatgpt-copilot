// src/interfaces/ILogger.ts

import { LogLevel } from "../logger";

export interface ILogger {
    log(level: LogLevel, message: string, properties?: any): void;
    info(message: string, properties?: any): void;
    warning(message: string, properties?: any): void;
    debug(message: string, properties?: any): void;
    error(message: string, properties?: any): void;
    logError(error: any, context: string, showUserMessage?: boolean): void;
}