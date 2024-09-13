import { BaseModelNormalizer } from "./BaseModelNormalizer";


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
