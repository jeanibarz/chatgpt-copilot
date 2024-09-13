import { BaseModelNormalizer } from "./BaseModelNormalizer";


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
