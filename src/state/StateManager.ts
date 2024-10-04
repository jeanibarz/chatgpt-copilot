// src/state/StateManager.ts

import { readFileSync } from "fs";
import path from "path";
import * as vscode from 'vscode';
import { CoreLogger } from '../logging/CoreLogger';

export const ExtensionConfigPrefix = 'chatgpt';
export enum ConfigKeys {
    ApiKey = 'chatgpt-gpt3-apiKey',
    PromptPrefix = 'promptPrefix',
    JsonCredentialsPath = 'gpt3.jsonCredentialsPath',
    MermaidOutputFolder = 'mermaidOutputFolder',
    SessionToken = 'chatgpt-session-token',
    ClearanceToken = 'chatgpt-clearance-token',
    CustomModel = 'gpt3.customModel',
    UserAgent = 'chatgpt-user-agent',
    AdhocPrompt = 'chatgpt-adhoc-prompt',
    Organization = 'gpt3.organization',
    MaxTokens = 'gpt3.maxTokens',
    Temperature = 'gpt3.temperature',
    TopP = 'gpt3.top_p',
    SystemPrompt = 'chatgpt.systemPrompt',
    GenerateCodeEnabled = 'gpt3.generateCode-enabled',
    Gpt3Model = 'gpt3.model',
    AutoScroll = 'response.autoScroll',
    ShowNotification = 'response.showNotification',
    Model = 'gpt3.model',
    ModelSource = 'gpt3.modelSource',
    ApiBaseUrl = 'gpt3.apiBaseUrl',
    FileInclusionRegex = 'fileInclusionRegex',
    FileExclusionRegex = 'fileExclusionRegex',
    DefaultSystemPromptForFreeQuestion = 'defaultSystemPromptForFreeQuestion'
}

export enum PromptType {
    FreeQuestion = 'freeQuestionDefaultSystemPrompt',
    GenerateDocstring = 'generateUpdateDocstringsPrompt',
    UserGenerateMermaidDiagram = 'generateMermaidDiagramPrompt',
    UserContextSelection = 'contextSelectionExpertDefaultUserPrompt',
    SystemContextSelection = 'contextSelectionExpertDefaultSystemPrompt'
}

export class StateManager {
    private static instance: StateManager;
    private logger: CoreLogger;
    private globalState: vscode.Memento;
    private extensionContext: vscode.ExtensionContext;
    private prompts: Map<PromptType, string | undefined> = new Map();

    private constructor(extensionContext: vscode.ExtensionContext) {
        this.logger = CoreLogger.getInstance();
        this.globalState = extensionContext.globalState;
        this.extensionContext = extensionContext;
    }

