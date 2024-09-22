// ./services/ContextRetriever.ts

import { getConfig } from '../config/Configuration';
import { CoreLogger } from "../logging/CoreLogger";
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';
import { FileContentFormatter } from './FileContentFormatter';
import { FileManager } from './FileManager';

/**
 * The `ContextRetriever` class is responsible for retrieving file contexts 
 * based on user-defined inclusion and exclusion patterns. It interacts with 
 * the `FileManager` to find and read the appropriate files and formats 
 * their contents for use in prompts.
 * 
 * Key Features:
 * - Retrieves context based on configured regex patterns.
 * - Reads file contents and formats them for integration into prompts.
 */
export class ContextRetriever {
    private logger = CoreLogger.getInstance();
    private provider: ChatGptViewProvider;
    private fileManager: FileManager;
    private regexConfigs: { inclusionRegex: string; exclusionRegex?: string; };
    private fileContentFormatter: FileContentFormatter;

    /**
     * Constructor for the `ContextRetriever` class.
     * Initializes a new instance with the provided ChatGptViewProvider and FileManager.
     * 
     * @param provider - An instance of `ChatGptViewProvider` for managing interactions.
     * @param fileManager - An instance of `FileManager` for file operations.
     */
    constructor(provider: ChatGptViewProvider, fileManager: FileManager) {
        this.provider = provider;
        this.fileManager = fileManager;
        this.regexConfigs = this.getRegexConfigs();
        this.fileContentFormatter = new FileContentFormatter();
    }

    /**
     * Retrieves regex configurations for file inclusion and exclusion.
     * 
     * @returns An object containing inclusion and exclusion regex patterns.
     */
    private getRegexConfigs() {
        return {
            inclusionRegex: getConfig<string>("fileInclusionRegex") ?? ".*",
            exclusionRegex: getConfig<string>("fileExclusionRegex")
        };
    }

    /**
     * Gets the list of matched files based on inclusion and exclusion regex patterns.
     * 
     * @returns An array of file paths that match the regex patterns.
     */
    public getMatchedFiles(): string[] {
        const { inclusionRegex, exclusionRegex } = this.regexConfigs;
        const explicitFiles = this.provider.getContext().globalState.get<string[]>('chatgpt.explicitFiles', []);
        return this.fileManager.findMatchingFiles(
            explicitFiles,
            new RegExp(inclusionRegex),
            exclusionRegex ? new RegExp(exclusionRegex) : undefined
        );
    }

    /**
     * Retrieves the content of the specified files.
     * 
     * @param files - An array of file paths to read.
     * @returns A promise that resolves to a string containing the combined content from the files.
     */
    public async getFilesContent(files: Set<string>): Promise<string> {
        const fileContents: string[] = [];
        const contextTitle = "### Context from Project Files:\n\n";

        let totalLines = 0;
        for (const file of files) {
            try {
                const { content, lineCount } = await this.fileManager.readFileContentWithLineCount(file);
                fileContents.push(this.fileContentFormatter.formatFileContent(file, content));
                totalLines += lineCount;
            } catch (error) {
                this.logger.error(`Error reading file: ${file}`, { error });
            }
        }

        this.logger.info(`Added ${files.size} files to context. Total lines: ${totalLines}.`);
        return contextTitle + fileContents.join('\n\n');
    }

    /**
     * Retrieves context for the prompt by finding and reading matching files.
     * 
     * @returns A promise that resolves to a string containing the combined content from matched files.
     * @throws An error if context retrieval fails.
     */
    public async retrieveContextForPrompt(): Promise<string> {
        try {
            this.logger.info("Finding matching files");
            const matchedFiles = new Set(this.getMatchedFiles());
            return await this.getFilesContent(matchedFiles);
        } catch (error) {
            this.logger.logError(error, "retrieveContextForPrompt");
            throw new Error("Failed to retrieve context for prompt");
        }
    }
}