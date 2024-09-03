// src/base/baseErrorHandler.ts
import { ILogger } from "../interfaces/ILogger";
import { logError } from "../utils/errorLogger";

export abstract class BaseErrorHandler {
    protected logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    public handleError(error: any, context: string): void {
        logError(this.logger, error, context); // Use the centralized logging function
    }
}
