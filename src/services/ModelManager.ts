/**
 * This module manages the configuration and initialization of AI models 
 * for use within a VS Code extension. It is responsible for loading model 
 * settings from the configuration, preparing the models for conversation, 
 * and initializing the appropriate model based on user-defined settings.
 * 
 * The `ModelManager` class ensures that the correct model is initialized 
 * and ready for use, depending on the user's configuration and the selected 
 * model type. It interacts with various model initialization functions 
 * for different AI models, such as GPT, Claude, and Gemini.
 * 
 * Key Features:
 * - Loads model configuration from the VS Code workspace settings.
 * - Supports multiple AI models, including GPT, Claude, and Gemini.
 * - Handles API key retrieval and model settings initialization.
 * - Provides methods to check the type of model currently in use.
 */

import { defaultSystemPrompt, getApiKey, getRequiredConfig } from "../config/Configuration";
import { ModelConfig } from "../config/ModelConfig";
import { CoreLogger } from "../CoreLogger";
import { initClaudeModel } from '../llm_models/Anthropic';
import { initGeminiModel } from '../llm_models/Gemini';
import { initGptModel } from '../llm_models/OpenAI';
import { initGptLegacyModel } from '../llm_models/OpenAI-legacy';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

/**
 * The ModelManager class is responsible for managing the AI model configuration 
 * and initializing the appropriate model for conversation based on user settings.
 * 
 * Key Features:
 * - Loads model configuration from the VS Code workspace settings.
 * - Supports multiple AI models, including GPT, Claude, and Gemini.
 * - Handles API key retrieval and model settings initialization.
 * - Provides methods to check the type of model currently in use.
 */
export class ModelManager {
    public model?: string; // The currently selected model
    public modelConfig!: ModelConfig; // Configuration settings for the model

    /**
     * Constructor for the `ModelManager` class.
     * Initializes a new instance of the ModelManager.
     */
    constructor() { }

    /**
     * Prepares the selected AI model for conversation.
     * Loads configuration settings, retrieves the API key, and initializes the model 
     * based on the user's settings.
     * 
     * @param modelChanged - A flag indicating if the model has changed.
     * @param logger - An instance of `CoreLogger` for logging events.
     * @param viewProvider - An instance of `ChatGptViewProvider` for accessing workspace settings.
     * @returns A promise that resolves to true if the model is successfully prepared; otherwise, false.
     */
    public async prepareModelForConversation(
        modelChanged = false,
        logger: CoreLogger,
        viewProvider: ChatGptViewProvider,
    ): Promise<boolean> {
        logger.info("loading configuration from vscode workspace");

        const configuration = viewProvider.getWorkspaceConfiguration();

        // Determine which model to use based on configuration
        const modelSource = getRequiredConfig<string>("gpt3.modelSource");

        if (this.model === "custom") {
            logger.info("custom model, retrieving model name");
            this.model = configuration.get("gpt3.customModel") as string;
        }

        if (
            (this.isGpt35Model && !viewProvider.apiChat) ||
            (this.isClaude && !viewProvider.apiChat) ||
            (this.isGemini && !viewProvider.apiChat) ||
            (!this.isGpt35Model && !this.isClaude && !this.isGemini && !viewProvider.apiCompletion) ||
            modelChanged
        ) {
            logger.info("getting API key");
            let apiKey = await getApiKey();
            if (!apiKey) {
                logger.info("API key not found, prepare model for conversation returning false");
                return false; // Exit if API key is not obtained
            }

            logger.info("retrieving model configuration values organization, maxTokens, temperature, and topP");
            const organization = configuration.get("gpt3.organization") as string;
            const maxTokens = configuration.get("gpt3.maxTokens") as number;
            const temperature = configuration.get("gpt3.temperature") as number;
            const topP = configuration.get("gpt3.top_p") as number;

            let systemPrompt = configuration.get("systemPrompt") as string;
            logger.info("retrieving system prompt");
            if (!systemPrompt) {
                logger.info("no systemPrompt found, using default system prompt");
                systemPrompt = defaultSystemPrompt;
            }

            logger.info("retrieving api base url value");
            let apiBaseUrl = configuration.get("gpt3.apiBaseUrl") as string;
            if (!apiBaseUrl && this.isGpt35Model) {
                logger.info("no api base url value found, using default api base url");
                apiBaseUrl = "https://api.openai.com/v1";
            }
            if (!apiBaseUrl || apiBaseUrl === "https://api.openai.com/v1") {
                if (this.isClaude) {
                    logger.info("model is claude and api base url is default, replacing it with claude base url");
                    apiBaseUrl = "https://api.anthropic.com/v1";
                } else if (this.isGemini) {
                    logger.info("model is gemini and api base url is default, replacing it with gemini base url");
                    apiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
                }
            }

            logger.info("instantiating model config");
            this.modelConfig = new ModelConfig({
                apiKey,
                apiBaseUrl,
                maxTokens,
                temperature,
                topP,
                organization,
                systemPrompt,
                modelSource,
            });

            logger.info("initializing model");
            await this.initModels(viewProvider);
        }

        return true;
    }

    /**
    * Initializes the appropriate model based on the current configuration.
    * 
    * This method checks the current model settings and initializes the corresponding
    * model (e.g., GPT, Claude, Gemini) based on the configuration provided by the user.
    * It ensures that the model is ready for use in chat interactions.
    * 
    * @param viewProvider - An instance of `ChatGptViewProvider` for accessing view-related settings.
    */
    private async initModels(viewProvider: ChatGptViewProvider): Promise<void> {
        if (this.isGpt35Model) {
            await initGptModel(viewProvider, this.modelConfig);
        } else if (this.isClaude) {
            await initClaudeModel(viewProvider, this.modelConfig);
        } else if (this.isGemini) {
            await initGeminiModel(viewProvider, this.modelConfig);
        } else {
            initGptLegacyModel(viewProvider, this.modelConfig);
        }
    }

    /**
     * Checks if the currently selected model is a Codex model.
     * 
     * @returns True if the model is a Codex model; otherwise, false.
     */
    public get isCodexModel(): boolean {
        if (this.model == null) {
            return false;
        }
        return this.model.includes("instruct") || this.model.includes("code-");
    }

    /**
     * Checks if the currently selected model is a GPT-3.5 model.
     * 
     * @returns True if the model is a GPT-3.5 model; otherwise, false.
     */
    public get isGpt35Model(): boolean {
        return !this.isCodexModel && !this.isClaude && !this.isGemini;
    }

    /**
     * Checks if the currently selected model is a Claude model.
     * 
     * @returns True if the model is a Claude model; otherwise, false.
     */
    public get isClaude(): boolean {
        return !!this.model?.startsWith("claude-");
    }

    /**
     * Checks if the currently selected model is a Gemini model.
     * 
     * @returns True if the model is a Gemini model; otherwise, false.
     */
    public get isGemini(): boolean {
        return !!this.model?.startsWith("gemini-");
    }
}