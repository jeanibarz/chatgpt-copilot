// contextDecorationProvider.ts

import * as vscode from 'vscode';
import { ExplicitFilesManager } from './explicitFilesManager';

export class ContextDecorationProvider implements vscode.FileDecorationProvider {
    private onDidChange = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
    readonly onDidChangeFileDecorations = this.onDidChange.event;

    constructor(private explicitFilesManager: ExplicitFilesManager) {
        // Register the provider
        vscode.window.registerFileDecorationProvider(this);
    }

    /**
     * Provides file decoration for a given URI.
     * @param uri - The URI of the file or folder for which to provide decoration.
     * @returns A FileDecoration if the file is in the context; otherwise, undefined.
     */
    provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
        const isExplicitlyAdded = this.explicitFilesManager.getExplicitFiles().has(uri.fsPath);

        if (isExplicitlyAdded) {
            return {
                badge: '★',
                tooltip: 'This file/folder is in the ChatGPT context',
                color: new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'),
            };
        }

        return undefined;
    }

    /**
     * Fires an event to refresh decorations.
     * This method should be called when the decoration needs to be updated.
     */
    refresh(uri?: vscode.Uri): void {
        this.onDidChange.fire(uri);
    }
}
