// src/modelManager.ts

import { ChatGptViewProvider } from './chatgptViewProvider';
import { defaultSystemPrompt, getApiKey } from "./config/configuration";
import { initClaudeModel } from './llm_models/anthropic';
import { initGeminiModel } from './llm_models/gemini';
import { initGptModel } from './llm_models/openai';
import { initGptLegacyModel } from './llm_models/openai-legacy';
import { LogLevel, Logger } from "./logger";
import { ModelConfig, ModelSource } from "./model-config";

/**
 * The ModelManager class is responsible for managing the AI model configuration 
 * and initializing the appropriate model for conversation based on user settings.
 */
export class ModelManager {
    public model?: string;
    public modelConfig!: ModelConfig;

    constructor() { }

    public async prepareModelForConversation(
        modelChanged = false,
        logger: Logger,
        viewProvider: ChatGptViewProvider,
    ): Promise<boolean> {
        logger.info("loading configuration from vscode workspace");

        const configuration = viewProvider.getWorkspaceConfiguration();

        // Determine which model to use based on configuration
        const modelSource = configuration.get("chatgpt.gpt3.modelSource") as ModelSource;

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

    public get isCodexModel(): boolean {
        if (this.model == null) {
            return false;
        }
        return this.model.includes("instruct") || this.model.includes("code-");
    }

    public get isGpt35Model(): boolean {
        return !this.isCodexModel && !this.isClaude && !this.isGemini;
    }

    public get isClaude(): boolean {
        return !!this.model?.startsWith("claude-");
    }

    public get isGemini(): boolean {
        return !!this.model?.startsWith("gemini-");
    }
}
