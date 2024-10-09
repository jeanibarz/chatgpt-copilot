// src/state/PromptStateManager.ts

/**
 * This module manages the state of prompts used within the extension, 
 * including loading and retrieving different types of prompts based on 
 * user interactions and configurations.
 */

import * as vscode from 'vscode';

import { readFileSync } from "fs";
import path from "path";
import { ConfigKeys, ExtensionConfigPrefix } from "../constants/ConfigKeys";
import { PromptType } from "../constants/PromptType";
import { CoreLogger } from '../logging/CoreLogger';

/**
 * The PromptStateManager class is responsible for managing prompts used 
 * in the extension. It loads prompts from files and provides methods to 
 * retrieve them based on the prompt type.
 * 
 * Key Features:
 * - Loads prompts from specified markdown files.
 * - Provides access to prompts based on their type.
 */
export class PromptStateManager {
    private logger: CoreLogger;
    private prompts: Map<PromptType, string | undefined> = new Map();

    constructor() {
        this.logger = CoreLogger.getInstance();
        this.logger.info('PromptStateManager: Initializing and loading prompts');
        this.loadPrompts();
    }

    /**
     * Loads predefined prompts into the internal map for quick access.
     * This method is called during the construction of the class.
     */
    private loadPrompts() {
        this.logger.info('PromptStateManager: Starting to load predefined prompts');
        this.prompts.set(PromptType.FreeQuestion, this.loadPrompt('freeQuestionDefaultSystemPrompt.md'));
        this.prompts.set(PromptType.GenerateDocstring, this.loadPrompt('generateUpdateDocstringsPrompt.md'));
        this.prompts.set(PromptType.UserGenerateMermaidDiagram, this.loadPrompt('generateMermaidDiagramPrompt.md'));
        this.prompts.set(PromptType.UserContextSelection, this.loadPrompt('contextSelectionExpertDefaultUserPrompt.md'));
        this.prompts.set(PromptType.SystemContextSelection, this.loadPrompt('contextSelectionExpertDefaultSystemPrompt.md'));
        this.prompts.set(PromptType.FilterContentSystemPrompt, this.loadPrompt('filterContentSystemPrompt.md'));
        this.prompts.set(PromptType.FilterContentUserPrompt, this.loadPrompt('filterContentUserPrompt.md'));
        this.prompts.set(PromptType.ScoreFilteredContentsUserPrompt, this.loadPrompt('scoreFilteredContentsUserPrompt.md'));
        this.prompts.set(PromptType.ScoreFilteredContentsSystemPrompt, this.loadPrompt('scoreFilteredContentsSystemPrompt.md'));
        this.logger.info('PromptStateManager: Finished loading predefined prompts');
    }

    /**
     * Loads a prompt from a specified filename.
     * 
     * @param filename - The name of the file containing the prompt.
     * @returns The content of the prompt as a string.
     */
    private loadPrompt(filename: string): string {
        const promptPath = path.join(__dirname, '..', 'config', 'prompts', filename);
        try {
            this.logger.info(`PromptStateManager: Loading prompt from ${promptPath}`);
            const promptContent = readFileSync(promptPath, 'utf-8');
            this.logger.debug(`PromptStateManager: Successfully loaded prompt: ${filename}`);
            return promptContent;
        } catch (error) {
            this.logger.logError(error, `PromptStateManager: Failed to load prompt: ${filename}`, true);
            return '';
        }
    }

    /**
     * Retrieves the prompt associated with a specific type.
     * 
     * @param type - The type of the prompt to retrieve.
     * @returns The prompt string if found, otherwise undefined.
     */
    public getPrompt(type: PromptType): string | undefined {
        const prompt = this.prompts.get(type);
        this.logger.debug(`PromptStateManager: Retrieved prompt for type ${type}: ${prompt ? 'Found' : 'Not found'}`);
        return prompt;
    }

    /**
     * Retrieves the default system prompt for free questions from the 
     * extension configuration.
     * 
     * @returns The default system prompt as a string, or null/undefined if not found.
     */
    public getDefaultSystemPrompt(): string | null | undefined {
        const defaultPrompt = vscode.workspace.getConfiguration(ExtensionConfigPrefix).get<string>(ConfigKeys.DefaultSystemPromptForFreeQuestion);
        this.logger.debug(`PromptStateManager: Retrieved default system prompt: ${defaultPrompt ? 'Found' : 'Not found'}`);
        return defaultPrompt;
    }
}