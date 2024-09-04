// src/base/baseHandler.ts
import { IHandler } from "../interfaces/IHandler";
import { ILogger } from "../interfaces/ILogger";
import { logError } from "../utils/errorLogger";

export abstract class BaseHandler<T> implements IHandler<T> {
    protected logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    public abstract execute(data: T): Promise<void>;

    /**
     * Handles an error by logging it using the logger instance.
     * 
     * @param error - The error object to log.
     */
    protected handleError(error: any): void {
        logError(this.logger, error, "BaseHandler");
    }
}
