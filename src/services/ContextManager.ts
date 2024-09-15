import { getConfig } from '../config/Configuration';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';
import { FileManager } from './FileManager';

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
    private contextRetriever: ContextRetriever;
    private docstringExtractor: DocstringExtractor;
    
    /**
     * Constructor for the `ContextManager` class.
     * Initializes a new instance with the provided ChatGptViewProvider.
     * 
     * @param contextRetriever - An instance of `ContextRetriever` for retrieving file contexts.
     * @param docstringExtractor - An instance of `DocstringExtractor` for extracting docstrings from files.
     */
    constructor(
        contextRetriever: ContextRetriever,
        docstringExtractor: DocstringExtractor
    ) {
        this.contextRetriever = contextRetriever;
        this.docstringExtractor = docstringExtractor;
    }

    /**
     * Retrieves the context needed for the prompt from the files.
     * 
     * @returns A promise that resolves to a string containing the context for the prompt.
     */
    public async retrieveContextForPrompt(): Promise<string> {
        return await this.contextRetriever.retrieveContextForPrompt();
    }

    /**
     * Extracts docstrings from the matched files.
     * 
     * @returns A promise that resolves to an array of objects containing file paths and their respective docstrings.
     */
    public async extractDocstrings(): Promise<{ filePath: string; docstring: string }[]> {
        const matchedFiles = await this.contextRetriever.getMatchedFiles();
        return await this.docstringExtractor.extractModuleDocstrings(matchedFiles);
    }
}

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
    private provider: ChatGptViewProvider;
    private fileManager: FileManager;
    private regexConfigs: { inclusionRegex: string; exclusionRegex?: string };
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
     * Retrieves context for the prompt by finding and reading matching files.
     * 
     * @returns A promise that resolves to a string containing the combined content from matched files.
     * @throws An error if context retrieval fails.
     */
    public async retrieveContextForPrompt(): Promise<string> {
        try {
            this.provider.logger.info("Finding matching files");
            const matchedFiles = this.getMatchedFiles();
            return await this.getFilesContent(matchedFiles);
        } catch (error) {
            this.provider.logger.logError(error, "retrieveContextForPrompt");
            throw new Error("Failed to retrieve context for prompt");
        }
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
     * Retrieves the content of the specified files and formats it for use in prompts.
     * 
     * @param files - An array of file paths to read.
     * @returns A promise that resolves to a string containing the formatted content from the files.
     */
    private async getFilesContent(files: string[]): Promise<string> {
        const fileContents: string[] = [];
        const contextTitle = "### Context from Project Files:\n\n";

        let totalLines = 0;
        for (const [idx, file] of files.entries()) {
            try {
                const { content, lineCount } = await this.fileManager.readFileContentWithLineCount(file);
                fileContents.push(this.fileContentFormatter.formatFileContent(idx, file, content));
                totalLines += lineCount;
            } catch (error) {
                this.provider.logger.error(`Error reading file: ${files[idx]}`, { error });
            }
        }

        this.provider.logger.info(`Added ${files.length} files to context. Total lines: ${totalLines}.`);
        return contextTitle + fileContents.join('\n\n');
    }
}

/**
 * The `DocstringExtractor` class is responsible for extracting module-level 
 * docstrings from provided files. It uses the `FileManager` to read file 
 * contents and identify docstrings based on regex matching.
 * 
 * Key Features:
 * - Extracts docstrings from files while ensuring they are correctly formatted.
 * - Supports integration with the `FileManager` for file reading operations.
 */
export class DocstringExtractor {
    private fileManager: FileManager;

    /**
     * Constructor for the `DocstringExtractor` class.
     * Initializes a new instance with the provided FileManager.
     * 
     * @param fileManager - An instance of `FileManager` for file operations.
     */
    constructor(fileManager: FileManager) {
        this.fileManager = fileManager;
    }

    /**
     * Extracts module-level docstrings from the matched files.
     * 
     * @param matchedFiles - An array of file paths from which to extract docstrings.
     * @returns A promise that resolves to an array of objects containing file paths and their respective docstrings.
     */
    public async extractModuleDocstrings(matchedFiles: string[]): Promise<{ filePath: string; docstring: string }[]> {
        const docstrings: { filePath: string; docstring: string }[] = [];

        for (const file of matchedFiles) {
            const content = this.fileManager.readFileContent(file);
            const docstringMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            const importIndex = content.search(/^\s*import\s+/m);

            if (docstringMatch && (importIndex === -1 || docstringMatch.index < importIndex)) {
                docstrings.push({ filePath: file, docstring: docstringMatch[0] });
            }
        }

        return docstrings;
    }
}

/**
 * The `FileContentFormatter` class is responsible for formatting the content 
 * of files for integration into prompts. It structures the content in a 
 * readable manner for better presentation in the ChatGPT interface.
 * 
 * Key Features:
 * - Formats file content with appropriate headings and structure.
 */
export class FileContentFormatter {
    /**
     * Formats the content of a file for display.
     * 
     * @param idx - The index of the file in the list of files.
     * @param file - The full path of the file.
     * @param content - The content of the file to format.
     * @returns A formatted string representing the file content.
     */
    public formatFileContent(idx: number, file: string, content: string): string {
        return `#### File ${idx + 1}:\n// Full Path: ${file}\n// Content below:\n${content}\n-----`;
    }
}