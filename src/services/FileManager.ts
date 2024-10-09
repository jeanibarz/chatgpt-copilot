// src/services/FileManager.ts

/**
 * This module provides a utility class for managing file system operations, 
 * including file search and content retrieval. It facilitates navigation through 
 * directories, reading file contents, counting lines in files, and finding files 
 * based on specified inclusion and exclusion patterns. The module logs relevant 
 * information and errors encountered during these operations.
 * 
 * Key Features:
 * - Recursively walks through directories to gather file paths.
 * - Reads the content of files and counts lines.
 * - Finds files matching specific patterns while logging progress and errors.
 */

import * as fs from 'fs';
import { injectable } from "inversify";
import * as path from 'path';
import * as vscode from 'vscode';
import { CoreLogger } from "../logging/CoreLogger";
import { Utility } from "../Utility";

/**
 * A utility class for managing file system operations, including file search and content retrieval.
 * 
 * The `FileManager` class provides methods to navigate directories, read file contents,
 * count lines in files, and find files based on specified inclusion and exclusion patterns.
 * It logs relevant information and errors encountered during these operations.
 * 
 * Key Features:
 * - Recursively walks through directories to gather file paths.
 * - Reads the content of files and counts lines.
 * - Finds files matching specific patterns while logging progress and errors.
 */
@injectable()
export class FileManager {
    private logger: CoreLogger = CoreLogger.getInstance();
    private workspaceRoot: string;

