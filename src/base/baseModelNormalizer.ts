// src/base/baseModelNormalizer.ts
import { ILogger } from "../interfaces/ILogger";
import { LogLevel } from "../logger";

export abstract class BaseModelNormalizer {
    protected logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    public abstract normalize(modelType: string): string | null;

    protected logNormalization(modelType: string, normalizedType: string | null): void {
        if (normalizedType) {
            this.logger.log(LogLevel.Info, `Normalized model type: ${modelType} to ${normalizedType}`);
        } else {
            this.logger.log(LogLevel.Warning, `No normalization found for model type: ${modelType}`);
        }
    }
}
