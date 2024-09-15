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
 * This module provides functionality for interacting with OpenAI and Azure OpenAI models
 * within the ChatGPT VS Code extension. It includes methods for initializing models,
 * handling chat interactions, and streaming responses from the AI.
 * 
 * Key Features:
 * - Initializes both OpenAI and Azure OpenAI models based on configuration settings.
 * - Provides a chat function that sends user queries to the AI model and streams responses.
 * - Handles error logging and management for model initialization and chat interactions.
 * 
 * Usage:
 * - The `initGptModel` function initializes the appropriate AI model based on the current configuration.
 * - The `chatGpt` function manages the chat interaction, sending user questions and processing responses.
 */

import { createAzure } from '@ai-sdk/azure';
import { createOpenAI } from '@ai-sdk/openai';
import { OpenAIChatLanguageModel } from "@ai-sdk/openai/internal/dist";
import { AIMessage } from "@langchain/core/messages";
import { Annotation, START, StateGraph } from "@langchain/langgraph";
import { CoreMessage, streamText } from 'ai';
import { CoreLogger } from "../CoreLogger";
import { ModelConfig } from "../config/ModelConfig";
import { ChatGptViewProvider } from "../view/ChatGptViewProvider";
import { OpenAIChatModel } from "./OpenAIChatModel";

const logger = CoreLogger.getInstance();

const MyGraphState = Annotation.Root({
    messages: Annotation<CoreMessage[]>,
    question: Annotation<string>,
    answer: Annotation<string>,
    provider: Annotation<ChatGptViewProvider>,
    updateResponse: Annotation<(message: string) => void>,
});

/**
 * Initializes and returns the appropriate IChatModel instance based on the provided configuration.
 * 
 * This function checks whether to initialize an Azure model or an OpenAI model based on the 
 * configuration's API base URL. It sets up the model with the necessary API key and configuration 
 * values and logs the initialization process.
 * 
 * @param viewProvider - An instance of `ChatGptViewProvider` for accessing view-related settings.
 * @param config - An instance of `ModelConfig` containing configuration settings for the model.
 * @returns A promise that resolves to an instance of `OpenAIChatModel`.
 * @throws An error if model initialization fails.
 */
export async function initGptModel(viewProvider: ChatGptViewProvider, config: ModelConfig) {
    try {
        // AzureOpenAI
        if (config.apiBaseUrl?.includes("azure")) {
            logger.info("Initializing Azure model...");
            const instanceName = config.apiBaseUrl.split(".")[0].split("//")[1];
            const deployName = config.apiBaseUrl.split("/")[config.apiBaseUrl.split("/").length - 1];

            viewProvider.modelManager.model = deployName;
            const azure = createAzure({
                resourceName: instanceName,
                apiKey: config.apiKey,
            });

            viewProvider.apiChat = azure.chat(deployName);
            logger.info(`Azure model initialized: ${deployName}`);
            return new OpenAIChatModel(viewProvider);
        } else {
            // OpenAI
            logger.info("Initializing OpenAI model...");
            const openai = createOpenAI({
                baseURL: config.apiBaseUrl,
                apiKey: config.apiKey,
                organization: config.organization,
            });
            let openAIChatLanguageModel: OpenAIChatLanguageModel = openai.chat(viewProvider.modelManager.model ? viewProvider.modelManager.model : "gpt-4o");
            viewProvider.apiChat = openAIChatLanguageModel;
            logger.info(`OpenAI model initialized: ${viewProvider.modelManager.model || "gpt-4o"}`);
            return new OpenAIChatModel(viewProvider);
        }
    } catch (error) {
        logger.logError(error, 'Failed to initialize model');
        throw error; // Re-throw the error after logging
    }
}

// Define the function that handles the input
async function handleInput(state: typeof MyGraphState.State) {
    const { messages, provider, updateResponse } = state;

    logger.info('Invoking model with messages:', messages);

    try {
        const chunks = [];

        const result = await streamText({
            system: provider.modelManager.modelConfig.systemPrompt,
            model: provider.apiChat,
            messages: messages,
            maxTokens: provider.modelManager.modelConfig.maxTokens,
            topP: provider.modelManager.modelConfig.topP,
            temperature: provider.modelManager.modelConfig.temperature,
            abortSignal: provider.abortController ? provider.abortController.signal : undefined,
        });

        // Process the streamed response
        for await (const textPart of result.textStream) {
            updateResponse(textPart);
            chunks.push(textPart);
        }

        // Return the final response
        return { messages: [new AIMessage(chunks.join(""))] };
    } catch (error) {
        logger.error('Model invocation error:', error);
        throw error;
    }
}


/**
 * Manages the chat interaction with the OpenAI model, sending user queries and processing responses.
 * 
 * This function retrieves the AI model from the provider, sends the user's question, and streams 
 * the response back to the user. It handles the chat history and updates the UI with the response.
 * 
 * @param provider - An instance of `ChatGptViewProvider` for accessing chat-related settings.
 * @param question - The user's question to be sent to the AI model.
 * @param updateResponse - A callback function to update the response in the UI as it streams.
 * @param additionalContext - Optional additional context to include with the user's question.
 * @returns A promise that resolves when the interaction is complete.
 * @throws An error if the API chat is undefined or if the chat interaction fails.
 */
export async function chatCompletion(
    provider: ChatGptViewProvider,
    question: string,
    updateResponse: (message: string) => void,
    additionalContext: string = "",
) {
    if (!provider.apiChat) {
        throw new Error("apiChat is undefined");
    }

    try {
        logger.info(`chatgpt.model: ${provider.modelManager.model} chatgpt.question: ${question}`);

        // Create a new state graph with the MessagesAnnotation
        const graph = new StateGraph(MyGraphState)
            .addNode("handleInput", handleInput)
            .addEdge(START, "handleInput");

        // Compile the graph
        const app = graph.compile();

        // Create a temporary chat history, including the additionalContext
        const tempChatHistory = [...provider.chatHistoryManager.getHistory()];
        const fullQuestion = additionalContext ? `${question}\n\n${additionalContext}` : question;

        // Append a new message to the history
        tempChatHistory.push({ role: "user", content: fullQuestion });

        // Invoke the graph with the current messages
        const inputs = {
            messages: tempChatHistory,
            provider: provider,
            updateResponse: updateResponse,
        };
        const response = await app.invoke(inputs);

        // provider.response = response;

        // // Add the assistant's response to the provider's chat history (without additionalContext)
        // provider.chatHistoryManager.addMessage('assistant', chunks.join(""));

        // Assuming the response contains the assistant's message
        const assistantResponse = response.messages[0].content; // Adjust this based on your actual response structure

        provider.response = assistantResponse;
        logger.info(`chatgpt.response: ${assistantResponse}`);
    } catch (error) {
        logger.info(`chatgpt.model: ${provider.modelManager.model} response: ${error}`);
        throw error;
    }
}
