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

/**
 * This module provides functionality for interacting with legacy OpenAI models
 * within the ChatGPT VS Code extension. It includes methods for initializing models,
 * handling chat interactions, and streaming responses from the AI.
 * 
 * Key Features:
 * - Initializes both OpenAI and Azure OpenAI legacy models based on configuration settings.
 * - Provides a chat completion function that sends user queries to the AI model and streams responses.
 * - Handles error logging and management for model initialization and chat interactions.
 * 
 * Usage:
 * - The `initGptLegacyModel` function initializes the appropriate legacy AI model based on the current configuration.
 * - The `chatCompletion` function manages the chat interaction, sending user questions and processing responses.
 */


import { createAzure } from '@ai-sdk/azure';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { CoreLogger } from "../CoreLogger";
import { ModelConfig } from "../config/ModelConfig";
import { ChatGptViewProvider } from "../view/ChatGptViewProvider";

const logger = CoreLogger.getInstance();

/**
 * Initializes the GPT legacy model based on the provided configuration.
 * 
 * This function checks whether to initialize an Azure model or an OpenAI model based on the
 * configuration's API base URL. It sets up the model with the necessary API key and configuration
 * values and logs the initialization process.
 * 
 * @param viewProvider - An instance of `ChatGptViewProvider` for accessing view-related settings.
 * @param config - An instance of `ModelConfig` containing configuration settings for the model.
 * @throws An error if model initialization fails.
 */
export function initGptLegacyModel(viewProvider: ChatGptViewProvider, config: ModelConfig) {
    if (config.apiBaseUrl?.includes("azure")) {
        const instanceName = config.apiBaseUrl.split(".")[0].split("//")[1];
        const deployName = config.apiBaseUrl.split("/")[config.apiBaseUrl.split("/").length - 1];

        viewProvider.modelManager.model = deployName;
        const azure = createAzure({
            resourceName: instanceName,
            apiKey: config.apiKey,
        });
        viewProvider.apiCompletion = azure.completion(deployName);
    } else {
        // OpenAI
        const openai = createOpenAI({
            baseURL: config.apiBaseUrl,
            apiKey: config.apiKey,
            organization: config.organization,
        });
        viewProvider.apiCompletion = openai.completion(viewProvider.modelManager.model ? viewProvider.modelManager.model : "gpt-4o");
    }
}

/**
 * Manages the chat interaction with the legacy OpenAI model, sending user queries and processing responses.
 * 
 * This function retrieves the AI model from the provider, sends the user's question, and streams 
 * the response back to the user. It handles the chat history and updates the UI with the response.
 * 
 * @param provider - An instance of `ChatGptViewProvider` for accessing chat-related settings.
 * @param question - The user's question to be sent to the AI model.
 * @param updateResponse - A callback function to update the response in the UI as it streams.
 * @param additionalContext - Optional additional context to include with the user's question.
 * @returns A promise that resolves when the interaction is complete.
 * @throws An error if the API completion is undefined or if the chat interaction fails.
 */
export async function chatCompletion(
    provider: ChatGptViewProvider,
    question: string,
    updateResponse: (message: string) => void,
    additionalContext: string = "",
) {
    if (!provider.apiCompletion) {
        throw new Error("apiCompletion is not defined");
    }

    try {
        logger.info(`chatgpt.model: ${provider.modelManager.model} chatgpt.question: ${question}`);

        // Add the user's question to the provider's chat history (without additionalContext)
        provider.chatHistoryManager.addMessage('user', question);

        // Create a temporary chat history, including the additionalContext
        const tempChatHistory = [...provider.chatHistoryManager.getHistory()]; // Get history from ChatHistoryManager
        const fullQuestion = additionalContext ? `${additionalContext}\n\n${question}` : question;
        tempChatHistory[tempChatHistory.length - 1] = { role: "user", content: fullQuestion }; // Replace the user's question with the full question in the temp history

        // Construct the prompt using the temporary chat history
        let prompt = "";
        for (const message of tempChatHistory) {
            prompt += `${message.role === "user" ? "Human:" : "AI:"} ${message.content}\n`;
        }
        prompt += `AI: `;

        // Generate the response using the temporary prompt
        const result = await streamText({
            system: provider.modelManager.modelConfig.systemPrompt,
            model: provider.apiCompletion,
            prompt: prompt,
            maxTokens: provider.modelManager.modelConfig.maxTokens,
            topP: provider.modelManager.modelConfig.topP,
            temperature: provider.modelManager.modelConfig.temperature,
            abortSignal: provider.abortController ? provider.abortController.signal : undefined,
        });

        const chunks = [];
        for await (const textPart of result.textStream) {
            updateResponse(textPart);
            chunks.push(textPart);
        }
        provider.response = chunks.join("");

        // Add the assistant's response to the provider's chat history (without additionalContext)
        provider.chatHistoryManager.addMessage('assistant', provider.response);

        logger.info(`chatgpt.response: ${provider.response}`);
    } catch (error) {
        logger.info(`chatgpt.model: ${provider.modelManager.model} response: ${error}`);
        throw error;
    }
}
