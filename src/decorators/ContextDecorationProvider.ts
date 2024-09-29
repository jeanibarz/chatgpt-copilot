// src/decorators/ContextDecorationProvider.ts

/**
 * This module provides a file decoration provider for the VS Code extension,
 * allowing files and folders to display specific decorations based on their
 * context within the ChatGPT environment.
 * 
 * The `ContextDecorationProvider` class implements the `vscode.FileDecorationProvider` 
 * interface to manage visual indicators for files that have been explicitly added 
 * to the ChatGPT context. It allows users to easily identify which files are relevant 
 * for their interactions with the ChatGPT functionality.
 * 
 * Key Features:
 * - Provides visual decorations for files and folders based on their context.
 * - Integrates with the `ExplicitFilesManager` to determine which files are explicitly added.
 * - Supports event-driven updates for file decorations.
 */

import * as vscode from 'vscode';
import { InclusionState } from "../interfaces/enums/InclusionState";
import { MyTreeDataProvider } from '../tree/MyTreeDataProvider';

export class ContextDecorationProvider implements vscode.FileDecorationProvider {
    private onDidChange = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
    readonly onDidChangeFileDecorations = this.onDidChange.event;

    constructor(
        private treeDataProvider: MyTreeDataProvider // Inject TreeDataProvider
    ) {
        // Register the provider
        vscode.window.registerFileDecorationProvider(this);

        // Listen to tree data changes to refresh decorations
        this.treeDataProvider.onDidChangeTreeData(() => {
            this.refresh();
        });
    }

    /**
     * Provides file decoration for a given URI.
     * 
     * This method checks if the file is explicitly added to the context and returns
     * the appropriate decoration if it is.
     * 
     * @param uri - The URI of the file or folder for which to provide decoration.
     * @returns A `FileDecoration` if the file is in the context; otherwise, undefined.
     */
    public provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
        const filePath = uri.fsPath;
        const treeNode = this.treeDataProvider.findNodeByPath(filePath, true);

        if (treeNode) {
            switch (treeNode.content) {
                case InclusionState.Included:
                    return {
                        badge: '+',
                        tooltip: 'This file/folder is in the ChatGPT context',
                        color: new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'),
                    };
                case InclusionState.PartiallyIncluded:
                    return {
                        badge: '±', // Alternatively, choose a suitable symbol
                        tooltip: 'This folder has some files in the ChatGPT context',
                        color: new vscode.ThemeColor('gitDecoration.untrackedResourceForeground'),
                    };
                case InclusionState.NotIncluded:
                    return undefined; // No decoration
                default:
                    return undefined;
            }
        }

        return undefined;
    }

    /**
     * Fires an event to refresh decorations.
     * 
     * This method should be called when the decoration needs to be updated, such as 
     * when files are added or removed from the explicit context.
     * 
     * @param uri - An optional URI of the file to refresh its decoration.
     */
    refresh(uri?: vscode.Uri): void {
        this.onDidChange.fire(uri);
    }
}