    public static initialize(extensionContext: vscode.ExtensionContext): void {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager(extensionContext);
            StateManager.instance.loadPrompts();
        }
    }

    public static getInstance(): StateManager {
        if (!StateManager.instance) {
            throw new Error('StateManager not initialized. Call initialize() first.');
        }
        return StateManager.instance;
    }

    /**
     * Loads the default prompts from files into a map, keyed by the prompt type.
     */
    private loadPrompts() {
        this.prompts.set(PromptType.FreeQuestion, this.loadPrompt('freeQuestionDefaultSystemPrompt.md'));
        this.prompts.set(PromptType.GenerateDocstring, this.loadPrompt('generateUpdateDocstringsPrompt.md'));
        this.prompts.set(PromptType.UserGenerateMermaidDiagram, this.loadPrompt('generateMermaidDiagramPrompt.md'));
        this.prompts.set(PromptType.UserContextSelection, this.loadPrompt('contextSelectionExpertDefaultUserPrompt.md'));
        this.prompts.set(PromptType.SystemContextSelection, this.loadPrompt('contextSelectionExpertDefaultSystemPrompt.md'));
    }

    /**
     * Loads a prompt from the specified markdown file.
     * 
     * @param filename - The file name containing the prompt.
     * @returns The prompt as a string.
     */
    private loadPrompt(filename: string): string {
        const promptPath = path.join(__dirname, '..', 'config', 'prompts', filename);
        try {
            CoreLogger.getInstance().info(`Loading prompt from ${promptPath}`);
            return readFileSync(promptPath, 'utf-8');
        } catch (error) {
            CoreLogger.getInstance().logError(error, `Failed to load prompt: ${filename}`, true);
            return '';
        }
    }

    /**
     * Retrieves the prompt based on the provided PromptType.
     * 
     * @param type - The type of the prompt to retrieve.
     * @returns The prompt as a string or undefined if not found.
     */
    public getPrompt(type: PromptType): string | undefined {
        return this.prompts.get(type);
    }

    /**
     * Retrieves a configuration value based on the specified key.
     * 
     * @param key - The configuration key to look up.
     * @param defaultValue - The default value if not found.
     * @returns The configuration value or default value.
     */
    public getConfig<T>(key: string, defaultValue?: T): T {
        const configValue = vscode.workspace.getConfiguration("chatgpt").get<T>(key);
        return configValue !== undefined ? configValue : (defaultValue as T);
    }

    /**
     * Retrieves a required configuration value.
     * 
     * @param key - The configuration key.
     * @returns The configuration value.
     * @throws Error if the key is not found.
     */
    public getRequiredConfig<T>(key: string): T {
        const value = this.getConfig<T>(key);
        if (value === undefined) {
            const errorMessage = `Configuration value for "${key}" is required but not found.`;
            CoreLogger.getInstance().error(errorMessage);
            throw new Error(errorMessage);
        }
        return value;
    }

    /**
     * Registers a callback to be invoked when the configuration changes.
     * 
     * @param callback - The callback function to invoke.
     */
    public onConfigurationChanged(callback: () => void): void {
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration("chatgpt")) {
                CoreLogger.getInstance().info('Configuration for "chatgpt" changed.');
                callback();
            }
        });
    }

    public getExtensionContext(): vscode.ExtensionContext {
        return this.extensionContext;
    }

    // API Key management
    public getApiKey(): string | null | undefined {
        return this.globalState.get<string>(ConfigKeys.ApiKey);
    }

    public async setApiKey(apiKey: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.ApiKey, apiKey);
    }

    public getJsonCredentialsPath(): string | null | undefined {
        return this.globalState.get<string>(ConfigKeys.JsonCredentialsPath);
    }

    public async setJsonCredentialsPath(path: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.JsonCredentialsPath, path);
    }

    // Mermaid output folder handling
    public getMermaidOutputFolder(): string | null | undefined {
        return this.globalState.get<string>(ConfigKeys.MermaidOutputFolder);
    }

    public async setMermaidOutputFolder(folderPath: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.MermaidOutputFolder, folderPath);
    }

    // Session tokens handling
    public getSessionToken(): string | null | undefined {
        return this.globalState.get<string>(ConfigKeys.SessionToken);
    }

    public async setSessionToken(token: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.SessionToken, token);
    }

    public getClearanceToken(): string | null | undefined {
        return this.globalState.get<string>(ConfigKeys.ClearanceToken);
    }

    public async setClearanceToken(token: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.ClearanceToken, token);
    }

    public getUserAgent(): string | null | undefined {
        return this.globalState.get<string>(ConfigKeys.UserAgent);
    }

    public async setUserAgent(agent: string | null): Promise<void> {
        await this.globalState.update(ConfigKeys.UserAgent, agent);
    }

    // Command prefixes management (like adhocCommandPrefix)
    public getAdhocCommandPrefix(): string | null | undefined {
        return this.globalState.get<string>(ConfigKeys.AdhocPrompt);
    }

    public async setAdhocCommandPrefix(prefix: string): Promise<void> {
        await this.globalState.update(ConfigKeys.AdhocPrompt, prefix);
    }

    // Manage enable/disable context for commands
    public async setCommandEnabledState(command: string, enabled: boolean): Promise<void> {
        await vscode.commands.executeCommand('setContext', `${command}-enabled`, enabled);
    }

    // Utility for checking if code generation is enabled
    public isGenerateCodeEnabled(): boolean {
        const generateCodeEnabled = !!vscode.workspace.getConfiguration('chatgpt').get<boolean>('gpt3.generateCode-enabled');
        const modelName = vscode.workspace.getConfiguration('chatgpt').get('gpt3.model') as string;
        return generateCodeEnabled && modelName.startsWith('code-');
    }

    public async setOrganization(organization: string | null): Promise<void> {
        await this.globalState.update('chatgpt-gpt3.organization', organization);
    }

    public async setMaxTokens(maxTokens: number | null): Promise<void> {
        await this.globalState.update(`chatgpt-${ConfigKeys.MaxTokens}`, maxTokens);
    }

    public async setTemperature(temperature: number | null): Promise<void> {
        await this.globalState.update('chatgpt-gpt3.temperature', temperature);
    }

    public async setSystemPrompt(systemPrompt: string | null): Promise<void> {
        await this.globalState.update('chatgpt.systemPrompt', systemPrompt);
    }

    public async setTopP(topP: number | null): Promise<void> {
        await this.globalState.update('chatgpt.gpt3.top_p', topP);
    }

    public getGpt3Model(): string | null | undefined {
        return vscode.workspace.getConfiguration('chatgpt').get<string>('gpt3.model');
    }

    public getAutoScrollSetting(): boolean | null | undefined {
        return !!vscode.workspace.getConfiguration('chatgpt').get<boolean>('response.autoScroll');
    }

    public getShowNotification(): boolean | null | undefined {
        return vscode.workspace.getConfiguration('chatgpt').get<boolean>('response.showNotification');
    }

    public getModelSource(): string | null | undefined {
        return vscode.workspace.getConfiguration('chatgpt').get<string>('gpt3.modelSource');
    }

    public getApiBaseUrl(): string | null | undefined {
        return vscode.workspace.getConfiguration('chatgpt').get<string>('gpt3.apiBaseUrl');
    }

    public getInclusionRegex(): string | null | undefined {
        return vscode.workspace.getConfiguration('chatgpt').get<string>('fileInclusionRegex');
    }

    public getExclusionRegex(): string | null | undefined {
        return vscode.workspace.getConfiguration('chatgpt').get<string>('fileExclusionRegex');
    }

    /**
     * Retrieves the organization associated with the AI model.
     * @returns {string} The organization from the workspace configuration.
     */
    public getOrganization(): string | null | undefined {
        return vscode.workspace.getConfiguration("chatgpt").get<string>("gpt3.organization");
    }

    /**
     * Retrieves the max tokens setting for the AI model.
     * @returns {number} The maximum number of tokens from the workspace configuration.
     */
    public getMaxTokens(): number | null | undefined {
        return vscode.workspace.getConfiguration("chatgpt").get<number>(ConfigKeys.MaxTokens);
    }

    /**
     * Retrieves the temperature setting for the AI model.
     * @returns {number} The temperature setting from the workspace configuration.
     */
    public getTemperature(): number | null | undefined {
        return vscode.workspace.getConfiguration("chatgpt").get<number>("gpt3.temperature");
    }

    /**
     * Retrieves the top-p (nucleus sampling) setting for the AI model.
     * @returns {number} The top-p setting from the workspace configuration.
     */
    public getTopP(): number | null | undefined {
        return vscode.workspace.getConfiguration("chatgpt").get<number>("gpt3.top_p");
    }

    /**
     * Retrieves the default system prompt to guide the AI model's behavior.
     * @returns {string} The default system prompt from the workspace configuration.
     */
    public getDefaultSystemPrompt(): string | null | undefined {
        return vscode.workspace.getConfiguration("chatgpt").get<string>(ConfigKeys.DefaultSystemPromptForFreeQuestion);
    }
}
