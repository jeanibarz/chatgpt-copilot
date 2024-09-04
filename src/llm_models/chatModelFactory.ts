// src/models/ChatModelFactory.ts
import { BaseModelNormalizer } from "../base/baseModelNormalizer";
import { ChatGptViewProvider } from '../chatgptViewProvider';
import { Logger } from "../logger";
import { ModelConfig } from "../model-config";
import { AnthropicChatModel } from './anthropicChatModel';
import { GeminiChatModel } from './geminiChatModel';
import { IChatModel } from './IChatModel';
import { AnthropicNormalizer, GeminiNormalizer, OpenAINormalizer } from "./modelNormalizer";
import { ModelNormalizerRegistry } from "./modelNormalizerRegistry";
import { initGptModel } from "./openai";

export class ChatModelFactory {
    private static normalizerRegistry: ModelNormalizerRegistry;

    static initialize() {
        const logger = Logger.getInstance();

        // Initialize the normalizer registry if it's not already done
        if (!this.normalizerRegistry) {
            this.normalizerRegistry = new ModelNormalizerRegistry(logger);

            // Register default normalizers
            this.normalizerRegistry.register(new OpenAINormalizer(logger));
            this.normalizerRegistry.register(new GeminiNormalizer(logger));
            this.normalizerRegistry.register(new AnthropicNormalizer(logger));
        }

        logger.info("ChatModelFactory initialized with normalizers.");
    }

    static async createChatModel(chatGptViewProvider: ChatGptViewProvider, modelConfig: ModelConfig): Promise<IChatModel> {
        const logger = Logger.getInstance();
        logger.info("Entering createChatModel");

        try {
            const model = chatGptViewProvider.modelManager.model as string; // Get the model type from the provider's model manager

            // Normalize or map specific model names to their general types
            const modelType = this.normalizerRegistry.normalize(model);

            // Ensure the normalizer registry is initialized
            if (!this.normalizerRegistry) {
                throw new Error("ModelNormalizerRegistry is not initialized. Call ChatModelFactory.initialize() first.");
            }

            logger.info(`Entering createChatModel with modelType: ${modelType}`);

            switch (modelType) {
                case 'openai':
                    logger.info("Initializing OpenAI model...");
                    const openAIModel = await initGptModel(chatGptViewProvider, modelConfig);
                    logger.info("OpenAI model initialized successfully");
                    return openAIModel;
                case 'gemini':
                    logger.info("Initializing Gemini model...");
                    return new GeminiChatModel(chatGptViewProvider);
                case 'anthropic':
                    logger.info("Initializing Anthropic model...");
                    return new AnthropicChatModel(chatGptViewProvider);
                default:
                    logger.error(`Unsupported model type: ${modelType}`);
                    throw new Error(`Unsupported model type: ${modelType}`);
            }
        } catch (error: any) {
            logger.error("Failed to create chat model", { error: error.message, stack: error.stack });
            throw error;
        }
    }

    // Method to register custom normalizers
    static registerNormalizer(normalizer: BaseModelNormalizer) {
        if (!this.normalizerRegistry) {
            throw new Error("ModelNormalizerRegistry is not initialized. Call ChatModelFactory.initialize() first.");
        }
        this.normalizerRegistry.register(normalizer);
    }
}

ChatModelFactory.initialize();
