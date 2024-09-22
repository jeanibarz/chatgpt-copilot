/**
 * src/models/llm_models/ChatModelFactory.ts
 * 
 * This module defines the `ChatModelFactory` class, which is responsible 
 * for creating instances of chat models and managing their normalizers. 
 * It provides functionality to initialize normalizers, create chat models 
 * based on user configuration, and ensure that only valid models are created.
 * 
 * Key Features:
 * - Initializes and manages model normalizers for various AI models.
 * - Creates chat models based on configuration settings.
 * - Ensures that the model factory is properly initialized before use.
 */

import { GeminiModel, OpenAIModel } from ".";
import { ModelConfig } from "../../config/ModelConfig";
import { IChatModel } from '../../interfaces/IChatModel';
import { CoreLogger } from "../../logging/CoreLogger";
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { AnthropicNormalizer } from "../normalizers/AnthropicNormalizer";
import { BaseModelNormalizer } from "../normalizers/BaseModelNormalizer";
import { GeminiNormalizer } from "../normalizers/GeminiNormalizer";
import { OpenAINormalizer } from "../normalizers/OpenAINormalizer";
import { AnthropicChatModel } from './AnthropicChatModel';
import { ModelNormalizerRegistry } from "./ModelNormalizerRegistry";

/**
 * The `ChatModelFactory` class is responsible for creating instances of chat models
 * and managing model normalizers. It provides methods to initialize normalizers,
 * create chat models based on configuration, and register custom normalizers.
 * 
 * Key Features:
 * - Creates and initializes chat models based on user configuration.
 * - Manages the lifecycle of model normalizers for different AI models.
 * - Ensures that only valid models are created based on the provided configuration.
 */
export class ChatModelFactory {
    private static normalizerRegistry: ModelNormalizerRegistry;

    /**
     * Initializes the normalizer registry and registers default normalizers.
     * Logs the initialization status.
     * 
     * This method should be called before any chat models are created to ensure
     * that the normalizers are available for use.
     */
    static initialize() {
        const logger = CoreLogger.getInstance();

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

    /**
     * Creates a chat model based on the provided view provider and configuration.
     * 
     * @param chatGptViewProvider - The provider for managing chat models.
     * @param modelConfig - Configuration settings for the chat model.
     * @returns A promise that resolves to an instance of IChatModel.
     * @throws Error if the model type is unsupported or if initialization fails.
     */
    static async createChatModel(chatGptViewProvider: ChatGptViewProvider, modelConfig: ModelConfig): Promise<IChatModel> {
        const logger = CoreLogger.getInstance();
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
                    logger.info("Creating OpenAI model...");
                    const openAIModel = await new OpenAIModel().initModel(chatGptViewProvider, modelConfig);
                    logger.info("OpenAI model created successfully");
                    return openAIModel;
                case 'gemini':
                    logger.info("Creating Gemini model...");
                    const geminiModel = await new GeminiModel().initModel(chatGptViewProvider, modelConfig);
                    logger.info("Gemini model created successfully");
                    return geminiModel;
                case 'anthropic':
                    logger.info("Creating Anthropic model...");
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

    /**
     * Registers a custom normalizer to the normalizer registry.
     * 
     * @param normalizer - The normalizer to register.
     * @throws Error if the normalizer registry is not initialized.
     */
    static registerNormalizer(normalizer: BaseModelNormalizer) {
        if (!this.normalizerRegistry) {
            throw new Error("ModelNormalizerRegistry is not initialized. Call ChatModelFactory.initialize() first.");
        }
        this.normalizerRegistry.register(normalizer);
    }
}

// Initialize the factory
ChatModelFactory.initialize();