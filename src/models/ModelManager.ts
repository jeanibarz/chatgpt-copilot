// src/services/ModelManager.ts

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

import { inject, injectable } from "inversify";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { ChatModelFactory, GeminiModel } from "../models/llm_models";
import { initClaudeModel } from '../models/llm_models/Anthropic';
import { initGptLegacyModel } from '../models/llm_models/OpenAI-legacy';
import { getApiKey } from "../services/ApiKeyManager";
import { ConfigurationManager } from '../services/ConfigurationManager';
import { StateManager } from "../state/StateManager";
import { ModelConfig } from "./ModelConfig";

@injectable()
export class ModelManager {
    private logger: CoreLogger = CoreLogger.getInstance();
    public model: string | undefined | null; // The currently selected model
    public modelConfig!: ModelConfig; // Configuration settings for the model

    constructor(
        @inject(TYPES.ConfigurationManager) private configurationManager: ConfigurationManager,
    ) { }

    /**
     * Prepares the selected AI model for conversation.
     * Loads configuration settings, retrieves the API key, and initializes the model 
     * based on the user's settings.
     * 
     * @param modelChanged - A flag indicating if the model has changed.
     * @returns A promise that resolves to true if the model is successfully prepared; otherwise, false.
     */
    public async prepareModelForConversation(modelChanged = false): Promise<boolean> {
        this.logger.info("loading configuration from vscode workspace");

        const stateManager = StateManager.getInstance();

        if (this.model === "custom") {
            this.logger.info("custom model, retrieving model name");
            this.model = stateManager.getModelConfigStateManager().getCustomModelName();
        }

        // Check if a new model needs to be initialized based on configuration or if the model has changed
        // if (
        //     (this.isGpt35Model && !this.configurationManager.isApiChatInitialized()) ||
        //     (this.isClaude && !this.configurationManager.isApiChatInitialized()) ||
        //     (this.isGemini && !this.configurationManager.isApiChatInitialized()) ||
        //     (!this.isGpt35Model && !this.isClaude && !this.isGemini && !this.configurationManager.isApiCompletionInitialized()) ||
        //     modelChanged
        // ) {
        if (true) {
            this.logger.info("getting API key");
            let apiKey = await getApiKey();
            if (!apiKey) {
                this.logger.info("API key not found, prepare model for conversation returning false");
                return false; // Exit if API key is not obtained
            }

            this.logger.info("retrieving model configuration values: organization, maxTokens, temperature, and topP");

            // let systemPrompt = stateManager.getPrompt(PromptType.FreeQuestion)getSystemPrompt();
            // this.logger.info("retrieving system prompt");
            // if (!systemPrompt) {
            //     this.logger.info("no systemPrompt found, using default system prompt");
            //     systemPrompt = stateManager.getDefaultSystemPrompt();
            // }



            this.logger.info("instantiating model config");
            this.modelConfig = new ModelConfig(
                apiKey,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined
            );

            this.logger.info("initializing model");
            // await this.initModels();
        }

        return true;
    }

    /**
     * Initializes the appropriate model based on the current configuration.
     * 
     * This method checks the current model settings and initializes the corresponding
     * model (e.g., GPT, Claude, Gemini) based on the configuration provided by the user.
     * It ensures that the model is ready for use in chat interactions.
     */
    private async initModels(): Promise<void> {
        if (this.isGpt35Model) {
            const model = await ChatModelFactory.createChatModel();
        } else if (this.isClaude) {
            await initClaudeModel(this.modelConfig);
        } else if (this.isGemini) {
            const model = new GeminiModel();
            model.initModel(this.modelConfig);
        } else {
            initGptLegacyModel(this.modelConfig);
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
