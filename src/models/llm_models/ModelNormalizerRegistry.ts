/**
 * This module provides a registry for managing model normalizers within the ChatGPT VS Code extension.
 * It allows for the registration and execution of different normalizers that can transform or
 * adapt model types for compatibility with various AI models.
 * 
 * The `ModelNormalizerRegistry` class is responsible for storing and managing model normalizers,
 * enabling dynamic normalization of model types based on user-defined settings.
 * 
 * Key Features:
 * - Register and unregister model normalizers.
 * - Normalize model types using registered normalizers.
 * - Provides a mechanism for executing normalization logic with error handling.
 * 
 * Usage:
 * - The `register` method allows you to associate a normalizer with a specific model type.
 * - The `normalize` method applies the appropriate normalization logic based on the model type.
 * - The `execute` method handles any additional logic needed for normalization.
 */

import { BaseHandler } from "../../base/BaseHandler";
import { BaseModelNormalizer } from "../normalizers/BaseModelNormalizer";

export class ModelNormalizerRegistry extends BaseHandler<string> {
    private normalizers: Map<string, BaseModelNormalizer> = new Map();

    /**
     * Constructor for the `ModelNormalizerRegistry` class.
     * 
     * Initializes a new instance of the ModelNormalizerRegistry, setting up the logger
     * for logging events related to model normalization.
     * 
     * @param logger - An instance of `ILogger` for logging events.
     */
    constructor() {
        super(); // Pass the logger to the base class
    }

    /**
     * Registers a new model normalizer in the registry.
     * 
     * This method adds the provided normalizer to the internal map of normalizers,
     * allowing it to be used for normalizing model types.
     * 
     * @param normalizer - An instance of `BaseModelNormalizer` to be registered.
     */
    public register(normalizer: BaseModelNormalizer) {
        this.logger.info("registering new model normalizer...");
        this.normalizers.set(normalizer.constructor.name, normalizer);
    }

    /**
     * Normalizes the specified model type using registered normalizers.
     * 
     * This method iterates through the registered normalizers and applies the
     * normalization logic to the provided model type. If a normalizer returns a
     * result, that result is returned; otherwise, the original model type is returned.
     * 
     * @param modelType - The model type to be normalized.
     * @returns The normalized model type, or the original model type if no normalizer matched.
     */
    public normalize(modelType: string): string {
        for (const normalizer of this.normalizers.values()) {
            const result = normalizer.normalize(modelType);
            if (result) {
                return result;
            }
        }
        return modelType; // Fallback if no normalizer matched
    }

    /**
     * Executes the normalization logic for the specified model type.
     * 
     * This method can contain additional logic related to normalization, such as
     * logging or error handling. It is designed to be called when normalization
     * is required for a specific model type.
     * 
     * @param modelType - The model type for which to execute normalization logic.
     * @returns A promise that resolves when the execution is complete.
     * @throws An error if normalization execution fails.
     */
    public async execute(modelType: string): Promise<void> {
        try {
            console.log('bou !!!');
            // Normalization logic here, if needed
        } catch (error) {
            this.handleError(error);
        }
    }
}