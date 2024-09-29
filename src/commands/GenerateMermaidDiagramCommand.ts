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

import { defaultSystemPromptForGenerateMermaidDiagram } from "../config/Configuration";
import { ICommand } from '../interfaces/ICommand';
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class GenerateMermaidDiagramCommand implements ICommand {
    public type = ChatGPTCommandType.GenerateMermaidDiagram;

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
    public async execute(data: any, provider: ChatGptViewProvider) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            this.showError('No active editor found.');
            return;
        }

        const selectedText = activeEditor.selection.isEmpty
            ? activeEditor.document.getText()
            : activeEditor.document.getText(activeEditor.selection);

        if (!selectedText) {
            this.showError('No text selected in the active editor.');
            return;
        }

        try {
            const diagramContent = await this.generateDiagram(selectedText, provider);
            const saveSuccess = await this.saveDiagramToFile(activeEditor.document.uri, diagramContent);

            if (saveSuccess) {
                vscode.window.showInformationMessage('Mermaid class diagram generated successfully.');
            } else {
                this.showError('Failed to save the diagram.');
            }
        } catch (error) {
            this.showError(`An error occurred: ${(error as Error).message}`);
        }
    }

    /**
     * Displays an error message in the VS Code window.
     * 
     * @param message - The error message to display.
     */
    private showError(message: string) {
        vscode.window.showErrorMessage(message);
    }

    /**
     * Generates a Mermaid class diagram based on the provided text using the 
     * `MermaidDiagramGenerator`.
     * 
     * This method constructs a prompt for the diagram generator and 
     * returns the generated diagram.
     * 
     * @param text - The text for which the diagram is to be generated.
     * @param provider - An instance of `ChatGptViewProvider` for accessing 
     * the diagram generation functionality.
     * @returns A promise that resolves to the generated Mermaid diagram.
     */
    private async generateDiagram(text: string, provider: ChatGptViewProvider): Promise<string> {
        const diagramPrompt = defaultSystemPromptForGenerateMermaidDiagram;
        provider.logger.info(`diagramPrompt: ${diagramPrompt}`);
        const prompt = `${diagramPrompt}\n\n${text}\n\n`;
        return await provider.mermaidDiagramGenerator.generateDiagram(prompt);
    }

    /**
     * Saves the generated Mermaid diagram to a file within the `/class_diagrams/` 
     * subfolder of the root workspace. The filename is based on the active file's name.
     * 
     * @param activeFileUri - The URI of the active file.
     * @param diagramContent - The Mermaid diagram content to save.
     * @returns A promise that resolves to true if the file was saved successfully; otherwise, false.
     */
    private async saveDiagramToFile(activeFileUri: vscode.Uri, diagramContent: string): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.showError('No workspace folder is open.');
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
            this.showInfo(`Diagram saved to ${path.relative(rootPath, diagramFilePath)}`);
            return true;
        } catch (error) {
            this.loggerError(`Failed to save diagram: ${(error as Error).message}`);
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

    /**
     * Logs an error message and displays it to the user.
     * 
     * @param message - The error message to log and display.
     */
    private loggerError(message: string) {
        // Assuming provider has a logger
        // If not, adjust accordingly
        // Example:
        // provider.logger.error(message);
        vscode.window.showErrorMessage(message);
        console.error(message);
    }

    /**
     * Displays an informational message to the user.
     * 
     * @param message - The information message to display.
     */
    private showInfo(message: string) {
        vscode.window.showInformationMessage(message);
    }
}