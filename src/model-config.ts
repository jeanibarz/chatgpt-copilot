// File: src/model-config.ts

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
 * The `ModelConfig` class represents the configuration settings for an AI model.
 * It contains various parameters required to initialize and manage the model's
 * behavior and interaction with the API.
 * 
 * Key Features:
 * - Holds configuration values such as API key, base URL, and model parameters.
 * - Provides a structured way to manage settings related to the AI model.
 */
export class ModelConfig {
    apiKey: string; // The API key for accessing the AI model
    apiBaseUrl: string; // The base URL for the API
    maxTokens: number; // The maximum number of tokens for the model's responses
    temperature: number; // The temperature setting for controlling randomness in responses
    topP: number; // The top-p sampling setting for controlling diversity in responses
    organization: string; // The organization associated with the API key
    systemPrompt: string; // The system prompt to guide the model's behavior
    modelSource: string; // The source of the model configuration
    jsonCredentialsPath?: string; // Optional path to JSON credentials for authentication

    /**
     * Constructor for the `ModelConfig` class.
     * Initializes a new instance of the ModelConfig with the provided settings.
     * 
     * @param apiKey - The API key for accessing the AI model.
     * @param apiBaseUrl - The base URL for the API.
     * @param maxTokens - The maximum number of tokens for the model's responses.
     * @param temperature - The temperature setting for controlling randomness in responses.
     * @param topP - The top-p sampling setting for controlling diversity in responses.
     * @param organization - The organization associated with the API key.
     * @param systemPrompt - The system prompt to guide the model's behavior.
     * @param modelSource - The source of the model configuration.
     * @param jsonCredentialsPath - Optional path to JSON credentials for authentication.
     */
    constructor({
        apiKey,
        apiBaseUrl,
        maxTokens,
        temperature,
        topP,
        organization,
        systemPrompt,
        modelSource,
        jsonCredentialsPath,
    }: {
        apiKey: string;
        apiBaseUrl: string;
        maxTokens: number;
        temperature: number;
        topP: number;
        organization: string;
        systemPrompt: string;
        modelSource: string;
        jsonCredentialsPath?: string;
    }) {
        this.apiKey = apiKey;
        this.apiBaseUrl = apiBaseUrl;
        this.maxTokens = maxTokens;
        this.temperature = temperature;
        this.topP = topP;
        this.organization = organization;
        this.systemPrompt = systemPrompt;
        this.modelSource = modelSource;
        this.jsonCredentialsPath = jsonCredentialsPath;
    }
}