/**
 * This module provides functionality to initialize language models 
 * using OpenAI and Azure services. It handles the configuration and 
 * instantiation of the respective models based on the provided 
 * configuration settings.
 */

import { createAzure } from '@ai-sdk/azure';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';
import { CoreLogger } from '../../logging/CoreLogger';
import { StateManager } from "../../state/StateManager";
import { ModelManager } from '../ModelManager';

export class OpenAIModelInitializer {
    static logger = CoreLogger.getInstance();

    /**
     * Initializes a language model based on the provided ModelManager's configuration.
     * 
     * @param modelManager - The ModelManager instance containing model configuration.
     * @returns A promise that resolves to the initialized LanguageModel or undefined if initialization fails.
     */
    public static async initialize(modelManager: ModelManager): Promise<LanguageModel | undefined> {
        const stateManager = StateManager.getInstance();
        const apiBaseUrl = stateManager.getModelConfigStateManager().getApiBaseUrl();
        const apiKey = stateManager.getApiCredentialsStateManager().getApiKey();

        if (apiBaseUrl && apiBaseUrl.includes("azure") && apiKey) {
            OpenAIModelInitializer.logger.info('Initializing Azure model...');
            return await this.initializeAzureModel(modelManager, apiBaseUrl, apiKey);
        } else {
            this.logger.info('Initializing OpenAI model...');
            return await this.initializeOpenAIModel(modelManager);
        }
    }

    /**
     * Initializes the Azure language model using the specified ModelManager.
     * 
     * @param modelManager - The ModelManager instance containing model configuration.
     * @returns A promise that resolves to the initialized LanguageModel or undefined if initialization fails.
     */
    private static async initializeAzureModel(
        modelManager: ModelManager,
        apiBaseUrl: string,
        apiKey: string,
    ): Promise<LanguageModel | undefined> {
        const instanceName = apiBaseUrl.split(".")[0].split("//")[1];
        const deployName = apiBaseUrl.split("/").pop();

        modelManager.model = deployName;
        if (!deployName) {
            OpenAIModelInitializer.logger.warn(`Can't initialize Azure model because deployName is undefined`);
            return;
        }

        const azure = createAzure({
            resourceName: instanceName,
            apiKey: apiKey,
        });
        return azure.chat(deployName);
    }

    /**
     * Initializes the OpenAI language model using the specified ModelManager.
     * 
     * @param modelManager - The ModelManager instance containing model configuration.
     * @returns A promise that resolves to the initialized LanguageModel.
     */
    private static async initializeOpenAIModel(modelManager: ModelManager): Promise<LanguageModel> {
        const stateManager = StateManager.getInstance();
        const modelConfigStateManager = stateManager.getModelConfigStateManager();
        const configurationStateManager = stateManager.getConfigurationStateManager();

        const apiBaseUrl = modelConfigStateManager.getApiBaseUrl() || '';
        const apiKey = stateManager.getApiCredentialsStateManager().getApiKey() || '';
        const organization = modelConfigStateManager.getOrganization() || '';
        const openai = createOpenAI({
            baseURL: apiBaseUrl,
            apiKey: apiKey,
            organization: organization,
        });
        const modelName = configurationStateManager.getConfig<string>('model') || "gpt-4o";
        return openai.chat(modelName);
    }
}