// src/base/baseErrorHandler.ts
import { ILogger } from "../interfaces/ILogger";

export abstract class BaseErrorHandler {
    protected logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    public handleError(error: any, context: string): void {
        this.logger.logError(error, context);
    }
}
