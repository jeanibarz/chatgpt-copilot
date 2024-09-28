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

import { CoreTool, generateObject, GenerateObjectResult, LanguageModel, streamText, StreamTextResult } from 'ai';
import { IChatModel } from "../../interfaces";
import { CoreLogger } from "../../logging/CoreLogger";
import { GenerateObjectCallOptions, StreamTextCallOptions, WorkflowType } from "../../types/coreTypes";
import { ChatGptViewProvider } from "../../view/ChatGptViewProvider";
import { DocstringsResponseGenerator } from "../../workflows/BasicDocstringGenerator";
import { BasicResponseGenerator } from '../../workflows/BasicResponseGenerator';
import { KnowledgeEnhancedResponseGenerator } from "../../workflows/KnowledgeEnhancedResponseGenerator";


/**
 * The OpenAIModel class implements the IChatModel interface and provides methods
 * for generating responses from OpenAI and Azure OpenAI models.
 * 
 * Key Features:
 * - Supports different types of response generation workflows.
 * - Integrates with various response generators for handling chat interactions.
 * - Provides methods for generating objects and streaming text based on the model.
 */
export class OpenAIModel implements IChatModel {
    private logger = CoreLogger.getInstance();
    
    /**
     * Constructor for the OpenAIModel class.
     * 
     * @param chatModel - The language model to be used for generating responses.
     * @param provider - An instance of ChatGptViewProvider for accessing view-related settings.
     */
    constructor(private chatModel: LanguageModel, private provider: ChatGptViewProvider) { }

    /**
     * Generates a response based on the provided prompt and additional context.
     * 
     * @param prompt - The prompt to send to the AI model.
     * @param additionalContext - Additional context to enhance the response generation.
     * @param updateResponse - A callback function to update the response in real-time.
     * @param workflowType - The type of workflow to use for response generation (default is 'simple').
     * @returns A promise that resolves to the generated response or undefined.
     */
    async generate(
        prompt: string,
        additionalContext: string,
        updateResponse: (message: string) => void,
        workflowType: WorkflowType = 'simple',
    ): Promise<string | undefined> {
        return await this.chatCompletion(this.provider, prompt, updateResponse, workflowType, additionalContext);
    }

    /**
     * Manages the chat interaction with the AI model based on the provided question.
     * 
     * @param provider - An instance of ChatGptViewProvider for accessing view-related settings.
     * @param question - The user's question to send to the AI model.
     * @param updateResponse - A callback function to update the response in real-time.
     * @param workflowType - The type of workflow to use for response generation.
     * @param additionalContext - Additional context to enhance the response generation (optional).
     * @returns A promise that resolves to the generated response or undefined.
     * @throws Error if the workflow type is unknown.
     */
    async chatCompletion(
        provider: ChatGptViewProvider,
        question: string,
        updateResponse: (message: string) => void,
        workflowType: WorkflowType,
        additionalContext?: string,
    ): Promise<string | undefined> {
        if (workflowType === 'simple') {
            await new BasicResponseGenerator(provider, this).generate(question, updateResponse);
        } else if (workflowType === 'advanced') {
            await new KnowledgeEnhancedResponseGenerator(provider, this).generate(question, updateResponse);
        } else if (workflowType === 'basicDocstringGenerator') {
            return await new DocstringsResponseGenerator(provider, this).generate(question, updateResponse);
        } else {
            throw Error('Unknown workflow type');
        }
    }

    /**
    * Generates an object based on the provided parameters, using the internal chatModel.
    * 
    * @param options - The options for generating the object, including model parameters.
    * @returns A promise that resolves to the generated object result.
    */
    async generateObject<OBJECT>(options: GenerateObjectCallOptions<OBJECT>): Promise<GenerateObjectResult<OBJECT>> {
        // Combine options with the model parameter
        const fullParams = {
            ...options,
            model: this.chatModel,
        };

        // Delegate the call to the actual generateObject function
        return generateObject<OBJECT>(fullParams);
    }

    /**
     * Streams text based on the provided options, using the internal chatModel.
     * 
     * @param options - The options for streaming text, including model parameters.
     * @returns A promise that resolves to the streamed text result.
     */
    async streamText<TOOLS extends Record<string, CoreTool>>(options: StreamTextCallOptions<TOOLS>): Promise<StreamTextResult<TOOLS>> {
        // Combine options with the model parameter
        const fullParams = {
            ...options,
            model: this.chatModel, // Inject the chatModel
        };

        // Call the streamText function with the full parameters
        return streamText<TOOLS>(fullParams);
    }
}