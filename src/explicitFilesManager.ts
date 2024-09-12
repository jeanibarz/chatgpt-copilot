// explicitFilesManager.ts

import { readdirSync, statSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * This module manages explicit files and folders for the ChatGPT VS Code extension.
 * It allows users to add, remove, and clear files and folders that are explicitly 
 * tracked within the extension context. The `ExplicitFilesManager` class handles 
 * the state of these files, ensuring that they can be easily managed and accessed 
 * during user interactions with the ChatGPT functionality.
 * 
 * Key Features:
 * - Adds and removes individual files and folders, including their contents.
 * - Clears all tracked files and folders from the context.
 * - Loads and saves the state of explicit files to the global state of the extension.
 */

export class ExplicitFilesManager {
    private explicitFiles: Map<string, boolean> = new Map<string, boolean>();

    /**
     * Constructor for the `ExplicitFilesManager` class.
     * Initializes the manager and loads explicit files from the extension's state.
     * 
     * @param context - The VS Code extension context used for state management.
     */
    constructor(private context: vscode.ExtensionContext) {
        this.loadExplicitFilesFromState();
    }

    /**
     * Adds a file or folder to the explicit files map.
     * 
     * This method checks the type of the resource (file or folder) and adds it
     * accordingly, including recursively adding the contents of folders.
     * 
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
     * 
     * This method deletes the specified resource from the map and, if it is a
     * directory, recursively removes all of its contents.
     * 
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
     * 
     * This method empties the map and saves the updated state to the global state.
     */
    clearAllResources(): void {
        this.explicitFiles.clear();
        this.saveExplicitFilesToState();
        vscode.window.showInformationMessage('Cleared all files and folders from ChatGPT context.');
    }

    /**
     * Gets the map of explicit files.
     * 
     * @returns A Map of file paths to boolean indicating whether they are tracked.
     */
    getExplicitFiles(): Map<string, boolean> {
        return this.explicitFiles;
    }

    /**
     * Saves the explicit files to the global state.
     * 
     * This method updates the global state with the current list of explicit file paths.
     */
    saveExplicitFilesToState(): void {
        const filePaths = Array.from(this.explicitFiles.keys());
        this.context.globalState.update('chatgpt.explicitFiles', filePaths);
    }

    /**
     * Loads the explicit files from the global state.
     * 
     * This method retrieves the list of explicit files from the global state and 
     * populates the explicit files map.
     */
    private loadExplicitFilesFromState(): void {
        const savedFiles = this.context.globalState.get<string[]>('chatgpt.explicitFiles', []);
        savedFiles.forEach((filePath) => {
            this.explicitFiles.set(filePath, true);
        });
    }

    /**
     * Adds a folder and all its contents to the explicit files map.
     * 
     * This method recursively adds the folder and all files and subfolders contained within it.
     * 
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
     * 
     * This method checks if the file is already in the map; if not, it adds it.
     * 
     * @param filePath - The path of the file to add.
     */
    private addFile(filePath: string): void {
        if (!this.explicitFiles.has(filePath)) {
            this.explicitFiles.set(filePath, true);
        }
    }
}