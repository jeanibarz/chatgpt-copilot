import { BaseModelNormalizer } from "./BaseModelNormalizer";


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
