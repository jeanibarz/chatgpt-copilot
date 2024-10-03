// src/models/llm_models/ChatModelFactory.ts

/**
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

import { injectable } from "inversify";
import { GeminiModel, OpenAIModelFactory } from ".";
import { getConfig } from "../../config/Configuration";
import { IChatModel } from '../../interfaces/IChatModel';
import { container } from "../../inversify.config";
import TYPES from "../../inversify.types";
import { CoreLogger } from "../../logging/CoreLogger";
import { ModelManager } from "../../services/ModelManager";
import { AnthropicNormalizer } from "../normalizers/AnthropicNormalizer";
import { BaseModelNormalizer } from "../normalizers/BaseModelNormalizer";
import { GeminiNormalizer } from "../normalizers/GeminiNormalizer";
import { OpenAINormalizer } from "../normalizers/OpenAINormalizer";
import { AnthropicChatModel } from './AnthropicChatModel';
import { ModelNormalizerRegistry } from "./ModelNormalizerRegistry";
import { OpenAIModelInitializer } from "./OpenAIModelInitializer";

@injectable()
export class ChatModelFactory {
    private static normalizerRegistry: ModelNormalizerRegistry;
    private static logger = CoreLogger.getInstance();

    /**
     * Initializes the normalizer registry and registers default normalizers.
     * Logs the initialization status.
     * 
     * This method should be called before any chat models are created to ensure
     * that the normalizers are available for use.
     */
    static initialize() {
        if (!this.normalizerRegistry) {
            this.normalizerRegistry = new ModelNormalizerRegistry();

            // Register default normalizers
            this.normalizerRegistry.register(new OpenAINormalizer());
            this.normalizerRegistry.register(new GeminiNormalizer());
            this.normalizerRegistry.register(new AnthropicNormalizer());
        }

        ChatModelFactory.logger.info("ChatModelFactory initialized with normalizers.");
    }

    /**
     * Creates a chat model based on the provided configuration and modelManager.
     * 
     * @returns A promise that resolves to an instance of IChatModel.
     * @throws Error if the model type is unsupported or if initialization fails.
     */
    static async createChatModel(): Promise<IChatModel> {
        ChatModelFactory.logger.info("Entering createChatModel");

        const modelManager = container.get<ModelManager>(TYPES.ModelManager);

        await modelManager.prepareModelForConversation(false);

        try {
            // const model = this.modelManager.model as string; // Get the model type
            const model = getConfig('model');
            const modelType = ChatModelFactory.normalizerRegistry.normalize(model);

            if (!ChatModelFactory.normalizerRegistry) {
                throw new Error("ModelNormalizerRegistry is not initialized. Call ChatModelFactory.initialize() first.");
            }

            ChatModelFactory.logger.info(`Creating model with type: ${modelType}`);

            switch (modelType) {
                case 'openai':
                    ChatModelFactory.logger.info("Creating OpenAI model...");

                    // InversifyJS will inject dependencies into OpenAIModel
                    const chatModel = await OpenAIModelInitializer.initialize(modelManager);
                    if (!chatModel) {
                        const error_msg = 'Creation failed: model initialization failed';
                        ChatModelFactory.logger.error(error_msg);
                        throw new Error(error_msg);
                    }

                    // Use the container to resolve OpenAIModel
                    const openAIModelFactory = container.get<OpenAIModelFactory>(TYPES.OpenAIModelFactory);
                    const openAIModel = openAIModelFactory.create(chatModel);
                    ChatModelFactory.logger.info("OpenAI model created successfully");
                    return openAIModel;

                case 'gemini':
                    ChatModelFactory.logger.info("Creating Gemini model...");
                    const geminiModel = await new GeminiModel().initModel(modelManager.modelConfig);
                    ChatModelFactory.logger.info("Gemini model created successfully");
                    return geminiModel;

                case 'anthropic':
                    ChatModelFactory.logger.info("Creating Anthropic model...");
                    return new AnthropicChatModel();

                default:
                    ChatModelFactory.logger.error(`Unsupported model type: ${modelType}`);
                    throw new Error(`Unsupported model type: ${modelType}`);
            }
        } catch (error: any) {
            ChatModelFactory.logger.error("Failed to create chat model", { error: error.message, stack: error.stack });
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