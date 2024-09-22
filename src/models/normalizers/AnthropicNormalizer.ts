import { BaseModelNormalizer } from "./BaseModelNormalizer";

/**
 * Normalizer class for Anthropic models.
 * This class extends the `BaseModelNormalizer` and implements normalization logic
 * specific to Anthropic models, particularly those prefixed with 'claude-'.
 */

export class AnthropicNormalizer extends BaseModelNormalizer {
    /**
     * Normalizes the given model type to 'anthropic' if it starts with 'claude-'.
     *
     * @param modelType - The type of the model as a string.
     * @returns 'anthropic' if the model type is valid; otherwise, null.
     */
    normalize(modelType: string): string | null {
        if (modelType.startsWith('claude-')) {
            this.logNormalization(modelType, 'anthropic');
            return 'anthropic';
        }
        this.logNormalization(modelType, null);
        return null;
    }
}
