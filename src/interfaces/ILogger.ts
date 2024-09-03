// src/interfaces/ILogger.ts

import { LogLevel } from "../logger";

export interface ILogger {
    log(level: LogLevel, message: string, properties?: any): void;
}