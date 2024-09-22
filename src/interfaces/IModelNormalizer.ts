/**
 * Interface defining the contract for model normalizers.
 * It requires the implementation of a method to normalize model types.
 */
export interface IModelNormalizer {
    /**
     * Normalizes the given model type to a standard representation.
     *
     * @param modelType - The type of the model as a string.
     * @returns A normalized model type string or null if it cannot be normalized.
     */
    normalize(modelType: string): string | null;
}