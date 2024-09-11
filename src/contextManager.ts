import * as fs from 'fs';
import * as path from 'path';
import * as vscode from "vscode";
import { ChatGptViewProvider } from './chatgptViewProvider';
import { getConfig } from './config/configuration';

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

export class ContextManager {
    private provider: ChatGptViewProvider; // The ChatGptViewProvider instance for managing context

    /**
     * Constructor for the `ContextManager` class.
     * Initializes a new instance with the provided ChatGptViewProvider.
     * 
     * @param provider - An instance of `ChatGptViewProvider` for managing interactions.
     */
    constructor(provider: ChatGptViewProvider) {
        this.provider = provider;
    }

    /**
     * Retrieves additional context from the codebase to be included in the prompt.
     * This function finds files that match the inclusion pattern and retrieves their content.
     * 
     * @returns A Promise that resolves to a string containing the formatted content.
     */
    public async retrieveContextForPrompt(): Promise<string> {
        try {
            const inclusionRegex = getConfig<string>("fileInclusionRegex");
            const exclusionRegex = getConfig<string>("fileExclusionRegex");

            if (!inclusionRegex) {
                this.provider.logger.info("Inclusion regex is not set in the configuration.");
                return "";  
            }

            this.provider.logger.info("Finding matching files");
            const files = await this.findMatchingFiles(inclusionRegex, exclusionRegex);

            this.provider.logger.info("Retrieving file content");
            return await this.getFilesContent(files);
        } catch (error) {
            this.provider.logger.logError(error, "retrieveContextForPrompt");
            throw error;
        }
    }

    /**
     * Recursively walks through the specified directory and collects file paths.
     * 
     * @param dir - The directory to walk through.
     * @param fileList - An array to accumulate the file paths (default is an empty array).
     * @returns An array of file paths found in the directory.
     */
    private walk(dir: string, fileList: string[] = []): string[] {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                this.walk(fullPath, fileList);
            } else {
                fileList.push(fullPath);
            }
        }
        return fileList;
    }

    /**
     * Finds files in the explicitly added files/folders that match the inclusion pattern and do not match the exclusion pattern.
     * 
     * @param inclusionPattern - Regex pattern to include files.
     * @param exclusionPattern - Optional regex pattern to exclude files.
     * @returns A Promise that resolves to an array of matching file paths.
     */
    public async findMatchingFiles(inclusionPattern: string, exclusionPattern?: string): Promise<string[]> {
        try {
            const explicitFiles = this.provider.getContext().globalState.get<string[]>('chatgpt.explicitFiles', []);
            this.provider.logger.info("Explicit files and folders", { explicitFiles });

            if (explicitFiles.length === 0) {
                this.provider.logger.info('No files or folders are explicitly added to the ChatGPT context.');
                return [];
            }

            this.provider.logger.info("Matching files with inclusion pattern", { inclusionPattern, exclusionPattern });

            const inclusionRegex = new RegExp(inclusionPattern);
            const exclusionRegex = exclusionPattern ? new RegExp(exclusionPattern) : null;

            let allFiles: string[] = [];

            for (const filePath of explicitFiles) {
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    allFiles = allFiles.concat(this.walk(filePath));
                } else {
                    allFiles.push(filePath);
                }
            }

            const matchedFiles = allFiles.filter(file => {
                const isFileIncluded = inclusionRegex.test(file);
                const isFileExcluded = exclusionRegex ? exclusionRegex.test(file) : false;
                return isFileIncluded && !isFileExcluded;
            });

            this.provider.logger.info("Matched files", { matchedFiles });
            return matchedFiles;
        } catch (error) {
            this.provider.logger.error("Error while finding matching files", { error });
            throw error;
        }
    }

    /**
     * Retrieves the content of specified files and formats them for inclusion in a prompt to the AI model.
     * Each file's content is prefixed with its full path and an index for better clarity.
     * 
     * @param files - An array of file paths to retrieve content from.
     * @returns A Promise that resolves to a string containing the formatted content of the files.
     */
    private async getFilesContent(files: string[]): Promise<string> {
        const fileContents: string[] = [];
        const contextTitle = "### Context from Project Files:\n\n";  // Main title for the context

        for (let idx = 0; idx < files.length; idx++) {
            try {
                const file = files[idx];
                const content = fs.readFileSync(file, 'utf-8');

                // Use the full file path in the output
                fileContents.push(
                    `#### File ${idx + 1}:\n// Full Path: ${file}\n// Content below:\n${content}\n-----`
                );
            } catch (error) {
                this.provider.logger.error(`Error reading file: ${files[idx]}`, { error });
            }
        }

        return contextTitle + fileContents.join('\n\n');  // Join all file contents with double line breaks and prepend the title
    }

    /**
     * Counts the number of lines in a specified file.
     * 
     * @param filePath - The path of the file to count lines in.
     * @returns The number of lines in the file.
     */
    public static getLineCount(filePath: string): number {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return fileContent.split('\n').length;
    }
}