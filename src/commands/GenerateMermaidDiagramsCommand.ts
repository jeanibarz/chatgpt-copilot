// src/commands/GenerateMermaidDiagramsCommand.ts

/**
 * This module provides the GenerateMermaidDiagramsCommand class, which is responsible 
 * for generating Mermaid diagrams based on user-selected files or folders. It utilizes 
 * the IMermaidDiagramService for processing files and integrates with the VS Code 
 * environment to manage user interactions and outputs.
 */

import * as vscode from 'vscode';

import { inject, injectable } from 'inversify';
import pLimit from "p-limit";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { IMermaidDiagramService } from "../interfaces/IMermaidDiagramService";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { getMermaidOutputFolder, setMermaidOutputFolder } from "../services/MermaidManager";
import { StateManager } from "../state/StateManager";

@injectable()
export class GenerateMermaidDiagramsCommand implements ICommand {
    public readonly type = ChatGPTCommandType.GenerateMermaidDiagrams;
    private logger: CoreLogger = CoreLogger.getInstance();
    private outputChannel: vscode.OutputChannel;

    constructor(
        @inject(TYPES.IMermaidDiagramService) private mermaidDiagramService: IMermaidDiagramService,
    ) {
        this.outputChannel = vscode.window.createOutputChannel('Mermaid Diagrams');
    }

    /**
     * Executes the command to generate Mermaid diagrams from the provided file or folder URIs.
     * 
     * @param data - A single URI or an array of URIs representing the files or folders to process.
     */
    public async execute(data: vscode.Uri | vscode.Uri[]) {
        this.logger.info("Executing GenerateMermaidDiagramsCommand");

        const targets = Array.isArray(data) ? data : [data];
        if (!targets || targets.length === 0) {
            vscode.window.showErrorMessage('No files or folders selected.');
            this.logger.warn('No files or folders selected for diagram generation.');
            return;
        }

        const outputFolder = await this.promptForOutputFolder();
        if (!outputFolder) return;

        const logMessages: string[] = [];

        // Collect all files to process
        let fileUris: vscode.Uri[] = [];
        for (const targetUri of targets) {
            const stat = await vscode.workspace.fs.stat(targetUri);
            if (stat.type === vscode.FileType.Directory) {
                this.logger.info(`Collecting files from folder: ${targetUri.fsPath}`);
                const filesInFolder = await this.mermaidDiagramService.getAllFilesInFolder(targetUri);
                fileUris = fileUris.concat(filesInFolder);
            } else {
                this.logger.info(`Adding file: ${targetUri.fsPath}`);
                fileUris.push(targetUri);
            }
        }

        const totalFiles = fileUris.length;

        if (totalFiles === 0) {
            vscode.window.showErrorMessage('No files found to process.');
            this.logger.warn('No files found to process.');
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating Mermaid Diagrams...",
                cancellable: true
            }, async (progress, token) => {
                let processedFiles = 0;

                const safelyIncrementProgress = () => {
                    processedFiles++;
                    const increment = (100 / totalFiles);
                    progress.report({ increment, message: `Processed ${processedFiles}/${totalFiles}` });
                };

                const limit = pLimit(5); // Set concurrency limit here

                const fileProcessingPromises = fileUris.map(fileUri =>
                    limit(async () => {
                        if (token.isCancellationRequested) {
                            throw new Error('Operation canceled by the user.');
                        }
                        await this.mermaidDiagramService.processFile(fileUri, outputFolder, logMessages);
                        safelyIncrementProgress();
                    })
                );

                await Promise.all(fileProcessingPromises);

                logMessages.forEach(message => this.outputChannel.appendLine(message));
                this.outputChannel.show(true);
                vscode.window.showInformationMessage('Mermaid diagrams generated successfully.');
            });
        } catch (error) {
            this.logger.error(`Error generating diagrams: ${(error as Error).message}`);
            vscode.window.showErrorMessage(`An error occurred: ${(error as Error).message}`);
        }
    }

    /**
     * Prompts the user to select an output folder for the generated Mermaid diagrams.
     * 
     * @returns A promise that resolves to the selected folder URI, or undefined if no folder was selected.
     */
    private async promptForOutputFolder(): Promise<vscode.Uri | undefined> {
        const previousFolder: string | undefined = getMermaidOutputFolder();
        const configDefaultFolder = StateManager.getInstance().getConfigurationStateManager().getConfig<string>('defaultMermaidOutputFolder', '');

        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            canSelectFolders: true,
            canSelectFiles: false,
            openLabel: 'Select Output Folder',
            defaultUri: previousFolder ? vscode.Uri.file(previousFolder) :
                configDefaultFolder ? vscode.Uri.file(configDefaultFolder) :
                    undefined,
            title: 'Select Output Folder for Mermaid Diagrams',
        };

        const selectedFolders = await vscode.window.showOpenDialog(options);
        if (selectedFolders && selectedFolders.length > 0) {
            const selectedFolder = selectedFolders[0];
            await setMermaidOutputFolder(selectedFolder.fsPath);
            return selectedFolder;
        } else {
            return undefined;
        }
    }
}