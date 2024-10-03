// src/commands/GenerateMermaidDiagramCommand.ts

/**
 * This module provides functionality for generating and saving 
 * Mermaid class diagrams into a designated subfolder within the 
 * root workspace of a VS Code extension. It handles the command 
 * execution for generating diagrams, ensuring they are stored 
 * appropriately with filenames corresponding to the active file.
 * 
 * Key Features:
 * - Generates Mermaid class diagrams based on the selected text in the active editor.
 * - Saves the generated diagrams into a `/class_diagrams/` subfolder within the root workspace.
 * - Names the diagram files similarly to the current active file.
 * - Handles error messages and file operations effectively.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { inject, injectable } from 'inversify';
import { defaultSystemPromptForGenerateMermaidDiagram } from "../config/Configuration";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { MermaidDiagramGenerator } from '../MermaidDiagramGenerator';
import { Utility } from "../Utility";

@injectable()
export class GenerateMermaidDiagramCommand implements ICommand {
    public readonly type = ChatGPTCommandType.GenerateMermaidDiagram;
    private logger: CoreLogger = CoreLogger.getInstance();

    constructor(
        @inject(TYPES.MermaidDiagramGenerator) private mermaidDiagramGenerator: MermaidDiagramGenerator,
    ) { }

    /**
     * Executes the command to generate and save a Mermaid class diagram into 
     * the `/class_diagrams/` subfolder within the root workspace.
     * 
     * This method checks for an active editor, retrieves the selected 
     * text, generates the diagram, and saves it to the designated folder. 
     * It handles any errors that may occur during the process.
     * 
     * @param data - The data associated with the command execution.
     * @param provider - An instance of `ChatGptViewProvider` for accessing 
     * the diagram generation functionality.
     */
    public async execute(data: any) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            Utility.showError('No active editor found.');
            return;
        }

        const selectedText = activeEditor.selection.isEmpty
            ? activeEditor.document.getText()
            : activeEditor.document.getText(activeEditor.selection);

        if (!selectedText) {
            Utility.showError('No text selected in the active editor.');
            return;
        }

        try {
            const diagramContent = await this.generateDiagram(selectedText);
            const saveSuccess = await this.saveDiagramToFile(activeEditor.document.uri, diagramContent);

            if (saveSuccess) {
                vscode.window.showInformationMessage('Mermaid class diagram generated successfully.');
            } else {
                Utility.showError('Failed to save the diagram.');
            }
        } catch (error) {
            Utility.showError(`An error occurred: ${(error as Error).message}`);
        }
    }

    private async generateDiagram(text: string): Promise<string> {
        const diagramPrompt = defaultSystemPromptForGenerateMermaidDiagram;
        this.logger.info(`diagramPrompt: ${diagramPrompt}`);
        const prompt = `${diagramPrompt}\n\n${text}\n\n`;
        return await this.mermaidDiagramGenerator.generateDiagram(prompt);
    }

    private async saveDiagramToFile(activeFileUri: vscode.Uri, diagramContent: string): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            Utility.showError('No workspace folder is open.');
            return false;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const diagramsDir = path.join(rootPath, 'chatgpt-copilot', 'class_diagrams');

        // Ensure the /class_diagrams/ directory exists
        if (!fs.existsSync(diagramsDir)) {
            fs.mkdirSync(diagramsDir, { recursive: true });
        }

        // Derive the filename based on the active file's name
        const activeFileName = path.basename(activeFileUri.fsPath, path.extname(activeFileUri.fsPath));
        const diagramFileName = `${activeFileName}.md`; // Using .md for Markdown with Mermaid support
        const diagramFilePath = path.join(diagramsDir, diagramFileName);

        // Format the diagram content with Mermaid code block
        const formattedDiagram = this.formatMermaidDiagram(diagramContent);

        try {
            fs.writeFileSync(diagramFilePath, formattedDiagram, 'utf-8');
            vscode.window.showInformationMessage(`Diagram saved to ${path.relative(rootPath, diagramFilePath)}`);
            return true;
        } catch (error) {
            const message = `Failed to save diagram: ${(error as Error).message}`;
            vscode.window.showErrorMessage(message);
            this.logger.error(message);
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
        if (!trimmedDiagram.startsWith("```mermaid")) {
            return `\`\`\`mermaid\n${trimmedDiagram}\n\`\`\``;
        }
        return trimmedDiagram;
    }
}