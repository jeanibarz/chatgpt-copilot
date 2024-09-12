// explicitFilesManager.ts

import { readdirSync, statSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class ExplicitFilesManager {
    private explicitFiles: Map<string, boolean> = new Map<string, boolean>();

    constructor(private context: vscode.ExtensionContext) {
        this.loadExplicitFilesFromState();
    }

    /**
     * Adds a file or folder to the explicit files map.
     * @param resourceUri - The URI of the file or folder to add.
     */
    addResource(resourceUri: vscode.Uri): void {
        const fsPath = resourceUri.fsPath;
        try {
            const stat = statSync(fsPath);

            if (stat.isDirectory()) {
                this.addFolderAndContents(fsPath);
            } else if (stat.isFile()) {
                this.addFile(fsPath);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add resource: ${fsPath}`);
        }
    }

    /**
     * Removes a file or folder from the explicit files map.
     * @param resourceUri - The URI of the file or folder to remove.
     */
    removeResource(resourceUri: vscode.Uri): void {
        const fsPath = resourceUri.fsPath;
        try {
            if (this.explicitFiles.has(fsPath)) {
                this.explicitFiles.delete(fsPath);
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
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to remove resource: ${fsPath}`);
        }
    }

    /**
     * Clears all files and folders from the explicit files map.
     */
    clearAllResources(): void {
        this.explicitFiles.clear();
        this.saveExplicitFilesToState();
        vscode.window.showInformationMessage('Cleared all files and folders from ChatGPT context.');
    }

    /**
     * Gets the map of explicit files.
     * @returns A Map of file paths to boolean.
     */
    getExplicitFiles(): Map<string, boolean> {
        return this.explicitFiles;
    }

    /**
     * Saves the explicit files to the global state.
     */
    saveExplicitFilesToState(): void {
        const filePaths = Array.from(this.explicitFiles.keys());
        this.context.globalState.update('chatgpt.explicitFiles', filePaths);
    }

    /**
     * Loads the explicit files from the global state.
     */
    private loadExplicitFilesFromState(): void {
        const savedFiles = this.context.globalState.get<string[]>('chatgpt.explicitFiles', []);
        savedFiles.forEach((filePath) => {
            this.explicitFiles.set(filePath, true);
        });
    }

    /**
     * Adds a folder and all its contents to the explicit files map.
     * @param folderPath - The path of the folder to add.
     */
    private addFolderAndContents(folderPath: string): void {
        if (!this.explicitFiles.has(folderPath)) {
            this.explicitFiles.set(folderPath, true); // Add the folder itself
        }

        const entries = readdirSync(folderPath);
        entries.forEach((entry) => {
            const entryPath = path.join(folderPath, entry);
            const entryStat = statSync(entryPath);

            if (entryStat.isDirectory()) {
                this.addFolderAndContents(entryPath); // Recursively add subfolders
            } else if (entryStat.isFile()) {
                this.addFile(entryPath); // Add individual files
            }
        });
    }

    /**
     * Adds a file to the explicit files map.
     * @param filePath - The path of the file to add.
     */
    private addFile(filePath: string): void {
        if (!this.explicitFiles.has(filePath)) {
            this.explicitFiles.set(filePath, true);
        }
    }
}
