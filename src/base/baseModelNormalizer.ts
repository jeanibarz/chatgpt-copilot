// src/base/baseModelNormalizer.ts
import { ILogger } from "../interfaces/ILogger";

export abstract class BaseModelNormalizer {
    protected logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    public abstract normalize(modelType: string): string | null;

    /**
     * Logs the normalization process of a model type.
     * 
     * @param modelType - The original model type before normalization.
     * @param normalizedType - The normalized model type or null if no normalization was found.
     */
    protected logNormalization(modelType: string, normalizedType: string | null): void {
        if (normalizedType) {
            this.logger.info(`Normalized model type: ${modelType} to ${normalizedType}`);
        } else {
            this.logger.warning(`No normalization found for model type: ${modelType}`);
        }
    }
}
