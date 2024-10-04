import * as vscode from 'vscode';

export interface IMermaidDiagramService {
    /**
     * Generates and formats a mermaid diagram based on the provided code prompt.
     *
     * @param prompt - The input code prompt for generating the diagram.
     * @param updateResponse - Optional callback to update the response as it's being generated.
     * @returns A promise that resolves with the formatted mermaid diagram.
     */
    generateDiagram(prompt: string, updateResponse?: (message: string) => void): Promise<string>;

    /**
     * Processes a single file for generating a mermaid diagram.
     * This method is public to allow the command handler to control progress and concurrency.
     *
     * @param fileUri - URI of the file to process.
     * @param outputFolder - The folder where the diagram will be saved.
     * @param logMessages - Array to store log messages related to the process.
     * @returns A promise that resolves when the file has been processed.
     */
    processFile(
        fileUri: vscode.Uri,
        outputFolder: vscode.Uri,
        logMessages: string[],
    ): Promise<void>;

    /**
     * Recursively retrieves all file URIs within the specified folder.
     *
     * @param folderUri - The URI of the folder to traverse.
     * @returns A promise that resolves to an array of file URIs.
     */
    getAllFilesInFolder(folderUri: vscode.Uri): Promise<vscode.Uri[]>;
}
