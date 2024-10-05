// src/state/ModelConfigStateManager.ts

/**
 * This module manages the configuration state for the model settings
 * within the application. It provides methods to update and retrieve
 * various configuration parameters, such as organization, tokens, 
 * temperature, and model source.
 */

import * as vscode from 'vscode';
import { ConfigKeys } from "../constants/ConfigKeys";
import { CoreLogger } from '../logging/CoreLogger';
import { ConfigurationStateManager } from "./ConfigurationStateManager";

export class ModelConfigStateManager {
    private logger: CoreLogger;

    constructor(
        private globalState: vscode.Memento,
        private configurationStateManager: ConfigurationStateManager,
    ) {
        this.logger = CoreLogger.getInstance();
    }

    /**
     * Updates the organization name in the global state.
     * 
     * @param organization - The organization name to set, or null to clear.
     */
    public async setOrganization(organization: string | null): Promise<void> {
        await this.globalState.update('chatgpt-gpt3.organization', organization);
    }

    /**
     * Updates the maximum tokens setting in the global state.
     * 
     * @param maxTokens - The maximum number of tokens to set, or null to clear.
     */
    public async setMaxTokens(maxTokens: number | null): Promise<void> {
        await this.globalState.update(ConfigKeys.MaxTokens, maxTokens);
    }

    /**
     * Updates the temperature setting in the global state.
     * 
     * @param temperature - The temperature value to set, or null to clear.
     */
    public async setTemperature(temperature: number | null): Promise<void> {
        await this.globalState.update(ConfigKeys.Temperature, temperature);
    }

    /**
     * Updates the system prompt in the global state.
     * 
     * @param systemPrompt - The system prompt to set, or null to clear.
     */
    public async setSystemPrompt(systemPrompt: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.SystemPrompt, systemPrompt);
    }

    /**
     * Updates the top P setting in the global state.
     * 
     * @param topP - The top P value to set, or null to clear.
     */
    public async setTopP(topP: number | null): Promise<void> {
        await this.globalState.update(ConfigKeys.TopP, topP);
    }

    /**
     * Retrieves the organization name from the configuration state manager.
     * 
     * @returns The organization name, or null if not set.
     */
    public getOrganization(): string | null | undefined {
        return this.configurationStateManager.getConfig<string>(ConfigKeys.Organization);
    }

    /**
     * Retrieves the maximum tokens setting from the configuration state manager.
     * 
     * @returns The maximum tokens value, or null if not set.
     */
    public getMaxTokens(): number | null | undefined {
        return this.configurationStateManager.getConfig<number>(ConfigKeys.MaxTokens);
    }

    /**
     * Retrieves the temperature setting from the configuration state manager.
     * 
     * @returns The temperature value, or null if not set.
     */
    public getTemperature(): number | null | undefined {
        return this.configurationStateManager.getConfig<number>(ConfigKeys.Temperature);
    }

    /**
     * Retrieves the top P setting from the configuration state manager.
     * 
     * @returns The top P value, or null if not set.
     */
    public getTopP(): number | null | undefined {
        return this.configurationStateManager.getConfig<number>(ConfigKeys.TopP);
    }

    /**
     * Retrieves the GPT-3 model setting from the configuration state manager.
     * 
     * @returns The GPT-3 model name, or null if not set.
     */
    public getGpt3Model(): string | null | undefined {
        return this.configurationStateManager.getConfig<string>(ConfigKeys.Gpt3Model);
    }

    /**
     * Retrieves the model source setting from the configuration state manager.
     * 
     * @returns The model source, or null if not set.
     */
    public getModelSource(): string | null | undefined {
        return this.configurationStateManager.getConfig<string>(ConfigKeys.ModelSource);
    }

    /**
     * Retrieves the custom model name from the configuration state manager.
     * 
     * @returns The custom model name, or null if not set.
     */
    public getCustomModelName(): string | null | undefined {
        return this.configurationStateManager.getConfig<string>(ConfigKeys.CustomModel);
    }

    /**
     * Retrieves the API base URL from the configuration state manager.
     * 
     * @returns The API base URL, or null if not set.
     */
    public getApiBaseUrl(): string | null | undefined {
        return this.configurationStateManager.getConfig<string>(ConfigKeys.ApiBaseUrl);
    }

    /**
     * Retrieves the model setting from the configuration state manager.
     * 
     * @returns The model name, or null if not set.
     */
    public getModel(): string | null | undefined {
        return this.configurationStateManager.getConfig<string>(ConfigKeys.Model);
    }

    /**
     * Checks if the current model is a custom model.
     * 
     * @returns True if the model is custom, otherwise false.
     */
    public isCustomModel(): boolean {
        return this.getModel() === "custom";
    }

    /**
     * Utility for checking if code generation is enabled based on the configuration.
     * 
     * @returns True if code generation is enabled and the model starts with 'code-', otherwise false.
     */
    public isGenerateCodeEnabled(): boolean {
        const generateCodeEnabled = !!this.configurationStateManager.getConfig<boolean>(ConfigKeys.GenerateCodeEnabled);
        const model = this.getModel() ?? '';
        return generateCodeEnabled && model.startsWith('code-');
    }
}