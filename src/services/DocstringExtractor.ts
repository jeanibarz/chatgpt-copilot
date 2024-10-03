// src/services/DocstringExtractor.ts

/**
 * This module is responsible for extracting module-level docstrings 
 * from provided files. It utilizes the FileManager for file reading 
 * operations and regex matching to identify docstrings.
 * 
 * Key Features:
 * - Extracts docstrings from files while ensuring they are correctly formatted.
 * - Supports integration with the FileManager for file reading operations.
 */

import { inject, injectable } from "inversify";
import { IFileDocstring } from "../interfaces";
import TYPES from "../inversify.types";
import { CoreLogger } from '../logging/CoreLogger';
import { FileManager } from './FileManager';

@injectable()
export class DocstringExtractor {
    private logger: CoreLogger = CoreLogger.getInstance();

    constructor(
        @inject(TYPES.FileManager) private fileManager: FileManager,
    ) { }

    /**
     * Extracts module-level docstrings from the matched files.
     * 
     * @param matchedFiles - An array of file paths from which to extract docstrings.
     * @returns A promise that resolves to an array of objects containing file paths and their respective docstrings.
     */
    public async extractModuleDocstrings(matchedFiles: string[]): Promise<IFileDocstring[]> {
        const docstrings: IFileDocstring[] = [];

        for (const file of matchedFiles) {
            const content = await this.safeReadFileContent(file);
            if (!content) continue;

            const extractedDocstring = this.extractDocstring(content, file);
            if (extractedDocstring) {
                docstrings.push(extractedDocstring);
                break; // Stop searching after the first valid docstring
            }
        }

        return docstrings;
    }

    /**
     * Extracts the docstring for a specified method.
     * 
     * @param filePath - The path of the file containing the method.
     * @param methodName - The name of the method for which to extract the docstring.
     * @returns A promise that resolves to the method's docstring, or null if not found.
     */
    public async extractMethodDocstring(filePath: string, methodName: string): Promise<string | null> {
        const content = await this.safeReadFileContent(filePath);
        if (!content) return null;

        const methodRegex = new RegExp(`(\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\/\\s*)?\\s*${methodName}\\s*\\(`);
        const match = content.match(methodRegex);

        if (match) {
            const docstringMatch = content.substring(0, match.index).match(/\/\*[\s\S]*?\*\//);
            return docstringMatch ? docstringMatch[0] : null;
        }

        return null;
    }

    /**
     * Safely reads the content of a file.
     * 
     * @param filePath - The path to the file to be read.
     * @returns A promise that resolves to the file's content as a string, or null if an error occurs.
     */
    private async safeReadFileContent(filePath: string): Promise<string | null> {
        try {
            return await this.fileManager.readFileContent(filePath);
        } catch (error) {
            this.logger.error(`Error reading file content from ${filePath}`, { error });
            return null;
        }
    }

    /**
     * Extracts a docstring from the provided content if it contains a module-level comment.
     * 
     * @param content - The content of the file to search for docstrings.
     * @param filePath - The path of the file being processed.
     * @returns An object containing the file path and the extracted docstring, or null if none is found.
     */
    private extractDocstring(content: string, filePath: string): IFileDocstring | null {
        const blockComments = content.match(/\/\*[\s\S]*?\*\//g);
        if (blockComments) {
            for (const comment of blockComments) {
                if (comment.includes("This module")) {
                    return { filePath, docstring: comment };
                }
            }
        }
        return null;
    }
}