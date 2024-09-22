// ./services/ExplicitFilesManager.ts

import { readdirSync, statSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CoreLogger } from '../logging/CoreLogger'; // Ensure you have logging in place
import { Utility } from "../Utility";

/**
 * The ExplicitFilesManager class manages explicit files and folders within the ChatGPT VS Code extension.
 * It allows adding, removing, and clearing files and folders, ensuring they are tracked appropriately.
 */
export class ExplicitFilesManager {
    private logger = CoreLogger.getInstance();
    private workspaceFolders: Array<string> = [];
    private explicitFiles: Set<string> = new Set<string>();
    private explicitFolders: Set<string> = new Set<string>();
    private _onDidChangeFiles: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeFiles: vscode.Event<void> = this._onDidChangeFiles.event;

    /**
     * Constructor initializes the manager and loads explicit files from the extension's state.
     * @param context - The VS Code extension context used for state management.
     */
    constructor(private context: vscode.ExtensionContext) {
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
    public addResource(resourceUri: vscode.Uri): void {
        const fsPath = resourceUri.fsPath;

        // Check if the path is inside the workspace
        if (!this.isPathInWorkspace(fsPath)) {
            vscode.window.showWarningMessage(`Cannot add "${fsPath}" because it is outside the workspace.`);
            this.logger.warn(`Attempted to add resource outside workspace: ${fsPath}`);
            return;
        }

        try {
            const stat = statSync(fsPath);

            if (stat.isDirectory()) {
                this.addFolderAndContents(fsPath);
            } else if (stat.isFile()) {
                this.addFile(fsPath);
            }
            this.emitFilesChanged(); // Emit event after adding
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add resource: ${fsPath}. Error: ${Utility.getErrorMessage(error)}`);
            this.logger.error(`Failed to add resource: ${fsPath}`, { error });
        }
    }

    /**
     * Removes a resource (file or folder) from the explicit files/folders sets.
     * @param resourceUri - The URI of the file or folder to remove.
     */
    public removeResource(resourceUri: vscode.Uri): void {
        const fsPath = resourceUri.fsPath;

        // Check if the path is inside the workspace
        if (!this.isPathInWorkspace(fsPath)) {
            vscode.window.showWarningMessage(`Cannot remove "${fsPath}" because it is outside the workspace.`);
            this.logger.warn(`Attempted to remove resource outside workspace: ${fsPath}`);
            return;
        }

        try {
            if (this.explicitFiles.has(fsPath)) {
                this.explicitFiles.delete(fsPath);
                this.logger.debug(`Removed file from explicitFiles: ${fsPath}`);
            }

            if (this.explicitFolders.has(fsPath)) {
                this.explicitFolders.delete(fsPath);
                this.logger.debug(`Removed folder from explicitFolders: ${fsPath}`);
            }

            const stat = statSync(fsPath);
            if (stat.isDirectory()) {
                // Recursively remove contents of the folder
                const entries = readdirSync(fsPath);
                entries.forEach((entry) => {
                    const entryPath = path.join(fsPath, entry);
                    this.removeResource(vscode.Uri.file(entryPath));
                });
            }

            this.emitFilesChanged(); // Emit event after removal
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
        this.saveExplicitFilesToState();
        vscode.window.showInformationMessage('Cleared all files and folders from ChatGPT context.');
        this.logger.info('Cleared all explicit files and folders.');
        this.emitFilesChanged(); // Emit event after clearing
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
        return this.explicitFiles.has(filePath);
    }

    /**
     * Checks if a folder is included in the explicit folders set.
     * @param folderPath - The path of the folder to check.
     * @returns `true` if the folder is included; otherwise, `false`.
     */
    public isFolderIncluded(folderPath: string): boolean {
        return this.explicitFolders.has(folderPath);
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
    private addFolderAndContents(folderPath: string): void {
        if (!folderPath) {
            this.logger.warn('Received an undefined folderPath. Skipping.');
            return;
        }

        // Check if the folder is inside the workspace
        if (!this.isPathInWorkspace(folderPath)) {
            this.logger.warn(`Cannot add folder "${folderPath}" because it is outside the workspace.`);
            return;
        }

        if (!this.explicitFolders.has(folderPath)) {
            this.explicitFolders.add(folderPath);
            this.logger.debug(`Added folder to explicitFolders: ${folderPath}`);
        }

        try {
            const entries = readdirSync(folderPath);
            entries.forEach((entry) => {
                const entryPath = path.join(folderPath, entry);
                try {
                    const entryStat = statSync(entryPath);
                    if (entryStat.isDirectory()) {
                        this.addFolderAndContents(entryPath); // Recursively add subfolders
                    } else if (entryStat.isFile()) {
                        this.addFile(entryPath); // Add individual files
                    } else {
                        this.logger.warn(`Entry "${entryPath}" is neither a file nor a directory. Skipping.`);
                    }
                } catch (error) {
                    this.logger.error(`Failed to process entry "${entryPath}": ${Utility.getErrorMessage(error)}`, { error });
                }
            });
        } catch (error) {
            this.logger.error(`Failed to read directory: ${folderPath}: ${Utility.getErrorMessage(error)}`, { error });
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

        if (!this.explicitFiles.has(filePath)) {
            this.explicitFiles.add(filePath);
            this.logger.debug(`Added file to explicitFiles: ${filePath}`);
        }
    }

    /**
     * Emits the 'filesChanged' event to notify subscribers of changes.
     */
    private emitFilesChanged(): void {
        this.logger.debug('ExplicitFilesManager emitting event onDidChangeFiles');
        this._onDidChangeFiles.fire();
    }
}
