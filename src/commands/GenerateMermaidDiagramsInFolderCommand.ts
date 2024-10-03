// src/commands/GenerateMermaidDiagramsInFolderCommand.ts

import * as fs from 'fs';
import { inject, injectable } from "inversify";
import pLimit from 'p-limit';
import * as path from 'path';
import * as vscode from 'vscode';
import { defaultSystemPromptForGenerateMermaidDiagram, getConfig, getMermaidOutputFolder, setMermaidOutputFolder } from '../config/Configuration';
import { ChatGPTCommandType } from '../interfaces/enums/ChatGPTCommandType';
import { ICommand } from '../interfaces/ICommand';
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { MermaidDiagramGenerator } from '../MermaidDiagramGenerator';

@injectable()
export class GenerateMermaidDiagramsInFolderCommand implements ICommand {
    public readonly type = ChatGPTCommandType.GenerateMermaidDiagramsInFolder;
    private logger: CoreLogger = CoreLogger.getInstance();
    private outputChannel: vscode.OutputChannel;

    constructor(
        @inject(TYPES.MermaidDiagramGenerator) private mermaidDiagramGenerator: MermaidDiagramGenerator
    ) {
        this.outputChannel = vscode.window.createOutputChannel('Mermaid Diagrams');
    }

    public async execute(data: any) {
        const targets: vscode.Uri[] = Array.isArray(data) ? data : [data];

        if (!targets || targets.length === 0) {
            vscode.window.showErrorMessage('No files or folders selected.');
            return;
        }

        const outputFolder = await this.promptForOutputFolder();
        if (!outputFolder) {
            return; // User canceled the dialog
        }

        const limit = pLimit(5); // Limit concurrency to 1 task at a time
        let totalItems = 0;

        for (const targetUri of targets) {
            const stat = await vscode.workspace.fs.stat(targetUri);
            const isDirectory = stat.type === vscode.FileType.Directory;

            if (isDirectory) {
                const fileUris = await this.getAllFilesInFolder(targetUri);
                totalItems += fileUris.length;
            } else {
                totalItems++;
            }
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating Mermaid Diagrams...",
            cancellable: true // Allow user to cancel the operation
        }, async (progress, token) => {
            // Check if the user cancels the operation
            if (token.isCancellationRequested) {
                return;
            }

            progress.report({ increment: 0, message: "Starting..." });

            let processedItems = 0;
            let logMessages: string[] = [];

            const safelyIncrementProgress = () => {
                processedItems++;
                const increment = (100 / totalItems);
                progress.report({ increment: increment, message: `Processed ${processedItems}/${totalItems}` });
            };

            const processingPromises = targets.map(async (targetUri) => {
                if (token.isCancellationRequested) {
                    return; // Exit early if canceled
                }

                const stat = await vscode.workspace.fs.stat(targetUri);
                const isDirectory = stat.type === vscode.FileType.Directory;

                if (isDirectory) {
                    const fileUris = await this.getAllFilesInFolder(targetUri);
                    const folderProcessingPromises = fileUris.map((fileUri) =>
                        limit(async () => {
                            if (token.isCancellationRequested) {
                                return; // Exit early if canceled
                            }

                            await this.processFileWithProgress(fileUri, outputFolder, logMessages);
                            safelyIncrementProgress(); // Increment progress after file is processed
                        })
                    );
                    await Promise.all(folderProcessingPromises);
                } else {
                    await limit(async () => {
                        if (token.isCancellationRequested) {
                            return; // Exit early if canceled
                        }

                        await this.processFileWithProgress(targetUri, outputFolder, logMessages);
                        safelyIncrementProgress(); // Increment progress after file is processed
                    });
                }
            });

            await Promise.all(processingPromises);

            if (!token.isCancellationRequested) {
                vscode.window.showInformationMessage('Mermaid diagrams generation completed.');
                logMessages.forEach(message => this.outputChannel.appendLine(message));
                this.outputChannel.show(true);
            }
        });
    }

    // Helper method to process a file with progress updates
    private async processFileWithProgress(
        fileUri: vscode.Uri,
        outputFolder: vscode.Uri,
        logMessages: string[]
    ): Promise<void> {
        try {
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const fileText = Buffer.from(fileContent).toString('utf-8');

            if (!fileText) {
                logMessages.push(`No content found in file: ${fileUri.fsPath}`);
                return;
            }

            // Generate the Mermaid diagram from the file content
            const diagramContent = await this.generateDiagram(fileText);
            const saveSuccess = await this.saveDiagramToFile(
                fileUri,
                diagramContent,
                outputFolder,
                logMessages
            );

            if (!saveSuccess) {
                logMessages.push(`Failed to save diagram for file: ${fileUri.fsPath}`);
            } else {
                logMessages.push(`Successfully processed file: ${fileUri.fsPath}`);
            }

        } catch (error) {
            logMessages.push(`Error processing file ${fileUri.fsPath}: ${(error as Error).message}`);
        }
    }


    private async promptForOutputFolder(): Promise<vscode.Uri | undefined> {
        const previousFolder: string | undefined = getMermaidOutputFolder();
        const configDefaultFolder = getConfig<string>('defaultMermaidOutputFolder', '');

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

    /**
     * Recursively retrieves all file URIs within the specified folder.
     * 
     * @param folderUri - The URI of the folder to traverse.
     * @returns A promise that resolves to an array of file URIs.
     */
    private async getAllFilesInFolder(folderUri: vscode.Uri): Promise<vscode.Uri[]> {
        let fileUris: vscode.Uri[] = [];
        const entries = await vscode.workspace.fs.readDirectory(folderUri);

        for (const [name, type] of entries) {
            const entryUri = vscode.Uri.joinPath(folderUri, name);

            if (type === vscode.FileType.Directory) {
                const subFiles = await this.getAllFilesInFolder(entryUri);
                fileUris = fileUris.concat(subFiles);
            } else if (type === vscode.FileType.File) {
                // Optional: Filter files based on inclusion/exclusion regex from configuration
                const inclusionRegex = getConfig<string>('fileInclusionRegex', '.*');
                const exclusionRegex = getConfig<string>('fileExclusionRegex', '');
                const filePath = entryUri.fsPath;

                if (new RegExp(inclusionRegex).test(filePath) && !new RegExp(exclusionRegex).test(filePath)) {
                    fileUris.push(entryUri);
                }
            }
        }

        return fileUris;
    }

    /**
     * Generates a Mermaid diagram from the provided file content.
     * 
     * @param text - The content of the file to generate a diagram from.
     * @param provider - An instance of `ChatGptViewProvider`.
     * @returns A promise that resolves to the generated Mermaid diagram string.
     */
    private async generateDiagram(text: string): Promise<string> {
        const diagramPrompt = defaultSystemPromptForGenerateMermaidDiagram;
        const prompt = `${diagramPrompt}\n\n${text}\n\n`;
        return await this.mermaidDiagramGenerator.generateDiagram(prompt);
    }

    private async saveDiagramToFile(
        fileUri: vscode.Uri,
        diagramContent: string,
        outputFolder: vscode.Uri,
        logMessages: string[]
    ): Promise<boolean> {
        const rootPath = vscode.workspace.getWorkspaceFolder(fileUri)?.uri.fsPath;
        if (!rootPath) {
            logMessages.push('No workspace folder is open.');
            return false;
        }

        const relativePath = path.relative(rootPath, fileUri.fsPath);
        const parsedPath = path.parse(relativePath);

        // Replace directory separators with underscores and sanitize
        const safeDir = parsedPath.dir.replace(/[\/\\]/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
        const safeName = parsedPath.name.replace(/[^a-zA-Z0-9_\-]/g, '');

        const diagramFileNameWithExt = `${safeDir}_${safeName}${parsedPath.ext}.md`;

        const diagramFilePath = path.join(outputFolder.fsPath, diagramFileNameWithExt); // Use Option 1 or Option 2

        const formattedDiagram = this.formatMermaidDiagram(diagramContent);

        try {
            if (!fs.existsSync(outputFolder.fsPath)) {
                fs.mkdirSync(outputFolder.fsPath, { recursive: true });
            }

            fs.writeFileSync(diagramFilePath, formattedDiagram, 'utf-8');
            logMessages.push(`Diagram saved to ${path.relative(rootPath, diagramFilePath)}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to save diagram: ${(error as Error).message}`);
            logMessages.push(`Failed to save diagram for ${fileUri.fsPath}: ${(error as Error).message}`);
            return false;
        }
    }

    /**
     * Formats the generated diagram to ensure it adheres to Mermaid syntax.
     * Wraps the diagram in a Mermaid code block if not already formatted.
     * 
     * @param diagram - The raw diagram string generated by the AI model.
     * @returns The formatted Mermaid diagram string.
     */
    private formatMermaidDiagram(diagram: string): string {
        const trimmedDiagram = diagram.trim();
        if (!trimmedDiagram.startsWith('```mermaid')) {
            return `\`\`\`mermaid\n${trimmedDiagram}\n\`\`\``;
        }
        return trimmedDiagram;
    }
}
