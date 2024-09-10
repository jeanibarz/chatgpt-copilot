import { ILogger } from "../interfaces/ILogger";

/**
 * The `BaseModelNormalizer` class serves as an abstract base class for model normalizers.
 * It provides a common interface and shared functionality for normalizing model types.
 * 
 * Subclasses must implement the `normalize` method to define their own normalization logic.
 * This class also provides logging capabilities to track the normalization process.
 */
export abstract class BaseModelNormalizer {
    protected logger: ILogger;

    /**
     * Constructor for the `BaseModelNormalizer` class.
     * Initializes the normalizer with a logger instance for logging normalization events.
     * 
     * @param logger - An instance of ILogger for logging purposes.
     */
    constructor(logger: ILogger) {
        this.logger = logger;
    }

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
