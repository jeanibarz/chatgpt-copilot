import { BaseModelNormalizer } from "../base/BaseModelNormalizer";

export interface IModelNormalizer {
    normalize(modelType: string): string | null;
}

export class OpenAINormalizer extends BaseModelNormalizer {
    normalize(modelType: string): string | null {
        if (modelType.startsWith('gpt-')) {
            this.logNormalization(modelType, 'openai');
            return 'openai';
        }
        this.logNormalization(modelType, null);
        return null;
    }
}

export class GeminiNormalizer extends BaseModelNormalizer {
    normalize(modelType: string): string | null {
        if (modelType.startsWith('gemini-')) {
            this.logNormalization(modelType, 'gemini');
            return 'gemini';
        }
        this.logNormalization(modelType, null);
        return null;
    }
}

export class AnthropicNormalizer extends BaseModelNormalizer {
    normalize(modelType: string): string | null {
        if (modelType.startsWith('claude-')) {
            this.logNormalization(modelType, 'anthropic');
            return 'anthropic';
        }
        this.logNormalization(modelType, null);
        return null;
    }
}