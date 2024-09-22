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
 * - The `chatCompletion` function manages the chat interaction, sending user questions and processing responses.
 */

import { createAzure } from '@ai-sdk/azure';
import { createOpenAI } from '@ai-sdk/openai';
import { Annotation, START, StateGraph } from "@langchain/langgraph";
import { CoreMessage, generateObject, streamText } from 'ai';
import { z } from 'zod';
import { defaultUserPromptForContextSelection } from "../../config/Configuration";
import { ModelConfig } from "../../config/ModelConfig";
import { IFileDocstring, ILLMModel, ISelectedFile, RenderMethod } from "../../interfaces";
import { CoreLogger } from "../../logging/CoreLogger";
import { PromptFormatter } from "../../PromptFormatter";
import { ChatGptViewProvider } from "../../view/ChatGptViewProvider";
import { OpenAIChatModel } from "./OpenAIChatModel";

// Configuration for maximum retries
const MAX_RETRIES = 0; // This can be made configurable

/**
 * Define the state annotations for the StateGraph.
 */
const MyGraphState = Annotation.Root({
    selectRelevantFilesLogger: Annotation<CoreLogger>,
    generateAnswerNodeLogger: Annotation<CoreLogger>,
    retrieveFileContentLogger: Annotation<CoreLogger>,
    assessResponseNodeLogger: Annotation<CoreLogger>,
    retryCount: Annotation<number>,
    shouldReroute: Annotation<boolean>,
    previousMessages: Annotation<CoreMessage[]>,
    userQuestion: Annotation<string>,
    docstrings: Annotation<IFileDocstring[]>,
    selectedFiles: Annotation<ISelectedFile[]>,
    retrievedContents: Annotation<string>,
    retrievedFilePaths: Annotation<Set<string>>,
    answer: Annotation<string>,
    provider: Annotation<ChatGptViewProvider>,
    updateResponse: Annotation<(message: string) => void>,
});

export class OpenAIModel implements ILLMModel {
    private logger = CoreLogger.getInstance();

    async initModel(viewProvider: ChatGptViewProvider, config: ModelConfig): Promise<any> {
        if (config.apiBaseUrl.includes("azure")) {
            this.logger.info('Initializing Azure model...');
            return this.initializeAzureModel(viewProvider, config);
        } else {
            this.logger.info('Initializing OpenAI model...');
            return this.initializeOpenAIModel(viewProvider, config);
        }
    }

    async chatCompletion(
        provider: ChatGptViewProvider,
        question: string,
        updateResponse: (message: string) => void,
        additionalContext?: string,
    ): Promise<void> {
        if (!provider.apiChat) {
            throw new Error("apiChat is undefined");
        }

        try {
            this.logger.info(`chatgpt.model: ${provider.modelManager.model} chatgpt.question: ${question}`);

            // Create a new state graph with the MessagesAnnotation
            const graph = new StateGraph(MyGraphState)
                // .addNode("retrieveDocstrings", async (state) => {
                //     try {
                //         // Retrieve docstrings from the context manager
                //         const docstrings = await provider.contextManager.extractDocstrings();
                //         // Log each retrieved docstring
                //         docstrings.forEach(({ filePath, docstring }) => {
                //             this.logger.info(`Docstring from ${filePath}: ${docstring}`);
                //         });
                //         return { docstrings: docstrings }; // Update state with the docstrings
                //     } catch (error) {
                //         this.logger.error("Failed to retrieve docstrings", { error });
                //         return { docstrings: [] }; // Return an empty array to ensure docstrings is defined
                //     }
                // })
                .addNode("selectRelevantFiles", this.selectRelevantFilesNode)
                .addNode("retrieveFileContentsNode", this.retrieveFileContentsNode)
                .addNode("handleInput", this.generateAnswerNode)
                // .addNode("assessResponseNode", this.assessResponseNode)
                .addEdge(START, "selectRelevantFiles")
                // .addEdge("retrieveDocstrings", "selectRelevantFiles")
                .addEdge("selectRelevantFiles", "retrieveFileContentsNode")
                .addEdge("retrieveFileContentsNode", "handleInput");
            // .addEdge("handleInput", "assessResponseNode")
            // .addConditionalEdges("assessResponseNode", this.determineNextNode);

            // Compile the graph
            const app = graph.compile();

            // Invoke the graph with the current messages
            const inputs = {
                selectRelevantFilesLogger: CoreLogger.getInstance({ loggerName: "Context / Select relevant files" }),
                generateAnswerNodeLogger: CoreLogger.getInstance({ loggerName: "GenerateAnswerNode" }),
                retrieveFileContentLogger: CoreLogger.getInstance({ loggerName: "Context / Retrieve file contents" }),
                assessResponseNodeLogger: CoreLogger.getInstance({ loggerName: "Context / Retrieve file contents" }),
                retrievedContents: "",
                retrievedFilePaths: new Set(),
                previousMessages: provider.chatHistoryManager.getHistory(),
                userQuestion: question,
                provider: provider,
                updateResponse: updateResponse,
                retryCount: 0,
                shouldReroute: false,
                selectedFiles: [],
            };

            await app.invoke(inputs);
        } catch (error) {
            this.logger.info(`chatgpt.model: ${provider.modelManager.model} response: ${error}, stack: ${error.stack}`);
            throw error;
        }
    }

