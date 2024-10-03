/**
 * src/base/BaseModelNormalizer.ts
 * 
 * This module provides an abstract base class for model normalizers within the application.
 * The `BaseModelNormalizer` class serves as a foundation for creating specific model normalizers,
 * offering shared functionality and a common interface for normalizing various model types.
 * 
 * Key Features:
 * - Defines a standard interface for normalization through the `normalize` method.
 * - Provides logging capabilities to track the normalization process.
 * - Ensures that subclasses implement their own normalization logic.
 */

import { injectable } from "inversify";
import { CoreLogger } from "../../logging/CoreLogger";

@injectable()
export abstract class BaseModelNormalizer {
    private logger: CoreLogger = CoreLogger.getInstance();

    /**
     * Normalizes the given model type to a standardized format.
     * 
     * @param modelType - The original model type to normalize.
     * @returns The normalized model type as a string, or null if no normalization was found.
     */
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
            this.logger.warn(`No normalization found for model type: ${modelType}`);
        }
    }
}