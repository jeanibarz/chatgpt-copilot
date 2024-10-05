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
        this.loadPrompts();
    }

    /**
     * Loads predefined prompts into the internal map for quick access.
     * This method is called during the construction of the class.
     */
    private loadPrompts() {
        this.prompts.set(PromptType.FreeQuestion, this.loadPrompt('freeQuestionDefaultSystemPrompt.md'));
        this.prompts.set(PromptType.GenerateDocstring, this.loadPrompt('generateUpdateDocstringsPrompt.md'));
        this.prompts.set(PromptType.UserGenerateMermaidDiagram, this.loadPrompt('generateMermaidDiagramPrompt.md'));
        this.prompts.set(PromptType.UserContextSelection, this.loadPrompt('contextSelectionExpertDefaultUserPrompt.md'));
        this.prompts.set(PromptType.SystemContextSelection, this.loadPrompt('contextSelectionExpertDefaultSystemPrompt.md'));
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
            this.logger.info(`Loading prompt from ${promptPath}`);
            return readFileSync(promptPath, 'utf-8');
        } catch (error) {
            this.logger.logError(error, `Failed to load prompt: ${filename}`, true);
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
        return this.prompts.get(type);
    }

    /**
     * Retrieves the default system prompt for free questions from the 
     * extension configuration.
     * 
     * @returns The default system prompt as a string, or null/undefined if not found.
     */
    public getDefaultSystemPrompt(): string | null | undefined {
        return vscode.workspace.getConfiguration(ExtensionConfigPrefix).get<string>(ConfigKeys.DefaultSystemPromptForFreeQuestion);
    }
}