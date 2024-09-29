// src/services/ContextRetriever.ts

import { inject, injectable } from "inversify";
import { getConfig } from '../config/Configuration';
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
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
@injectable()
export class ContextRetriever {
    private logger = CoreLogger.getInstance();
    private regexConfigs: { inclusionRegex: string; exclusionRegex?: string; };
    private fileContentFormatter: FileContentFormatter;

    constructor(
        @inject(TYPES.FileManager) private fileManager: FileManager,
        @inject(TYPES.CoreLogger) logger: CoreLogger
    ) {
        this.logger = logger;
        this.regexConfigs = this.getRegexConfigs();
        this.fileContentFormatter = new FileContentFormatter();
    }

    private getRegexConfigs() {
        return {
            inclusionRegex: getConfig<string>("fileInclusionRegex") ?? ".*",
            exclusionRegex: getConfig<string>("fileExclusionRegex")
        };
    }

    public getMatchedFiles(explicitFiles: string[]): string[] {
        const { inclusionRegex, exclusionRegex } = this.regexConfigs;
        return this.fileManager.findMatchingFiles(
            explicitFiles,
            new RegExp(inclusionRegex),
            exclusionRegex ? new RegExp(exclusionRegex) : undefined
        );
    }

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
