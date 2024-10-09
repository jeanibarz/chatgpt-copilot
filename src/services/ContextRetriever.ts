// src/services/ContextRetriever.ts

/**
 * This module provides the ContextRetriever class, which is responsible for 
 * retrieving context from project files based on configurable inclusion and 
 * exclusion regex patterns. It utilizes the FileManager for file operations 
 * and formats the content for output.
 */

import { inject, injectable } from "inversify";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { StateManager } from "../state/StateManager";
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
        const configurationStateManager = StateManager.getInstance().getConfigurationStateManager();
        return {
            inclusionRegex: configurationStateManager.getConfig<string>("fileInclusionRegex") ?? ".*",
            exclusionRegex: configurationStateManager.getConfig<string>("fileExclusionRegex")
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
        this.logger.info(`Applying file matching with inclusion regex: ${inclusionRegex} and exclusion regex: ${exclusionRegex || 'None'}`);

        const matchedFiles = this.fileManager.findMatchingFiles(
            explicitFiles,
            new RegExp(inclusionRegex),
            exclusionRegex ? new RegExp(exclusionRegex) : undefined
        );

        this.logger.info(`Found ${matchedFiles.length} matching files out of ${explicitFiles.length} explicit files`);
        this.logger.debug(`Matched files: ${matchedFiles.join(', ')}`);

        return matchedFiles;
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
        let successfulReads = 0;
        let failedReads = 0;

        this.logger.info(`Starting to process ${files.size} files for content retrieval.`);

        for (const file of files) {
            try {
                const { content, lineCount } = await this.fileManager.readFileContentWithLineCount(file);
                fileContents.push(this.fileContentFormatter.formatFileContent(file, content));
                totalLines += lineCount;
                successfulReads++;
                this.logger.debug(`Successfully read and formatted content from file: ${file}. Lines: ${lineCount}`);
            } catch (error) {
                failedReads++;
                this.logger.error(`Failed to read file: ${file}`, { error, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
            }
        }

        const successRate = (successfulReads / files.size) * 100;
        this.logger.info(`File content retrieval completed. Success rate: ${successRate.toFixed(2)}%`);
        this.logger.info(`Successfully processed ${successfulReads} files. Total lines: ${totalLines}. Failed reads: ${failedReads}.`);

        if (failedReads > 0) {
            this.logger.warn(`${failedReads} file(s) could not be read. This may affect the completeness of the context.`);
        }

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
            this.logger.info(`Starting context retrieval for prompt with ${explicitFiles.length} explicit files`);
            this.logger.debug(`Explicit files: ${explicitFiles.join(', ')}`);

            this.logger.info("Finding matching files based on explicit files");
            const matchedFiles = new Set(this.getMatchedFiles(explicitFiles));
            this.logger.info(`Found ${matchedFiles.size} matching files`);

            this.logger.info("Retrieving and formatting content from matched files");
            const content = await this.getFilesContent(matchedFiles);
            this.logger.info(`Successfully retrieved and formatted content for ${matchedFiles.size} files`);

            return content;
        } catch (error) {
            this.logger.error("Failed to retrieve context for prompt", {
                error,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                explicitFilesCount: explicitFiles.length
            });
            throw new Error("Failed to retrieve context for prompt");
        }
    }
}