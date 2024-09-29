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
    private logger = CoreLogger.getInstance();
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
        this.logger.info("Starting to find matching files.");
        this.logger.info("Explicit files and folders", { explicitFiles });

        if (explicitFiles.length === 0) {
            this.logger.info('No files or folders are explicitly added to the ChatGPT context.');
            return matchedFiles;
        }

        for (const filePath of explicitFiles) {
            this.processFileOrFolder(filePath, inclusionPattern, exclusionPattern, matchedFiles);
        }

        this.logger.info("Final matched files", { matchedFiles });
        return matchedFiles;
    }

    private processFileOrFolder(filePath: string, inclusionPattern: RegExp, exclusionPattern: RegExp | undefined, matchedFiles: string[]): void {
        try {
            const stat = fs.statSync(filePath);
            this.logger.info(`Processing ${stat.isDirectory() ? 'directory' : 'file'}: ${filePath}`);
            const files = stat.isDirectory() ? this.walk(filePath) : [filePath];

            const filteredFiles = files.filter(file => {
                const isIncluded = inclusionPattern.test(file);
                const isExcluded = exclusionPattern ? exclusionPattern.test(file) : false;
                return isIncluded && !isExcluded;
            });

            matchedFiles.push(...filteredFiles);
            this.logger.info(`Matched files from ${filePath}: ${filteredFiles}`);
        } catch (error) {
            this.logger.warn(`Failed to process file or folder: ${filePath}, error: ${Utility.getErrorMessage(error)}`);
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
        let normalizedFilePath = filePath.replace(/\/+/g, '/'); // Normalize the input filePath.
        const workspaceRootNormalized = this.workspaceRoot.replace(/\/$/, ''); // Ensure no trailing slash in workspaceRoot.

        // Step 1: If the filePath is absolute, check directly if it exists.
        if (path.isAbsolute(normalizedFilePath) && this.pathExists(normalizedFilePath)) {
            return normalizedFilePath; // Return the absolute path if it exists.
        }

        normalizedFilePath = normalizedFilePath.startsWith('/') ? normalizedFilePath.slice(1) : normalizedFilePath;
        let combinedPath = path.join(workspaceRootNormalized, normalizedFilePath).replace(/\/+/g, '/');

        if (this.pathExists(combinedPath)) {
            return combinedPath;
        }

        return this.handleRedundantPathParts(normalizedFilePath, workspaceRootNormalized, filePath);
    }

    private handleRedundantPathParts(normalizedFilePath: string, workspaceRootNormalized: string, originalPath: string): string {
        const workspaceLastFolder = path.basename(workspaceRootNormalized);
        const filePathParts = normalizedFilePath.split(path.sep).filter(Boolean);

        if (filePathParts.length > 0 && workspaceLastFolder === filePathParts[0]) {
            const trimmedFilePath = filePathParts.slice(1).join(path.sep);
            const combinedPath = path.join(workspaceRootNormalized, trimmedFilePath).replace(/\/+/g, '/');

            if (this.pathExists(combinedPath)) {
                return combinedPath;
            }
        }

        this.logger.warn(`Unable to resolve path: ${originalPath}. It does not exist.`);
        return originalPath;
    }
}