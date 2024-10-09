// src/services/ExplicitFilesManager.ts

/**
 * This module manages explicit files and folders within the ChatGPT VS Code extension.
 * It allows adding, removing, and clearing files and folders, ensuring they are tracked appropriately.
 */

import { promises } from 'fs';
import { inject, injectable } from "inversify";
import * as path from 'path';
import * as vscode from 'vscode';
import TYPES from '../inversify.types';
import { CoreLogger } from '../logging/CoreLogger'; // Ensure you have logging in place
import { Utility } from "../Utility";

/**
 * The ExplicitFilesManager class manages explicit files and folders within the ChatGPT VS Code extension.
 * It allows adding, removing, and clearing files and folders, ensuring they are tracked appropriately.
 */
@injectable()
export class ExplicitFilesManager {
    private logger: CoreLogger = CoreLogger.getInstance();
    private workspaceFolders: Array<string> = [];
    private explicitFiles: Set<string> = new Set<string>();
    private explicitFolders: Set<string> = new Set<string>();
    private _onDidChangeFiles: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeFiles: vscode.Event<void> = this._onDidChangeFiles.event;

    private debouncedSaveAndEmit = Utility.debounce(async () => {
        this.saveExplicitFilesToState();
        this.logger.debug('ExplicitFilesManager emitting debounced onDidChangeFiles event');
        this._onDidChangeFiles.fire();
    }, 100);

