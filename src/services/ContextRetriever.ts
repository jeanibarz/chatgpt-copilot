// src/services/ContextRetriever.ts

/**
 * This module provides the ContextRetriever class, which is responsible for 
 * retrieving context from project files based on configurable inclusion and 
 * exclusion regex patterns. It utilizes the FileManager for file operations 
 * and formats the content for output.
 */

import { inject, injectable } from "inversify";
import { getConfig } from '../config/Configuration';
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { FileContentFormatter } from './FileContentFormatter';
import { FileManager } from './FileManager';

@injectable()
export class ContextRetriever {
    private logger: CoreLogger = CoreLogger.getInstance();
    private regexConfigs: { inclusionRegex: string; exclusionRegex?: string; };
    private fileContentFormatter: FileContentFormatter;

    constructor(
        @inject(TYPES.FileManager) private fileManager: FileManager,
    ) {
        this.regexConfigs = this.getRegexConfigs();
        this.fileContentFormatter = new FileContentFormatter();
    }

    private getRegexConfigs() {
        return {
            inclusionRegex: getConfig<string>("fileInclusionRegex") ?? ".*",
            exclusionRegex: getConfig<string>("fileExclusionRegex")
        };
    }

    /**
     * Retrieves a list of files that match the configured inclusion and 
     * exclusion regex patterns.
     * 
     * @param explicitFiles - An array of file paths to check against the regex patterns.
     * @returns An array of file paths that match the inclusion and exclusion criteria.
     */
    public getMatchedFiles(explicitFiles: string[]): string[] {
        const { inclusionRegex, exclusionRegex } = this.regexConfigs;
        return this.fileManager.findMatchingFiles(
            explicitFiles,
            new RegExp(inclusionRegex),
            exclusionRegex ? new RegExp(exclusionRegex) : undefined
        );
    }

    /**
     * Retrieves the content of the specified files and formats it for output.
     * 
     * @param files - A set of file paths from which to read content.
     * @returns A promise that resolves to a formatted string containing the 
     *          combined content of the files.
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
     * Retrieves context for a prompt by finding matching files and 
     * gathering their content.
     * 
     * @param explicitFiles - An array of file paths to search for context.
     * @returns A promise that resolves to a formatted string containing the 
     *          context gathered from the matching files.
     * @throws An error if the context retrieval fails.
     */
    public async retrieveContextForPrompt(explicitFiles: string[]): Promise<string> {
        try {
            this.logger.info("Finding matching files");
            const matchedFiles = new Set(this.getMatchedFiles(explicitFiles));
            return await this.getFilesContent(matchedFiles);
        } catch (error) {
            this.logger.logError(error, "retrieveContextForPrompt");
            throw new Error("Failed to retrieve context for prompt");
        }
    }
}