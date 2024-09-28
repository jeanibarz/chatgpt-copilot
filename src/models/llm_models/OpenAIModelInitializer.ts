import { createAzure } from '@ai-sdk/azure';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';
import { CoreLogger } from '../../logging/CoreLogger';
import { ModelManager } from '../../services';

export class OpenAIModelInitializer {
    static logger = CoreLogger.getInstance();

    public static async initialize(modelManager: ModelManager): Promise<LanguageModel | undefined> {
        if (modelManager.modelConfig.apiBaseUrl.includes("azure")) {
            OpenAIModelInitializer.logger.info('Initializing Azure model...');
            return await this.initializeAzureModel(modelManager);
        } else {
            this.logger.info('Initializing OpenAI model...');
            return await this.initializeOpenAIModel(modelManager);
        }
    }

    private static async initializeAzureModel(modelManager: ModelManager): Promise<LanguageModel | undefined> {
        const instanceName = modelManager.modelConfig.apiBaseUrl.split(".")[0].split("//")[1];
        const deployName = modelManager.modelConfig.apiBaseUrl.split("/").pop();

        modelManager.model = deployName;
        if (!deployName) {
            OpenAIModelInitializer.logger.warn(`Can't initialize Azure model because deployName is undefined`);
            return;
        }

        const azure = createAzure({
            resourceName: instanceName,
            apiKey: modelManager.modelConfig.apiKey,
        });
        return azure.chat(deployName);
    }

    private static async initializeOpenAIModel(modelManager: ModelManager): Promise<LanguageModel> {
        const openai = createOpenAI({
            baseURL: modelManager.modelConfig.apiBaseUrl,
            apiKey: modelManager.modelConfig.apiKey,
            organization: modelManager.modelConfig.organization,
        });
        const modelName = modelManager.model || "gpt-4o";
        return openai.chat(modelName);
    }

}
