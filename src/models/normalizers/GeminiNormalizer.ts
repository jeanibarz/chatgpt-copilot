import { BaseModelNormalizer } from "./BaseModelNormalizer";

/**
 * Normalizer class for Gemini models.
 * This class extends the `BaseModelNormalizer` and implements normalization logic
 * specific to Gemini models, particularly those prefixed with 'gemini-'.
 */

export class GeminiNormalizer extends BaseModelNormalizer {
    /**
     * Normalizes the given model type to 'gemini' if it starts with 'gemini-'.
     *
     * @param modelType - The type of the model as a string.
     * @returns 'gemini' if the model type is valid; otherwise, null.
     */
    normalize(modelType: string): string | null {
        if (modelType.startsWith('gemini-')) {
            this.logNormalization(modelType, 'gemini');
            return 'gemini';
        }
        this.logNormalization(modelType, null);
        return null;
    }
}
