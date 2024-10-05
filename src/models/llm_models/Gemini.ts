/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/naming-convention */
/**
 * @author Pengfei Ni
 *
 * @license
 * Copyright (c) 2024 - Present, Pengfei Ni
 *
 * All rights reserved. Code licensed under the ISC license
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
*/
import { createVertex } from '@ai-sdk/google-vertex';
import { LanguageModelV1 } from "@ai-sdk/provider";
import { streamText } from 'ai';
import { ILLMModel } from "../../interfaces";
import { CoreLogger } from "../../logging/CoreLogger";
import { MessageRole } from "../../services/ChatHistoryManager";
import { getJsonCredentialsPath } from "../../services/CredentialsManager";
import { ChatGptViewProvider } from "../../view/ChatGptViewProvider";
import { ModelConfig } from "../ModelConfig";
import { GeminiChatModel } from "./GeminiChatModel";

export class GeminiModel implements ILLMModel {
    private logger = CoreLogger.getInstance();

    // initGeminiModel initializes the Gemini model with the given parameters.
    async initModel(viewProvider: ChatGptViewProvider, config: ModelConfig): Promise<any> {
        if (config.modelSource === "vertexai") {
            this.logger.info('Initializing VertexAI model...');

            // Get JSON credentials path, prompting the user if necessary
            const jsonCredentialsPath = await getJsonCredentialsPath();

            const vertex = createVertex({
                project: 'lucygpt',
                location: 'europe-southwest1',
                googleAuthOptions: {
                    keyFile: jsonCredentialsPath
                }
            });
            // Instantiate the model
            // const modelName = viewProvider.modelManager.model ? viewProvider.modelManager.model : "gemini-1.5-flash-001";
            const modelName = "gemini-1.5-flash-001";
            const model = vertex(modelName) as LanguageModelV1;
            this.logger.info(`Gemini model initialized: ${viewProvider.modelManager.model}`);
            viewProvider.apiCompletion = model;
            return new GeminiChatModel(viewProvider);
        } else if (config.modelSource === "googleai") {
            this.logger.info('Initializing Google AI model...');

            // Lazy import for Google AI SDK
            const { createGoogleGenerativeAI } = await import('@ai-sdk/google');

            const gemini = createGoogleGenerativeAI({
                baseURL: config.apiBaseUrl,
                apiKey: config.apiKey,
            });

            // Get the model name from the viewProvider or default to "gemini-1.5-flash-latest"
            let modelName = viewProvider.modelManager.model ? viewProvider.modelManager.model : "gemini-1.5-flash-latest";

            // Replace "latest" with "001" if it exists in the model name
            modelName = modelName.includes("gemini-1.5-flash-latest") ? modelName.replace("latest", "001") : modelName;

            const model = gemini("models/" + modelName);
            viewProvider.apiChat = model;
            this.logger.info(`Gemini model initialized: ${viewProvider.modelManager.model}`);
            return new GeminiChatModel(viewProvider);
        } else {
            const msg = `Unknown Gemini model source: ${config.modelSource}`;
            this.logger.error(msg);
            throw Error(msg);
        }
    }

    async chatCompletion(
        provider: ChatGptViewProvider,
        question: string,
        updateResponse: (message: string) => void,
        additionalContext: string = "",
    ) {
        if (!provider.apiCompletion) {
            throw new Error("apiCompletion is not defined");
        }

        try {
            this.logger.info(`gemini.model: ${provider.modelManager.model} gemini.question: ${question}`);

            // Add the user's question to the provider's chat history (without additionalContext)
            // provider.chatHistoryManager.addMessage(MessageRole.User, question);

            // Create a temporary chat history, including the additionalContext
            const tempChatHistory = [...provider.chatHistoryManager.getHistory()]; // Get history from ChatHistoryManager
            const fullQuestion = additionalContext ? `${additionalContext}\n\n${question}` : question;
            tempChatHistory[tempChatHistory.length - 1] = { role: MessageRole.User, content: fullQuestion }; // Replace the last message with the full question

            // Construct the messages array for the chat API
            const messages = tempChatHistory.map(message => ({
                role: message.role,
                content: message.content
            }));

            const modelConfig = provider.configurationManager.modelManager.modelConfig;
            // Dynamically limit maxTokens if the model is "gemini-1.5-flash-latest"
            let maxTokens = modelConfig.maxTokens;
            if (provider.modelManager.model === "gemini-1.5-flash-latest") {
                maxTokens = Math.min(maxTokens, 8192);
                this.logger.info(`Model is gemini-1.5-flash-latest, limiting maxTokens to 8192`);
            }

            const result = await streamText({
                system: modelConfig.systemPrompt,
                model: provider.apiCompletion,
                messages: messages,
                maxTokens: maxTokens,
                topP: modelConfig.topP,
                temperature: modelConfig.temperature,
                abortSignal: provider.abortController ? provider.abortController.signal : undefined,
            });
            const chunks: string[] = [];
            for await (const textPart of result.textStream) {
                // logger.appendLine(
                //     `INFO: chatgpt.model: ${provider.model} chatgpt.question: ${question} response: ${JSON.stringify(textPart, null, 2)}`
                // );
                updateResponse(textPart);
                chunks.push(textPart);
            }
            // Process the streamed response
            for await (const textPart of result.textStream) {
                updateResponse(textPart);
                chunks.push(textPart);
            }
            provider.response = chunks.join("");

            // Add the assistant's response to the provider's chat history
            provider.chatHistoryManager.addMessage(MessageRole.Assistant, provider.response);

            this.logger.info(`gemini.response: ${provider.response}`);
        } catch (error) {
            this.logger.error(`gemini.model: ${provider.modelManager.model} response: ${error}`);
            throw error;
        }
    }
}