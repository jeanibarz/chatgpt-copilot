// src/services/ContextManager.ts

/**
 * This module manages the retrieval and preparation of file context for the ChatGPT view provider 
 * within a VS Code extension. The `ContextManager` class is responsible for handling file context 
 * retrieval and preparing the necessary context from project files.
 * 
 * Key Features:
 * - Retrieves additional context from the codebase to be included in the prompt.
 * - Supports filtering of files based on inclusion and exclusion patterns.
 * - Formats file contents for easy integration into prompts for the AI model.
 */

import { inject, injectable, LazyServiceIdentifer } from "inversify";
import { ExtensionContext } from "vscode";
import { RenderMethod } from "../interfaces";
import TYPES from "../inversify.types";
import { CoreLogger } from '../logging/CoreLogger';
import { FilteredTreeDataProvider } from "../tree/FilteredTreeDataProvider";
import { ContextRetriever } from './ContextRetriever';

/**
 * The `ContextManager` class is responsible for managing the retrieval and preparation of file context 
 * for the ChatGPT view provider. It utilizes the `ContextRetriever` and `DocstringExtractor` to 
 * fetch relevant context and extract documentation strings from project files.
 * 
 * Key Features:
 * - Retrieves context needed for AI prompts from project files.
 * - Extracts docstrings from matched files for enhanced prompt context.
 */
@injectable()
export class ContextManager {
    private logger: CoreLogger = CoreLogger.getInstance();

    /**
     * Constructor for the `ContextManager` class.
     * Initializes a new instance with the injected dependencies.
     * 
     * @param contextRetriever - An instance of `ContextRetriever` for retrieving file contexts.
     * @param docstringExtractor - An instance of `DocstringExtractor` for extracting docstrings from files.
     * @param treeDataProvider - An instance of `FilteredTreeDataProvider` for managing the project tree.
     * @param logger - An instance of `CoreLogger` for logging.
     * @param fileManager - An instance of `FileManager` for file operations.
     */
    constructor(
        @inject(new LazyServiceIdentifer(() => TYPES.ContextRetriever)) private contextRetriever: ContextRetriever,
        @inject(new LazyServiceIdentifer(() => TYPES.FilteredTreeDataProvider)) public treeDataProvider: FilteredTreeDataProvider,
        @inject(TYPES.ExtensionContext) private extensionContext: ExtensionContext,
    ) { }

    /**
     * Constructs the complete prompt for the AI assistant.
     * 
     * @param userQuestion - The user's question.
     * @returns A promise that resolves to the complete prompt string.
     */
    public async constructPrompt(userQuestion: string): Promise<string> {
        try {
            const projectOverview = await this.generateProjectOverview(RenderMethod.FullPathDetails);
            const includedContent = await this.generateIncludedContent();

            const prompt = `
### PROJECT OVERVIEW:

${projectOverview}

### CONTENT:

${includedContent}

### USER QUESTION:

${userQuestion}

### INSTRUCTIONS:

- Use the project structure and included content to inform your answer.
- Do not make assumptions about content not included.
- Provide clear and concise guidance based on the available information.
`;

            return prompt.trim();
        } catch (error) {
            this.logger.error(`Error constructing prompt: ${error instanceof Error ? error.message : String(error)}`, { error });
            throw new Error("Failed to construct prompt.");
        }
    }

    /**
    * Generates the PROJECT OVERVIEW section using the detailed rendering method.
    * This overview includes the inclusion status of all files, folders, and symbols.
    * 
    * @param renderMethod - The method used to render the project overview.
    * @returns A promise that resolves to a formatted string representing the project overview.
    */
    public async generateProjectOverview(renderMethod: RenderMethod): Promise<string> {
        try {
            return await this.treeDataProvider.renderTree(renderMethod);
        } catch (error) {
            this.logger.error(`Error generating project overview: ${error instanceof Error ? error.message : String(error)}`, { error });
            return 'Failed to generate project overview.';
        }
    }

    /**
     * Retrieves the content of the specified files.
     * 
     * @param files - An array of file paths to read.
     * @returns A promise that resolves to a string containing the combined content from the files.
     */
    public async getFilesContent(files: Set<string>): Promise<string> {
        try {
            if (!files || files.size === 0) {
                this.logger.warn('No files provided for content retrieval.');
                return '';
            }
            return await this.contextRetriever.getFilesContent(files);
        } catch (error) {
            this.logger.error(`Error getting files content: ${error instanceof Error ? error.message : String(error)}`, { error, files });
            return '';
        }
    }

    /**
     * Retrieves the matched files based on user-defined patterns.
     * 
     * @returns A promise that resolves to an array of matched file paths.
     */
    public async generateIncludedContent(): Promise<string> {
        try {
            const explicitFiles = this.extensionContext.globalState.get<string[]>('chatgpt.explicitFiles', []);
            return await this.contextRetriever.retrieveContextForPrompt(explicitFiles);
        } catch (error) {
            this.logger.error(`Error generating included content: ${error instanceof Error ? error.message : String(error)}`, { error });
            return '';
        }
    }
}