// ./services/ContextManager.ts

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

import * as vscode from 'vscode';
import { ITreeNode, RenderMethod } from "../interfaces";
import { CoreLogger } from '../logging/CoreLogger';
import { FilteredTreeDataProvider } from "../tree/FilteredTreeDataProvider";
import { ContextRetriever } from './ContextRetriever';
import { DocstringExtractor } from './DocstringExtractor';
import { FileContentFormatter } from './FileContentFormatter';
import { FileManager } from "./FileManager";

/**
 * The `ContextManager` class is responsible for managing the retrieval and preparation of file context 
 * for the ChatGPT view provider. It utilizes the `ContextRetriever` and `DocstringExtractor` to 
 * fetch relevant context and extract documentation strings from project files.
 * 
 * Key Features:
 * - Retrieves context needed for AI prompts from project files.
 * - Extracts docstrings from matched files for enhanced prompt context.
 */
export class ContextManager {
    private logger = CoreLogger.getInstance();
    private contextRetriever: ContextRetriever;
    private docstringExtractor: DocstringExtractor;
    public treeDataProvider: FilteredTreeDataProvider;
    private fileContentFormatter: FileContentFormatter;
    private fileManager: FileManager;

    /**
     * Constructor for the `ContextManager` class.
     * Initializes a new instance with the provided ChatGptViewProvider.
     * 
     * @param contextRetriever - An instance of `ContextRetriever` for retrieving file contexts.
     * @param docstringExtractor - An instance of `DocstringExtractor` for extracting docstrings from files.
     * @param treeDataProvider - An instance of `MyTreeDataProvider` for managing the project tree.
     */
    constructor(
        contextRetriever: ContextRetriever,
        docstringExtractor: DocstringExtractor,
        treeDataProvider: FilteredTreeDataProvider
    ) {
        this.contextRetriever = contextRetriever;
        this.docstringExtractor = docstringExtractor;
        this.treeDataProvider = treeDataProvider;
        this.fileContentFormatter = new FileContentFormatter();
        this.fileManager = new FileManager();
    }

    // /**
    //  * Retrieves the context needed for the prompt from the files.
    //  * 
    //  * @returns A promise that resolves to a string containing the context for the prompt.
    //  */
    // public async retrieveContextForPrompt(): Promise<string> {
    //     try {
    //         const matchedFiles = this.treeDataProvider.getMatchedFiles();
    //         if (!matchedFiles || matchedFiles.size === 0) {
    //             this.logger.warn("No matched files found in the tree structure.");
    //             return "No context available.";
    //         }
    //         return await this.contextRetriever.getFilesContent(matchedFiles);
    //     } catch (error) {
    //         this.logger.error(`Failed to retrieve context for prompt: ${error instanceof Error ? error.message : String(error)}`, { error });
    //         throw new Error("Context retrieval failed.");
    //     }
    // }

    // /**
    //  * Extracts the content and docstring for a specified method from the provided node.
    //  * 
    //  * @param node - The node representing the method to extract content from.
    //  * @returns A promise that resolves to an object containing the file path, content, and docstring of the method.
    //  */
    // public async extractMethodContent(node: ITreeNode): Promise<{ filePath: string; content: string; docstring: string | null; }> {
    //     try {
    //         const fileNode = this.treeDataProvider.findNodeByPath(node.path, true);

    //         if (fileNode && node.type === 'symbol') {
    //             const content = await this.getMethodContent(fileNode.path, node.label);
    //             const docstring = await this.docstringExtractor.extractMethodDocstring(fileNode.path, node.label);
    //             return { filePath: fileNode.path, content, docstring };
    //         }

    //         this.logger.warn(`Invalid node for extracting method content: ${node.path}`);
    //         return { filePath: '', content: '', docstring: null }; // Handle cases where the node is not valid
    //     } catch (error) {
    //         this.logger.error(`Error extracting method content: ${error instanceof Error ? error.message : String(error)}`, { error, node });
    //         return { filePath: '', content: '', docstring: null };
    //     }
    // }

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