    private async initializeAzureModel(viewProvider: ChatGptViewProvider, config: ModelConfig): Promise<OpenAIChatModel> {
        const instanceName = config.apiBaseUrl.split(".")[0].split("//")[1];
        const deployName = config.apiBaseUrl.split("/").pop();

        viewProvider.modelManager.model = deployName;
        const azure = createAzure({
            resourceName: instanceName,
            apiKey: config.apiKey,
        });

        viewProvider.apiChat = azure.chat(deployName);
        this.logger.info(`Azure model initialized: ${deployName}`);
        return new OpenAIChatModel(viewProvider);
    }

    private async initializeOpenAIModel(viewProvider: ChatGptViewProvider, config: ModelConfig): Promise<OpenAIChatModel> {
        const openai = createOpenAI({
            baseURL: config.apiBaseUrl,
            apiKey: config.apiKey,
            organization: config.organization,
        });
        const modelName = viewProvider.modelManager.model || "gpt-4o";
        viewProvider.apiChat = openai.chat(modelName);
        this.logger.info(`OpenAI model initialized: ${modelName}`);
        return new OpenAIChatModel(viewProvider);
    }


    async generateAnswerNode(state: typeof MyGraphState.State) {
        const { generateAnswerNodeLogger, previousMessages, retrievedContents, userQuestion, provider, updateResponse } = state;

        generateAnswerNodeLogger.info('Invoking model with messages:', previousMessages);

        try {
            // Retrieve matched files and their ASCII layout
            const matchedFilesAscii = await provider.contextManager.treeDataProvider.renderTree(RenderMethod.FullPathDetails);

            // Use the utility function to create a formatted user prompt
            const userPrompt = `
${PromptFormatter.formatProjectLayout(matchedFilesAscii)}

${PromptFormatter.formatRetrievedContent(retrievedContents)}

${PromptFormatter.formatConversationHistory(previousMessages)}

### USER QUESTION: ${userQuestion}`;

            generateAnswerNodeLogger.info(userPrompt);

            // Make a copy of the previousMessages array
            const messagesCopy = [...previousMessages]; // or previousMessages.slice()

            // Append a new message to the copied array
            messagesCopy.push({ role: "user", content: userPrompt });

            const chunks = [];
            const result = await streamText({
                system: provider.modelManager.modelConfig.systemPrompt,
                model: provider.apiChat,
                messages: messagesCopy,
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
            const response = chunks.join("");
            provider.response = response;

            // Update previousMessages with the assistant's reply
            const updatedPreviousMessages = [
                ...previousMessages,
                { role: "user", content: userQuestion },
                { role: "assistant", content: response },
            ];

            return {
                answer: response,
                previousMessages: updatedPreviousMessages, // Update the state
            };
        } catch (error) {
            generateAnswerNodeLogger.error('Model invocation error:', error);
            throw error;
        }
    }

    /**
     * Handles the selection of relevant files based on the user's question and the retrieved docstrings.
     * 
     * This function constructs a prompt using the system prompt and the user's question,
     * sends it to the OpenAI model, and returns the list of relevant files.
     * 
     * @param state - The current state containing docstrings and user question.
     * @returns A promise that resolves to an array of SelectedFile objects.
     */
    async selectRelevantFilesNode(state: typeof MyGraphState.State) {
        const {
            // docstrings = [],
            selectRelevantFilesLogger,
            previousMessages,
            userQuestion,
            provider
        } = state;

        // Define the schema for the structured output
        const FileSchema = z.object({
            filePath: z.string(),
            reason: z.string(),
            symbols: z.array(z.string()).optional(),
        });

        const FilesSchema = z.object({
            selectedFiles: z.array(FileSchema),
        });

        selectRelevantFilesLogger.info("Filesschema constructed");

        try {
            // Construct the prompt using the system prompt
            const systemPrompt = `**You are a Context Selection Expert AI agent.** Your task is to **explicitly select relevant project resources (files, folders, symbols)** for inclusion, providing the optimal context to answer the user's question. ** No resources are included by default**, so it is up to you to specify all resources that should be retrieved.`;

            const matchedFilesAscii = await provider.contextManager.treeDataProvider.renderTree(RenderMethod.FullPathDetails);
            const projectResourcesOverview = PromptFormatter.formatProjectLayout(matchedFilesAscii);
            const conversationHistory = PromptFormatter.formatConversationHistory(previousMessages);
            // const docStrings = PromptFormatter.formatDocstrings(docstrings);

            // Replace the placeholders in the template with actual values
            const userPrompt = defaultUserPromptForContextSelection
                .replace('${projectResourcesOverview}', projectResourcesOverview)
                .replace('${conversationHistory}', conversationHistory)
                .replace('${userQuestion}', userQuestion);

            // Call OpenAI API to get the relevant files
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ];
            selectRelevantFilesLogger.info("Messages instantiated", { messages });

            // const config = provider.modelManager.modelConfig;
            const { object } = await generateObject({
                model: provider.apiChat,
                mode: "json",
                schema: FilesSchema,
                messages: messages
            });

            selectRelevantFilesLogger.info('Completion done', { object });
            return { selectedFiles: object.selectedFiles };
        } catch (error: any) {
            selectRelevantFilesLogger.error('Error in selectRelevantFilesNode:', {
                message: error.message || 'Unknown error',
                stack: error.stack || 'No stack trace',
                response: error.response || 'No response data',
                code: error.code || 'No error code',
                request: error.request || 'No request data',
            });
            throw error;
        }
    }

    async retrieveFileContentsNode(state: typeof MyGraphState.State) {
        const { retrieveFileContentLogger, selectedFiles, provider, retrievedContents, retrievedFilePaths } = state;

        try {
            if (!selectedFiles || selectedFiles.length === 0) {
                retrieveFileContentLogger.warn('No selected files to retrieve content from.');
                return { retrievedContents, retrievedFilePaths };
            }

            // Initialize retrievedFilePaths if undefined
            const alreadyRetrieved = retrievedFilePaths || new Set();

            // Filter out files whose contents have already been retrieved
            const newFiles = selectedFiles.filter(file => !alreadyRetrieved.has(file.filePath));

            if (newFiles.length === 0) {
                retrieveFileContentLogger.info('No new files to retrieve content from.');
                return { retrievedContents, retrievedFilePaths: alreadyRetrieved };
            }

            // Map newFiles to an array of file paths
            const newFilePaths = new Set(newFiles.map(file => file.filePath));

            // Retrieve the file contents
            const newContents = await provider.contextManager.getFilesContent(newFilePaths);
            retrieveFileContentLogger.info('Retrieved new file contents:', { newContents });

            // Accumulate the retrieved contents
            const updatedRetrievedContents = retrievedContents
                ? retrievedContents + "\n" + newContents
                : newContents;

            // Update the set of retrieved file paths
            newFilePaths.forEach(filePath => alreadyRetrieved.add(filePath));

            // Update the state with the retrieved file contents
            return {
                retrievedContents: updatedRetrievedContents,
                retrievedFilePaths: alreadyRetrieved,
            };
        } catch (error) {
            retrieveFileContentLogger.error('Error retrieving file contents', { error });
            throw error;
        }
    }

    async assessResponseNode(state: typeof MyGraphState.State) {
        const { assessResponseNodeLogger, previousMessages, userQuestion, provider, selectedFiles, docstrings, retryCount, updateResponse } = state;

        // updateResponse("\n# Determining if the response could be improved by providing additional files in the context...")

        // Compute the set of file paths already included
        const alreadySelectedFilePaths = new Set(selectedFiles.map(f => f.filePath));

        // Filter out docstrings of files that are already included
        const remainingDocstrings = docstrings.filter(doc => !alreadySelectedFilePaths.has(doc.filePath));

        try {
            const userPrompt = `
### ASSESSMENT INSTRUCTION:
Based on the conversation context, the user question, the generated response, and the files already included, determine if additional files should be included to improve the response. If yes, list the additional files that should be included, along with a reason for each.

${PromptFormatter.formatConversationHistory(previousMessages)}

### USER QUESTION:
${userQuestion}

### ASSISTANT RESPONSE TO USER QUESTION:
${provider.response}

### FILES ALREADY INCLUDED:
${selectedFiles.map(f => `- ${f.filePath}: ${f.reason}`).join('\n')}

### REMAINING FILE DOCSTRINGS:
${PromptFormatter.formatDocstrings(remainingDocstrings)}

### OUTPUT FORMAT:
Provide a JSON array where each element has the following structure:
{
    "filePath": "absolute/path/to/the/file",
    "reason": "Explanation of why this file is relevant (1 to 5 lines max)."
}

If no additional files are needed, respond with an empty array.`;

            const messages = [
                { role: 'system', content: 'You are an assistant that helps determine the adequacy of responses based on context.' },
                { role: 'user', content: userPrompt }
            ];

            // Check the response
            const FileSchema = z.object({
                filePath: z.string(),
                reason: z.string(),
            });
            const FilesSchema = z.object({
                selectedFiles: z.array(FileSchema),
            });

            const { object } = await generateObject({
                model: provider.apiChat,
                messages: messages,
                mode: "json",
                schema: FilesSchema,
            });

            // Filter out files that are already in selectedFiles
            const newSelectedFiles = object.selectedFiles.filter(
                f => !selectedFiles.some(sf => sf.filePath === f.filePath)
            );
            const updatedSelectedFiles = selectedFiles.concat(newSelectedFiles);

            if (newSelectedFiles.length > 0 && retryCount < MAX_RETRIES) {
                return {
                    selectedFiles: updatedSelectedFiles,
                    shouldReroute: true,
                    retryCount: retryCount + 1,
                };
            } else {
                return { shouldReroute: false };
            }
        } catch (error) {
            assessResponseNodeLogger.error('Error in assessResponseNode:', error);
            throw error;
        }
    }

    determineNextNode(state: typeof MyGraphState.State) {
        if (state.shouldReroute && state.retryCount < MAX_RETRIES) {
            return "retrieveFileContentsNode";
        } else {
            return "__end__";
        }
    }
}