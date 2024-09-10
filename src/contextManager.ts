// File: src/contextManager.ts

import * as fs from 'fs';
import * as path from 'path';
import { ChatGptViewProvider } from './chatgptViewProvider';
import { getConfig } from './config/configuration';

/**
 * The `ContextManager` class is responsible for handling file context retrieval
 * and preparing the necessary context from project files for the ChatGPT view provider.
 */
export class ContextManager {
    private provider: ChatGptViewProvider;

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
                return "";  // Return an empty string if the regex is not set
            }

            // Find matching files
            this.provider.logger.info("Finding matching files");
            const files = await this.findMatchingFiles(inclusionRegex, exclusionRegex);

            // Get the content of the matched files
            this.provider.logger.info("Retrieving file content");
            const contextContent = await this.getFilesContent(files);

            // Generate context for prompt
            const formattedContext = this.generateFormattedContext(contextContent);

            return formattedContext;
        } catch (error) {
            this.provider.logger.logError(error, "retrieveContextForPrompt");
            throw error; // Rethrow the error if necessary
        }
    }

    /**
     * Generates a formatted context string from the content of files.
     * The context is structured with a title and section headers for each file's content.
     * 
     * @param fileContents - A string containing the content of files, 
     *                      where each file's content is separated by double new lines.
     * @returns A string that represents the formatted context, ready for use in a prompt.
     */
    private generateFormattedContext(fileContents: string): string {
        // Split by double new lines to handle separate file contents
        const contentSections = fileContents.split('\n\n');

        // Prepend a title for the context
        const contextTitle = "### Context from Project Files:\n\n";

        // Format each section with index for better context understanding
        const formattedContents = contentSections.map((content, idx) => {
            return `#### File ${idx + 1}:\n${content}`;
        }).join('\n\n'); // Join the formatted contents with double new lines

        return contextTitle + formattedContents; // Combine title and contents
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
            // Retrieve the explicitly added files/folders from global state
            const explicitFiles = this.provider.getContext().globalState.get<string[]>('chatgpt.explicitFiles', []);
            this.provider.logger.info("Explicit files and folders", { explicitFiles });

            if (explicitFiles.length === 0) {
                this.provider.logger.info('No files or folders are explicitly added to the ChatGPT context.');
                return [];
            }

            this.provider.logger.info("Finding matching files with inclusion pattern", { inclusionPattern, exclusionPattern });

            const inclusionRegex = new RegExp(inclusionPattern);
            const exclusionRegex = exclusionPattern ? new RegExp(exclusionPattern) : null;

            // Helper function to recursively collect all files from a folder
            const walk = (dir: string, fileList: string[] = []): string[] => {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const fullPath = path.join(dir, file);
                    if (fs.statSync(fullPath).isDirectory()) {
                        walk(fullPath, fileList);
                    } else {
                        fileList.push(fullPath);
                    }
                });
                return fileList;
            };

            let allFiles: string[] = [];

            // Go through each explicitly added file/folder
            for (const filePath of explicitFiles) {
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    // If it's a directory, add all the files within the folder
                    allFiles = allFiles.concat(walk(filePath));
                } else {
                    // If it's a file, just add it to the list
                    allFiles.push(filePath);
                }
            }

            // Filter files based on the inclusion and exclusion patterns
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
     * Each file's content is prefixed with its relative path.
     * 
     * @param files - An array of file paths to retrieve content from.
     * @returns A Promise that resolves to a string containing the formatted content of the files.
     */
    private async getFilesContent(files: string[]): Promise<string> {
        const fileContents: string[] = [];

        for (const file of files) {
            const relativePath = path.relative("/home/jean/git/chatgpt-copilot", file); // Adjust the root path accordingly
            const content = fs.readFileSync(file, 'utf-8');
            fileContents.push(`// -----\n// File: ${relativePath}\n// Content below: ${content}\n-----`);
        }

        return fileContents.join('\n\n'); // Join all file contents with double line breaks
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