    // /**
    //  * Generates the CONTENT section, which includes the actual contents of files or symbols 
    //  * that are marked as 'Included'.
    //  * 
    //  * @returns A promise that resolves to a formatted string containing the included content.
    //  */
    // public async generateIncludedContent(): Promise<string> {
    //     try {
    //         const rootNodes = await this.treeDataProvider.getChildren();
    //         let includedContent = '';

    //         const traverse = async (nodes: ITreeNode[], path: string) => {
    //             for (const node of nodes) {
    //                 const currentPath = path ? `${path}/${node.label}` : node.label;

    //                 if (node.content === InclusionState.Included) {
    //                     if (node.type === 'file') {
    //                         includedContent += `#### Path: ${currentPath}\n\n`;
    //                         includedContent += '```' + this.getLanguageTag(node.label) + '\n';
    //                         const content = await this.getFullFileContent(node);
    //                         includedContent += `${content}\n`;
    //                         includedContent += '```\n\n';
    //                     }
    //                 }

    //                 if (node.children && node.children.length > 0) {
    //                     await traverse(node.children, currentPath);
    //                 }
    //             }
    //         };

    //         await traverse(rootNodes, '');
    //         return includedContent.trim() || 'No included content.';
    //     } catch (error) {
    //         this.logger.error(`Error generating included content: ${error instanceof Error ? error.message : String(error)}`, { error });
    //         return 'Failed to generate included content.';
    //     }
    // }

    /**
     * Retrieves the full content of a file.
     * 
     * @param node - The TreeNode representing the file.
     * @returns The content of the file as a string.
     */
    private async getFullFileContent(node: ITreeNode): Promise<string> {
        try {
            return await this.fileManager.readFileContent(node.path);
        } catch (error) {
            this.logger.error(`Error reading file content for ${node.path}: ${error instanceof Error ? error.message : String(error)}`, { error });
            return '// Error retrieving content.';
        }
    }

    /**
     * Determines the language tag based on the file extension.
     * 
     * @param fileName - The name of the file.
     * @returns The appropriate language tag for syntax highlighting.
     */
    private getLanguageTag(fileName: string): string {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'ts':
            case 'tsx':
                return 'typescript';
            case 'js':
            case 'jsx':
                return 'javascript';
            case 'py':
                return 'python';
            // Add more cases as needed
            default:
                return ''; // No specific language
        }
    }

    /**
     * Retrieves the content of a specified method based on its name and file path.
     * 
     * @param filePath - The path of the file containing the method.
     * @param methodName - The name of the method to retrieve content for.
     * @returns A promise that resolves to a string containing the method's content.
     */
    private async getMethodContent(filePath: string, methodName: string): Promise<string> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const lines = document.getText().split('\n');
            const methodRegex = new RegExp(`^\\s*(async\\s+)?(function\\s+)?${methodName}\\s*\\(`); // Regex to find method declaration
            let methodContent = '';
            let inMethodBody = false;
            let braceCount = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (methodRegex.test(line)) {
                    methodContent += line + '\n'; // Include the method declaration
                    inMethodBody = true;
                    braceCount += (line.match(/\{/g) || []).length; // Count opening braces
                    braceCount -= (line.match(/\}/g) || []).length; // Count closing braces
                } else if (inMethodBody) {
                    methodContent += line + '\n';
                    braceCount += (line.match(/\{/g) || []).length;
                    braceCount -= (line.match(/\}/g) || []).length;

                    if (braceCount === 0) {
                        break; // Exit once the method body is fully captured
                    }
                }
            }

            return methodContent.trim();
        } catch (error) {
            this.logger.error(`Error retrieving method content from ${filePath}: ${error instanceof Error ? error.message : String(error)}`, { error });
            return '// Error retrieving method content.';
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
     * @returns An array of matched file paths.
     */
    public getMatchedFiles(): string[] {
        try {
            const matchedFiles = this.contextRetriever.getMatchedFiles();
            return matchedFiles || [];
        } catch (error) {
            this.logger.error(`Error retrieving matched files: ${error instanceof Error ? error.message : String(error)}`, { error });
            return [];
        }
    }
}