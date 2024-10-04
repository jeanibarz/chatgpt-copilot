// src/config/ModelConfig.ts

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
 * This module defines the configuration settings for AI models used in the application.
 * It encapsulates the parameters required for initializing and managing the model's
 * behavior and interaction with the API.
 * 
 * The `ModelConfig` class provides a structured approach to manage various settings 
 * related to the AI model, ensuring that all necessary configurations are easily 
 * accessible and modifiable.
 * 
 * Key Features:
 * - Holds configuration values such as API key, base URL, and model parameters.
 * - Provides a structured way to manage settings related to the AI model.
 */

import { StateManager } from "../state/StateManager";

export class ModelConfig {
    apiKey: string | null | undefined;
    apiBaseUrl: string | null | undefined;
    maxTokens: number | null | undefined;
    temperature: number | null | undefined;
    topP: number | null | undefined;
    organization: string | null | undefined;
    systemPrompt: string | null | undefined;
    jsonCredentialsPath: string | null | undefined;

    constructor(
        apiKey?: string | null,
        apiBaseUrl?: string | null,
        maxTokens?: number | null,
        temperature?: number | null,
        topP?: number | null,
        organization?: string | null,
        systemPrompt?: string | null,
        jsonCredentialsPath?: string | null,
    ) {
        const stateManager = StateManager.getInstance();

        this.apiKey = apiKey ?? stateManager.getApiKey();
        this.apiBaseUrl = apiBaseUrl ?? stateManager.getApiBaseUrl();
        this.maxTokens = maxTokens ?? stateManager.getMaxTokens();
        this.temperature = temperature ?? stateManager.getTemperature();
        this.topP = topP ?? stateManager.getTopP();
        this.organization = organization ?? stateManager.getOrganization();
        this.systemPrompt = systemPrompt ?? stateManager.getDefaultSystemPrompt();
        this.jsonCredentialsPath = jsonCredentialsPath ?? stateManager.getJsonCredentialsPath();
    }
}