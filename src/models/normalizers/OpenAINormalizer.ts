import { ILogger } from "../../interfaces";
import { BaseModelNormalizer } from "./BaseModelNormalizer";

/**
 * Normalizer class for OpenAI models.
 * This class extends the `BaseModelNormalizer` and implements normalization logic
 * specific to OpenAI models, particularly those prefixed with 'gpt-'.
 */

export class OpenAINormalizer extends BaseModelNormalizer {
    constructor(logger: ILogger) {
        super(logger); // Call the superclass constructor
    }

    /**
     * Normalizes the given model type to 'openai' if it starts with 'gpt-'.
     *
     * @param modelType - The type of the model as a string.
     * @returns 'openai' if the model type is valid; otherwise, null.
     */
    normalize(modelType: string): string | null {
        if (modelType.startsWith('gpt-')) {
            this.logNormalization(modelType, 'openai');
            return 'openai';
        }
        this.logNormalization(modelType, null);
        return null;
    }
}
