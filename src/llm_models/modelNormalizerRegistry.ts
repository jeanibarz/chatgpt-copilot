// src/modelNormalizerRegistry.ts
import { BaseHandler } from "../base/baseHandler";
import { BaseModelNormalizer } from "../base/baseModelNormalizer";
import { ILogger } from "../interfaces/ILogger";
import { LogLevel } from "../logger";

export class ModelNormalizerRegistry extends BaseHandler<string> {
    private normalizers: Map<string, BaseModelNormalizer> = new Map();

    constructor(logger: ILogger) {
        super(logger); // Pass the logger to the base class
    }

    public register(normalizer: BaseModelNormalizer) {
        this.logger.log(LogLevel.Info, "registering new model normalizer...");
        this.normalizers.set(normalizer.constructor.name, normalizer);
    }

    public normalize(modelType: string): string {
        for (const normalizer of this.normalizers.values()) {
            const result = normalizer.normalize(modelType);
            if (result) {
                return result;
            }
        }
        return modelType; // Fallback if no normalizer matched
    }

    public async execute(modelType: string): Promise<void> {
        try {
            // Normalization logic here, if needed
        } catch (error) {
            this.handleError(error);
        }
    }
}