    /**
     * Creates an instance of `FileManager`.
     * Initializes the workspace root based on the current workspace folders.
     */
    constructor() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        this.workspaceRoot = (workspaceFolders && workspaceFolders.length > 0)
            ? workspaceFolders[0].uri.fsPath
            : this.handleNoWorkspace();
    }

    private handleNoWorkspace(): string {
        this.logger.error('No workspace folder found.');
        return '';
    }

    /**
     * Walks through a directory recursively and returns a list of file paths.
     * Logs any errors encountered during the traversal.
     * 
     * @param dir - Directory path to start from.
     * @returns Array of file paths found in the directory.
     */
    public walk(dir: string): string[] {
        const fileList: string[] = [];
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    fileList.push(...this.walk(fullPath));
                } else {
                    fileList.push(fullPath);
                }
            }
        } catch (error) {
            this.logger.error(`Error while walking through directory: ${dir}`, { error: Utility.getErrorMessage(error) });
        }
        return fileList;
    }

    /**
     * Retrieves the content of a file.
     * 
     * @param filePath - Path of the file.
     * @returns Content of the file as a string.
     */
    public readFileContent(filePath: string): string {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
            this.logger.error(`Error reading file: ${filePath}`, { error: Utility.getErrorMessage(error) });
            return '';
        }
    }

    /**
     * Asynchronously retrieves the content of a file along with the line count.
     * 
     * @param file - Path of the file.
     * @returns A promise that resolves to an object containing the file content and line count.
     */
    public async readFileContentWithLineCount(file: string): Promise<{ content: string; lineCount: number; }> {
        try {
            const content = await fs.promises.readFile(file, 'utf-8');
            return { content, lineCount: content.split('\n').length };
        } catch (error) {
            this.logger.error(`Error reading file with line count: ${file}`, { error: Utility.getErrorMessage(error) });
            return { content: '', lineCount: 0 };
        }
    }

    /**
     * Asynchronously retrieves the content of multiple files.
     * 
     * @param filePaths - An array of file paths to read.
     * @returns A promise that resolves to an array of file contents.
     */
    public async getFilesContent(filePaths: string[]): Promise<string[]> {
        const contents: string[] = [];
        for (const filePath of filePaths) {
            const content = await this.readFileContentWithErrorHandling(filePath);
            contents.push(content);
        }
        return contents;
    }

    private async readFileContentWithErrorHandling(filePath: string): Promise<string> {
        try {
            return await fs.promises.readFile(filePath, 'utf-8');
        } catch (error) {
            this.logger.error(`Error reading file: ${filePath}`, { error: Utility.getErrorMessage(error) });
            return '';
        }
    }

    /**
     * Counts the number of lines in the specified file.
     * 
     * @param filePath - Path of the file to count lines in.
     * @returns Number of lines in the file.
     */
    public getLineCount(filePath: string): number {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return fileContent.split('\n').length;
        } catch (error) {
            this.logger.error(`Error counting lines in file: ${filePath}`, error);
            return 0;
        }
    }

    /**
     * Finds files that match the inclusion/exclusion patterns.
     * Logs detailed information about the files being processed and handles errors gracefully.
     * 
     * @param explicitFiles - Array of files and directories to search within.
     * @param inclusionPattern - Regex pattern for inclusion.
     * @param exclusionPattern - Optional regex pattern for exclusion.
     * @returns Array of file paths that match the criteria.
     */
    public findMatchingFiles(
        explicitFiles: string[],
        inclusionPattern: RegExp,
        exclusionPattern?: RegExp
    ): string[] {
        const matchedFiles: string[] = [];
        this.logger.info("Initiating file matching process.");
        this.logger.info("Processing explicit files and folders:", { count: explicitFiles.length, files: explicitFiles });

        if (explicitFiles.length === 0) {
            this.logger.warn('No explicit files or folders provided for ChatGPT context. Returning empty result.');
            return matchedFiles;
        }

        this.logger.info("Applying inclusion pattern:", { pattern: inclusionPattern.toString() });
        if (exclusionPattern) {
            this.logger.info("Applying exclusion pattern:", { pattern: exclusionPattern.toString() });
        }

        for (const filePath of explicitFiles) {
            this.logger.debug(`Processing path: ${filePath}`);
            this.processFileOrFolder(filePath, inclusionPattern, exclusionPattern, matchedFiles);
        }

        this.logger.info("File matching process completed.", {
            totalMatched: matchedFiles.length,
            matchedFiles: matchedFiles
        });
        return matchedFiles;
    }

    /**
     * Processes a file or folder, applying inclusion and exclusion patterns to find matching files.
     * 
     * @param filePath - The path of the file or folder to process.
     * @param inclusionPattern - The regex pattern for including files.
     * @param exclusionPattern - The optional regex pattern for excluding files.
     * @param matchedFiles - The array to store matched file paths.
     */
    private processFileOrFolder(filePath: string, inclusionPattern: RegExp, exclusionPattern: RegExp | undefined, matchedFiles: string[]): void {
        try {
            const stat = fs.statSync(filePath);
            const entityType = stat.isDirectory() ? 'directory' : 'file';
            this.logger.info(`Processing ${entityType}: ${filePath}`);

            const files = stat.isDirectory() ? this.walk(filePath) : [filePath];
            this.logger.debug(`Found ${files.length} file(s) in ${entityType}: ${filePath}`);

            const filteredFiles = files.filter(file => {
                const isIncluded = inclusionPattern.test(file);
                const isExcluded = exclusionPattern ? exclusionPattern.test(file) : false;
                this.logger.debug(`File: ${file}, Included: ${isIncluded}, Excluded: ${isExcluded}`);
                return isIncluded && !isExcluded;
            });

            matchedFiles.push(...filteredFiles);
            this.logger.info(`Matched ${filteredFiles.length} file(s) from ${filePath}`);
            this.logger.debug(`Matched files: ${JSON.stringify(filteredFiles)}`);
        } catch (error) {
            this.logger.warn(`Failed to process ${filePath}`, {
                error: Utility.getErrorMessage(error),
                stack: error instanceof Error ? error.stack : undefined
            });
        }
    }

    /**
     * Checks if a file or folder exists at the specified path.
     * 
     * @param filePath - The path to check.
     * @returns `true` if the path exists, `false` otherwise.
     */
    public pathExists(filePath: string): boolean {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            this.logger.error(`Error checking path existence for: ${filePath}`, { error });
            return false;
        }
    }

    /**
     * Resolves a given relative or absolute path by checking if it exists.
     * It handles the following:
     * - Avoids double slashes in concatenated paths.
     * - Ensures paths are resolved correctly by checking for redundancy between `workspaceRoot` and `filePath`.
     * 
     * @param filePath - The path to resolve.
     * @returns The resolved absolute path if found, or the original path if it is valid.
     */
    public resolvePath(filePath: string): string {
        this.logger.debug(`Attempting to resolve path: ${filePath}`);
        let normalizedFilePath = filePath.replace(/\/+/g, '/');
        const workspaceRootNormalized = this.workspaceRoot.replace(/\/$/, '');
        this.logger.debug(`Normalized input path: ${normalizedFilePath}`);
        this.logger.debug(`Normalized workspace root: ${workspaceRootNormalized}`);

        if (path.isAbsolute(normalizedFilePath) && this.pathExists(normalizedFilePath)) {
            this.logger.info(`Resolved absolute path: ${normalizedFilePath}`);
            return normalizedFilePath;
        }

        normalizedFilePath = normalizedFilePath.startsWith('/') ? normalizedFilePath.slice(1) : normalizedFilePath;
        let combinedPath = path.join(workspaceRootNormalized, normalizedFilePath).replace(/\/+/g, '/');
        this.logger.debug(`Attempting to resolve combined path: ${combinedPath}`);

        if (this.pathExists(combinedPath)) {
            this.logger.info(`Resolved combined path: ${combinedPath}`);
            return combinedPath;
        }

        this.logger.debug(`Unable to resolve path directly, attempting to handle redundant parts`);
        return this.handleRedundantPathParts(normalizedFilePath, workspaceRootNormalized, filePath);
    }

    /**
     * Handles potential redundant path parts in file paths.
     * 
     * This method attempts to resolve file paths that may contain redundant parts,
     * particularly when the workspace root folder name is repeated in the file path.
     * 
     * @param normalizedFilePath - The normalized file path to handle.
     * @param workspaceRootNormalized - The normalized workspace root path.
     * @param originalPath - The original, unmodified file path.
     * @returns The resolved file path if successful, or the original path if unable to resolve.
     */
    private handleRedundantPathParts(normalizedFilePath: string, workspaceRootNormalized: string, originalPath: string): string {
        const workspaceLastFolder = path.basename(workspaceRootNormalized);
        const filePathParts = normalizedFilePath.split(path.sep).filter(Boolean);

        this.logger.debug(`Handling potential redundant path parts for: ${originalPath}`, {
            workspaceLastFolder,
            filePathParts,
            normalizedFilePath,
            workspaceRootNormalized
        });

        if (filePathParts.length > 0 && workspaceLastFolder === filePathParts[0]) {
            const trimmedFilePath = filePathParts.slice(1).join(path.sep);
            const combinedPath = path.join(workspaceRootNormalized, trimmedFilePath).replace(/\/+/g, '/');

            this.logger.debug(`Attempting to resolve path with redundant parts removed: ${combinedPath}`);

            if (this.pathExists(combinedPath)) {
                this.logger.info(`Successfully resolved path with redundant parts removed: ${combinedPath}`);
                return combinedPath;
            } else {
                this.logger.debug(`Path does not exist after removing redundant parts: ${combinedPath}`);
            }
        } else {
            this.logger.debug(`No redundant parts detected in the path`);
        }

        this.logger.warn(`Unable to resolve path: ${originalPath}`, {
            reason: "Path does not exist",
            attemptedResolutions: [normalizedFilePath, path.join(workspaceRootNormalized, normalizedFilePath)]
        });
        return originalPath;
    }
}