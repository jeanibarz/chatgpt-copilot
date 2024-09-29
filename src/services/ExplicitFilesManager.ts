// src/services/ExplicitFilesManager.ts

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
    private logger = CoreLogger.getInstance();
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
            this.logger.debug(`Workspace folders updated: ${this.workspaceFolders.join(', ')}`);
        } else {
            this.workspaceFolders = [];
            this.logger.warn('No workspace folders found.');
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

        // Check if the path is inside the workspace
        if (!this.isPathInWorkspace(fsPath)) {
            vscode.window.showWarningMessage(`Cannot add "${fsPath}" because it is outside the workspace.`);
            this.logger.warn(`Attempted to add resource outside workspace: ${fsPath}`);
            return;
        }

        try {
            const stat = await promises.stat(fsPath);

            if (stat.isDirectory()) {
                await this.addFolderAndContents(fsPath);
            } else if (stat.isFile()) {
                this.addFile(fsPath);
            }

            this.saveAndEmit();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add resource: ${fsPath}. Error: ${Utility.getErrorMessage(error)}`);
            this.logger.error(`Failed to add resource: ${fsPath}`, { error });
        }
    }


    /**
     * Removes a resource (file or folder) from the explicit files/folders sets.
     * @param resourceUri - The URI of the file or folder to remove.
     */
    public async removeResource(resourceUri: vscode.Uri): Promise<void> {
        const fsPath = path.normalize(resourceUri.fsPath);

        // Check if the path is inside the workspace
        if (!this.isPathInWorkspace(fsPath)) {
            vscode.window.showWarningMessage(`Cannot remove "${fsPath}" because it is outside the workspace.`);
            this.logger.warn(`Attempted to remove resource outside workspace: ${fsPath}`);
            return;
        }

        try {
            // Remove from explicitFiles and explicitFolders
            if (this.explicitFiles.delete(fsPath)) {
                this.logger.debug(`Removed file from explicitFiles: ${fsPath}`);
            }

            if (this.explicitFolders.delete(fsPath)) {
                this.logger.debug(`Removed folder from explicitFolders: ${fsPath}`);
            }

            let stat;
            try {
                stat = await promises.stat(fsPath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // File or directory does not exist, no need to proceed further
                    this.logger.debug(`File or directory does not exist: ${fsPath}`);
                    stat = null;
                } else {
                    throw error; // Re-throw unexpected errors
                }
            }

            if (stat && stat.isDirectory()) {
                // Recursively remove contents of the folder
                let entries: string[] = [];
                try {
                    entries = await promises.readdir(fsPath);
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        // Directory no longer exists
                        this.logger.debug(`Directory does not exist: ${fsPath}`);
                    } else {
                        throw error; // Re-throw unexpected errors
                    }
                }

                // Temporarily disable event emission during recursion
                const originalSaveAndEmit = this.saveAndEmit;
                this.saveAndEmit = () => { }; // No-op

                try {
                    for (const entry of entries) {
                        const entryPath = path.join(fsPath, entry);
                        await this.removeResource(vscode.Uri.file(entryPath));
                    }
                } finally {
                    // Restore the original saveAndEmit method
                    this.saveAndEmit = originalSaveAndEmit;
                }
            }

            this.saveAndEmit();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to remove resource: ${fsPath}. Error: ${Utility.getErrorMessage(error)}`);
            this.logger.error(`Failed to remove resource: ${fsPath}`, { error });
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
                this.logger.error(`Expected savedFiles to be an array, but got: ${savedFiles}`);
                return;
            }
            savedFiles.forEach((filePath, index) => {
                if (filePath) {
                    this.explicitFiles.add(filePath);
                    this.logger.debug(`Loaded file from workspace state: ${filePath}`);
                } else {
                    this.logger.warn(`File path at index ${index} is undefined. Skipping.`);
                }
            });

            const savedFolders = this.context.workspaceState.get<string[]>('chatgpt.explicitFolders', []);
            if (!Array.isArray(savedFolders)) {
                this.logger.error(`Expected savedFolders to be an array, but got: ${savedFolders}`);
                return;
            }
            savedFolders.forEach((folderPath, index) => {
                if (folderPath) {
                    this.explicitFolders.add(folderPath);
                    this.logger.debug(`Loaded folder from workspace state: ${folderPath}`);
                } else {
                    this.logger.warn(`Folder path at index ${index} is undefined. Skipping.`);
                }
            });
        } catch (error) {
            this.logger.error(`Failed to load explicit files and folders from state: ${Utility.getErrorMessage(error)}`, { error });
        }
    }

    /**
     * Adds a folder and all its contents to the explicit folders and files sets.
     * @param folderPath - The path of the folder to add.
     */
    private async addFolderAndContents(folderPath: string): Promise<void> {
        if (!folderPath) {
            this.logger.warn('Received an undefined folderPath. Skipping.');
            return;
        }

        // Check if the folder is inside the workspace
        if (!this.isPathInWorkspace(folderPath)) {
            this.logger.warn(`Cannot add folder "${folderPath}" because it is outside the workspace.`);
            return;
        }

        const normalizedFolderPath = path.normalize(folderPath);
        if (!this.explicitFolders.has(normalizedFolderPath)) {
            this.explicitFolders.add(normalizedFolderPath);
            this.logger.debug(`Added folder to explicitFolders: ${normalizedFolderPath}`);
        }

        const stack: string[] = [folderPath];

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
                            this.logger.debug(`Added subfolder to explicitFolders: ${normalizedEntryPath}`);
                        }
                        stack.push(entryPath); // Add subdirectory to stack
                    } else if (entry.isFile()) {
                        const normalizedFilePath = path.normalize(entryPath);
                        if (!this.explicitFiles.has(normalizedFilePath)) {
                            this.explicitFiles.add(normalizedFilePath);
                            this.logger.debug(`Added file to explicitFiles: ${normalizedFilePath}`);
                        }
                    } else {
                        this.logger.warn(`Entry "${entryPath}" is neither a file nor a directory. Skipping.`);
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to read directory: ${currentPath}: ${Utility.getErrorMessage(error)}`, { error });
            }
        }
    }

    /**
     * Adds a file to the explicit files set.
     * @param filePath - The path of the file to add.
     */
    private addFile(filePath: string): void {
        // Check if the file is inside the workspace
        if (!this.isPathInWorkspace(filePath)) {
            this.logger.warn(`Cannot add file "${filePath}" because it is outside the workspace.`);
            return;
        }

        const normalizedFilePath = path.normalize(filePath);
        if (!this.explicitFiles.has(normalizedFilePath)) {
            this.explicitFiles.add(normalizedFilePath);
            this.logger.debug(`Added file to explicitFiles: ${normalizedFilePath}`);
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
