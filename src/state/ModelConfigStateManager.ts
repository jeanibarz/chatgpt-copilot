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
        this.logger.info('ModelConfigStateManager initialized');
    }

    /**
     * Updates the organization name in the global state.
     * 
     * @param organization - The organization name to set, or null to clear.
     */
    public async setOrganization(organization: string | null): Promise<void> {
        await this.globalState.update('chatgpt-gpt3.organization', organization);
        this.logger.info(`Organization ${organization ? `set to: ${organization}` : 'cleared'}`);
    }

    /**
     * Updates the maximum tokens setting in the global state.
     * 
     * @param maxTokens - The maximum number of tokens to set, or null to clear.
     */
    public async setMaxTokens(maxTokens: number | null): Promise<void> {
        await this.globalState.update(ConfigKeys.MaxTokens, maxTokens);
        this.logger.info(`Max tokens ${maxTokens !== null ? `set to: ${maxTokens}` : 'cleared'}`);
    }

    /**
     * Updates the temperature setting in the global state.
     * 
     * @param temperature - The temperature value to set, or null to clear.
     */
    public async setTemperature(temperature: number | null): Promise<void> {
        await this.globalState.update(ConfigKeys.Temperature, temperature);
        this.logger.info(`Temperature ${temperature !== null ? `set to: ${temperature}` : 'cleared'}`);
    }

    /**
     * Updates the system prompt in the global state.
     * 
     * @param systemPrompt - The system prompt to set, or null to clear.
     */
    public async setSystemPrompt(systemPrompt: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.SystemPrompt, systemPrompt);
        this.logger.info(`System prompt ${systemPrompt ? 'updated' : 'cleared'}`);
    }

    /**
     * Updates the top P setting in the global state.
     * 
     * @param topP - The top P value to set, or null to clear.
     */
    public async setTopP(topP: number | null): Promise<void> {
        await this.globalState.update(ConfigKeys.TopP, topP);
        this.logger.info(`Top P ${topP !== null ? `set to: ${topP}` : 'cleared'}`);
    }

    /**
     * Retrieves the organization name from the configuration state manager.
     * 
     * @returns The organization name, or null if not set.
     */
    public getOrganization(): string | null | undefined {
        const org = this.configurationStateManager.getConfig<string>(ConfigKeys.Organization);
        this.logger.debug(`Retrieved organization: ${org || 'Not set'}`);
        return org;
    }

    /**
     * Retrieves the maximum tokens setting from the configuration state manager.
     * 
     * @returns The maximum tokens value, or null if not set.
     */
    public getMaxTokens(): number | null | undefined {
        const maxTokens = this.configurationStateManager.getConfig<number>(ConfigKeys.MaxTokens);
        this.logger.debug(`Retrieved max tokens: ${maxTokens !== undefined ? maxTokens : 'Not set'}`);
        return maxTokens;
    }

    /**
     * Retrieves the temperature setting from the configuration state manager.
     * 
     * @returns The temperature value, or null if not set.
     */
    public getTemperature(): number | null | undefined {
        const temp = this.configurationStateManager.getConfig<number>(ConfigKeys.Temperature);
        this.logger.debug(`Retrieved temperature: ${temp !== undefined ? temp : 'Not set'}`);
        return temp;
    }

    /**
     * Retrieves the top P setting from the configuration state manager.
     * 
     * @returns The top P value, or null if not set.
     */
    public getTopP(): number | null | undefined {
        const topP = this.configurationStateManager.getConfig<number>(ConfigKeys.TopP);
        this.logger.debug(`Retrieved top P: ${topP !== undefined ? topP : 'Not set'}`);
        return topP;
    }

    /**
     * Retrieves the GPT-3 model setting from the configuration state manager.
     * 
     * @returns The GPT-3 model name, or null if not set.
     */
    public getGpt3Model(): string | null | undefined {
        const model = this.configurationStateManager.getConfig<string>(ConfigKeys.Gpt3Model);
        this.logger.debug(`Retrieved GPT-3 model: ${model || 'Not set'}`);
        return model;
    }

    /**
     * Retrieves the model source setting from the configuration state manager.
     * 
     * @returns The model source, or null if not set.
     */
    public getModelSource(): string | null | undefined {
        const source = this.configurationStateManager.getConfig<string>(ConfigKeys.ModelSource);
        this.logger.debug(`Retrieved model source: ${source || 'Not set'}`);
        return source;
    }

    /**
     * Retrieves the custom model name from the configuration state manager.
     * 
     * @returns The custom model name, or null if not set.
     */
    public getCustomModelName(): string | null | undefined {
        const customModel = this.configurationStateManager.getConfig<string>(ConfigKeys.CustomModel);
        this.logger.debug(`Retrieved custom model name: ${customModel || 'Not set'}`);
        return customModel;
    }

    /**
     * Retrieves the API base URL from the configuration state manager.
     * 
     * @returns The API base URL, or null if not set.
     */
    public getApiBaseUrl(): string | null | undefined {
        const baseUrl = this.configurationStateManager.getConfig<string>(ConfigKeys.ApiBaseUrl);
        this.logger.debug(`Retrieved API base URL: ${baseUrl || 'Not set'}`);
        return baseUrl;
    }

    /**
     * Retrieves the model setting from the configuration state manager.
     * 
     * @returns The model name, or null if not set.
     */
    public getModel(): string | null | undefined {
        const model = this.configurationStateManager.getConfig<string>(ConfigKeys.Model);
        this.logger.debug(`Retrieved model: ${model || 'Not set'}`);
        return model;
    }

    /**
     * Checks if the current model is a custom model.
     * 
     * @returns True if the model is custom, otherwise false.
     */
    public isCustomModel(): boolean {
        const isCustom = this.getModel() === "custom";
        this.logger.debug(`Is custom model: ${isCustom}`);
        return isCustom;
    }

    /**
     * Utility for checking if code generation is enabled based on the configuration.
     * 
     * @returns True if code generation is enabled and the model starts with 'code-', otherwise false.
     */
    public isGenerateCodeEnabled(): boolean {
        const generateCodeEnabled = !!this.configurationStateManager.getConfig<boolean>(ConfigKeys.GenerateCodeEnabled);
        const model = this.getModel() ?? '';
        const isEnabled = generateCodeEnabled && model.startsWith('code-');
        this.logger.debug(`Code generation enabled: ${isEnabled}`);
        return isEnabled;
    }
}