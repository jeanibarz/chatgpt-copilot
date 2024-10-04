// src/models/llm_models/OpenAI.ts

/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/naming-convention */
/**
 * @license
 * Copyright (c) 2024 - Present, Pengfei Ni
 *
 * All rights reserved. Code licensed under the ISC license
 */

/**
 * This module provides functionality for interacting with OpenAI and Azure OpenAI models
 * within the ChatGPT VS Code extension. It includes methods for initializing models,
 * handling chat interactions, and streaming responses from the AI.
 */

import { CoreTool, generateObject, GenerateObjectResult, LanguageModel, streamText, StreamTextResult } from 'ai';
import { inject, injectable } from "inversify";
import { IChatModel } from "../../interfaces";
import TYPES from '../../inversify.types';
import { ModelManager } from "../../services";
import { DocstringService } from "../../services/DocstringService";
import { MermaidDiagramService } from "../../services/MermaidDiagramService";
import { GenerateObjectCallOptions, StreamTextCallOptions, WorkflowType } from "../../types/coreTypes";
import { BasicResponseGenerator } from '../../workflows/BasicResponseGenerator';
import { KnowledgeEnhancedResponseGenerator } from "../../workflows/KnowledgeEnhancedResponseGenerator";

@injectable()
export class OpenAIModelFactory {
    constructor(
        @inject(TYPES.ModelManager) private modelManager: ModelManager,
    ) { }

    create(chatModel: LanguageModel): OpenAIModel {
        return new OpenAIModel(this.modelManager, chatModel);
    }
}

/**
 * The OpenAIModel class implements the IChatModel interface and provides methods
 * for generating responses from OpenAI and Azure OpenAI models.
 */
@injectable()
export class OpenAIModel implements IChatModel {
    /**
     * Constructor for the OpenAIModel class.
     * 
     * @param chatModel - The language model to be used for generating responses.
     * @param configurationManager - Manages configuration settings.
     * @param logger - An instance of CoreLogger for logging information.
     */
    constructor(
        private modelManager: ModelManager,
        private chatModel: LanguageModel,
    ) { }

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
        return await this.chatCompletion(prompt, updateResponse, workflowType, additionalContext);
    }

    /**
     * Manages the chat interaction with the AI model based on the provided question.
     * 
     * @param question - The user's question to send to the AI model.
     * @param updateResponse - A callback function to update the response in real-time.
     * @param workflowType - The type of workflow to use for response generation.
     * @param additionalContext - Additional context to enhance the response generation (optional).
     * @returns A promise that resolves to the generated response or undefined.
     * @throws Error if the workflow type is unknown.
     */
    async chatCompletion(
        question: string,
        updateResponse: (message: string) => void,
        workflowType: WorkflowType,
        additionalContext?: string,
    ): Promise<string | undefined> {
        if (workflowType === 'simple') {
            await new BasicResponseGenerator(this).generate(question, updateResponse);
        } else if (workflowType === 'advanced') {
            await new KnowledgeEnhancedResponseGenerator(this).generate(question, updateResponse);
        } else if (workflowType === 'basicDocstringGenerator') {
            return await new DocstringService(this.modelManager).generateDocstring(question, updateResponse);
        } else if (workflowType === 'mermaidDiagramGenerator') {
            return await new MermaidDiagramService(this.modelManager).generateDiagram(question, updateResponse);
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
        const fullParams = {
            ...options,
            model: this.chatModel,
        };

        return generateObject<OBJECT>(fullParams);
    }

    /**
     * Streams text based on the provided options, using the internal chatModel.
     * 
     * @param options - The options for streaming text, including model parameters.
     * @returns A promise that resolves to the streamed text result.
     */
    async streamText<TOOLS extends Record<string, CoreTool>>(options: StreamTextCallOptions<TOOLS>): Promise<StreamTextResult<TOOLS>> {
        const fullParams = {
            ...options,
            model: this.chatModel,
        };

        return streamText<TOOLS>(fullParams);
    }
}