    /**
     * Constructor initializes the manager and loads explicit files from the extension's state.
     * @param context - The VS Code extension context used for state management.
     */
    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext
    ) {
        this.loadExplicitFilesFromState();
        this.updateWorkspaceFolders();

        // Listen to workspace folder changes
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.updateWorkspaceFolders();
        });
    }

    /**
     * Updates the list of workspace folders.
     */
    private updateWorkspaceFolders(): void {
        if (vscode.workspace.workspaceFolders) {
            this.workspaceFolders = vscode.workspace.workspaceFolders.map(folder => folder.uri.fsPath);
            this.logger.info(`Workspace folders updated. Current workspace folders: ${this.workspaceFolders.join(', ')}`);
            this.logger.debug(`Total number of workspace folders: ${this.workspaceFolders.length}`);
        } else {
            this.workspaceFolders = [];
            this.logger.warn('No workspace folders found. This may affect file management operations.');
            this.logger.debug('Cleared workspace folders list due to absence of workspace folders.');
        }
    }

    /**
     * Checks if the given path is inside any of the workspace folders.
     * @param resourcePath - The path to check.
     * @returns True if the path is within a workspace folder; otherwise, false.
     */
    private isPathInWorkspace(resourcePath: string): boolean {
        return this.workspaceFolders.some(workspaceFolder => {
            const relative = path.relative(workspaceFolder, resourcePath);
            return !relative.startsWith('..') && !path.isAbsolute(relative);
        });
    }

    /**
     * Adds a resource (file or folder) to the explicit files/folders sets.
     * @param resourceUri - The URI of the file or folder to add.
     */
    public async addResource(resourceUri: vscode.Uri): Promise<void> {
        const fsPath = path.normalize(resourceUri.fsPath);

        this.logger.info(`Attempting to add resource: ${fsPath}`);

        // Check if the path is inside the workspace
        if (!this.isPathInWorkspace(fsPath)) {
            const warningMessage = `Cannot add "${fsPath}" because it is outside the workspace.`;
            vscode.window.showWarningMessage(warningMessage);
            this.logger.warn(`${warningMessage} Resource addition aborted.`);
            return;
        }

        try {
            const stat = await promises.stat(fsPath);

            if (stat.isDirectory()) {
                this.logger.info(`Adding folder and its contents: ${fsPath}`);
                await this.addFolderAndContents(fsPath);
            } else if (stat.isFile()) {
                this.logger.info(`Adding file: ${fsPath}`);
                this.addFile(fsPath);
            } else {
                this.logger.warn(`Unrecognized resource type for: ${fsPath}. Neither file nor directory.`);
            }

            this.logger.debug('Saving changes and emitting update event');
            this.saveAndEmit();
        } catch (error) {
            const errorMessage = `Failed to add resource: ${fsPath}. Error: ${Utility.getErrorMessage(error)}`;
            vscode.window.showErrorMessage(errorMessage);
            this.logger.error(errorMessage, { error, resourcePath: fsPath });
        }
    }

    /**
     * Removes a resource (file or folder) from the explicit files/folders sets.
     * @param resourceUri - The URI of the file or folder to remove.
     */
    public async removeResource(resourceUri: vscode.Uri): Promise<void> {
        const fsPath = path.normalize(resourceUri.fsPath);

        this.logger.info(`Attempting to remove resource: ${fsPath}`);

        // Check if the path is inside the workspace
        if (!this.isPathInWorkspace(fsPath)) {
            const warningMessage = `Cannot remove "${fsPath}" because it is outside the workspace.`;
            vscode.window.showWarningMessage(warningMessage);
            this.logger.warn(`${warningMessage} Resource removal aborted.`);
            return;
        }

        try {
            // Remove from explicitFiles and explicitFolders
            if (this.explicitFiles.delete(fsPath)) {
                this.logger.info(`Removed file from explicitFiles: ${fsPath}`);
            }

            if (this.explicitFolders.delete(fsPath)) {
                this.logger.info(`Removed folder from explicitFolders: ${fsPath}`);
            }

            let stat;
            try {
                stat = await promises.stat(fsPath);
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                    this.logger.info(`Resource no longer exists on filesystem: ${fsPath}`);
                    stat = null;
                } else {
                    this.logger.error(`Unexpected error while checking resource status: ${fsPath}`, { error });
                    throw error; // Re-throw unexpected errors
                }
            }

            if (stat && stat.isDirectory()) {
                this.logger.info(`Removing contents of directory: ${fsPath}`);
                // Recursively remove contents of the folder
                let entries: string[] = [];
                try {
                    entries = await promises.readdir(fsPath);
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                        this.logger.info(`Directory no longer exists: ${fsPath}`);
                    } else {
                        this.logger.error(`Unexpected error while reading directory contents: ${fsPath}`, { error });
                        throw error; // Re-throw unexpected errors
                    }
                }

                // Temporarily disable event emission during recursion
                const originalSaveAndEmit = this.saveAndEmit;
                this.saveAndEmit = () => { }; // No-op

                try {
                    for (const entry of entries) {
                        const entryPath = path.join(fsPath, entry);
                        this.logger.debug(`Recursively removing: ${entryPath}`);
                        await this.removeResource(vscode.Uri.file(entryPath));
                    }
                } finally {
                    // Restore the original saveAndEmit method
                    this.saveAndEmit = originalSaveAndEmit;
                }
            }

            this.logger.info(`Successfully removed resource: ${fsPath}`);
            this.saveAndEmit();
        } catch (error) {
            const errorMessage = `Failed to remove resource: ${fsPath}. Error: ${Utility.getErrorMessage(error)}`;
            vscode.window.showErrorMessage(errorMessage);
            this.logger.error(errorMessage, { error, resourcePath: fsPath });
        }
    }

    /**
     * Clears all resources from the explicit files/folders sets.
     */
    public clearAllResources(): void {
        this.explicitFiles.clear();
        this.explicitFolders.clear();
        this.saveAndEmit();
        vscode.window.showInformationMessage('Cleared all files and folders.');
        this.logger.info('Cleared all explicit files and folders.');
    }

    /**
     * Retrieves an array of explicit file paths.
     * @returns An array of file paths.
     */
    public getExplicitFilesArray(): string[] {
        return Array.from(this.explicitFiles);
    }

    /**
     * Retrieves an array of explicit folder paths.
     * @returns An array of folder paths.
     */
    public getExplicitFoldersArray(): string[] {
        return Array.from(this.explicitFolders);
    }

    /**
     * Checks if a file is included in the explicit files set.
     * @param filePath - The path of the file to check.
     * @returns `true` if the file is included; otherwise, `false`.
     */
    public isFileIncluded(filePath: string): boolean {
        return this.explicitFiles.has(path.normalize(filePath));
    }

    /**
     * Checks if a folder is included in the explicit folders set.
     * @param folderPath - The path of the folder to check.
     * @returns `true` if the folder is included; otherwise, `false`.
     */
    public isFolderIncluded(folderPath: string): boolean {
        return this.explicitFolders.has(path.normalize(folderPath));
    }

    /**
     * Saves the explicit files and folders to the workspace state.
     */
    public saveExplicitFilesToState(): void {
        const filePaths = this.getExplicitFilesArray();
        const folderPaths = this.getExplicitFoldersArray();
        this.context.workspaceState.update('chatgpt.explicitFiles', filePaths);
        this.context.workspaceState.update('chatgpt.explicitFolders', folderPaths);
        this.logger.info(`Saved ${filePaths.length} files and ${folderPaths.length} folders to workspace state.`);
    }

    /**
     * Loads the explicit files and folders from the workspace state.
     */
    private loadExplicitFilesFromState(): void {
        try {
            const savedFiles = this.context.workspaceState.get<string[]>('chatgpt.explicitFiles', []);
            if (!Array.isArray(savedFiles)) {
                this.logger.error(`Failed to load explicit files: Expected an array, but received ${typeof savedFiles}`, { savedFiles });
                return;
            }
            savedFiles.forEach((filePath, index) => {
                if (filePath) {
                    this.explicitFiles.add(filePath);
                    this.logger.debug(`Successfully loaded explicit file: ${filePath}`, { index });
                } else {
                    this.logger.warn(`Skipped loading undefined file path`, { index });
                }
            });

            const savedFolders = this.context.workspaceState.get<string[]>('chatgpt.explicitFolders', []);
            if (!Array.isArray(savedFolders)) {
                this.logger.error(`Failed to load explicit folders: Expected an array, but received ${typeof savedFolders}`, { savedFolders });
                return;
            }
            savedFolders.forEach((folderPath, index) => {
                if (folderPath) {
                    this.explicitFolders.add(folderPath);
                    this.logger.debug(`Successfully loaded explicit folder: ${folderPath}`, { index });
                } else {
                    this.logger.warn(`Skipped loading undefined folder path`, { index });
                }
            });

            this.logger.info(`Completed loading explicit files and folders`, {
                fileCount: this.explicitFiles.size,
                folderCount: this.explicitFolders.size
            });
        } catch (error) {
            this.logger.error(`Failed to load explicit files and folders`, {
                error: Utility.getErrorMessage(error),
                stack: error instanceof Error ? error.stack : undefined
            });
        }
    }

    /**
     * Adds a folder and all its contents to the explicit folders and files sets.
     * @param folderPath - The path of the folder to add.
     */
    private async addFolderAndContents(folderPath: string): Promise<void> {
        if (!folderPath) {
            this.logger.warn('Attempted to add an undefined folder path. Operation aborted.');
            return;
        }

        // Check if the folder is inside the workspace
        if (!this.isPathInWorkspace(folderPath)) {
            this.logger.warn(`Cannot add folder "${folderPath}". It is located outside the workspace boundaries.`);
            return;
        }

        const normalizedFolderPath = path.normalize(folderPath);
        if (!this.explicitFolders.has(normalizedFolderPath)) {
            this.explicitFolders.add(normalizedFolderPath);
            this.logger.info(`Successfully added root folder to explicit folders: ${normalizedFolderPath}`);
        } else {
            this.logger.info(`Root folder already exists in explicit folders: ${normalizedFolderPath}`);
        }

        const stack: string[] = [folderPath];
        let addedFolders = 0;
        let addedFiles = 0;

        while (stack.length > 0) {
            const currentPath = stack.pop()!;
            try {
                const entries = await promises.readdir(currentPath, { withFileTypes: true });
                for (const entry of entries) {
                    const entryPath = path.join(currentPath, entry.name);
                    if (entry.isDirectory()) {
                        const normalizedEntryPath = path.normalize(entryPath);
                        if (!this.explicitFolders.has(normalizedEntryPath)) {
                            this.explicitFolders.add(normalizedEntryPath);
                            addedFolders++;
                            this.logger.debug(`Added subfolder to explicit folders: ${normalizedEntryPath}`);
                        }
                        stack.push(entryPath); // Add subdirectory to stack
                    } else if (entry.isFile()) {
                        const normalizedFilePath = path.normalize(entryPath);
                        if (!this.explicitFiles.has(normalizedFilePath)) {
                            this.explicitFiles.add(normalizedFilePath);
                            addedFiles++;
                            this.logger.debug(`Added file to explicit files: ${normalizedFilePath}`);
                        }
                    } else {
                        this.logger.warn(`Skipped entry "${entryPath}". It is neither a file nor a directory.`);
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to process directory: ${currentPath}. Error: ${Utility.getErrorMessage(error)}`, { error });
            }
        }

        this.logger.info(`Folder addition complete. Added ${addedFolders} folders and ${addedFiles} files to explicit sets.`);
    }

    /**
     * Adds a file to the explicit files set.
     * @param filePath - The path of the file to add.
     */
    private addFile(filePath: string): void {
        // Check if the file is inside the workspace
        if (!this.isPathInWorkspace(filePath)) {
            this.logger.warn(`Attempted to add file "${filePath}" which is outside the workspace. Operation aborted.`);
            return;
        }

        const normalizedFilePath = path.normalize(filePath);
        if (!this.explicitFiles.has(normalizedFilePath)) {
            this.explicitFiles.add(normalizedFilePath);
            this.logger.info(`Successfully added file to explicit files: ${normalizedFilePath}`);
        } else {
            this.logger.debug(`File "${normalizedFilePath}" already exists in explicit files. No action taken.`);
        }
    }

    /**
     * Saves the explicit files and folders to the workspace state and emits the change event.
     * This method is debounced to prevent excessive state saves and event emissions.
     */
    private saveAndEmit(): void {
        this.debouncedSaveAndEmit();
    }
}