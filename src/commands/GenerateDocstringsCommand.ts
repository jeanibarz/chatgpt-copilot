import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { loadGenerateDocstringPrompt } from '../config/Configuration';
import { ChatGptViewProvider, CommandType } from '../view/ChatGptViewProvider';
import { ICommand } from './ICommand';

/**
 * This module provides functionality for generating and inserting 
 * docstrings into code files within a VS Code extension. It handles 
 * the command execution for generating docstrings, managing temporary 
 * files for comparison, and applying changes to the active editor.
 * 
 * The `GenerateDocstringsCommand` class implements the `ICommand` 
 * interface, allowing it to be executed as a command in the VS Code 
 * command palette. It provides methods to generate docstrings based 
 * on the content of the active editor and handle any related errors.
 * 
 * Key Features:
 * - Generates docstrings based on the selected text in the active editor.
 * - Manages temporary files for pre-save content comparison.
 * - Handles error messages and file saving operations.
 */
export class GenerateDocstringsCommand implements ICommand {
  public type = CommandType.GenerateDocstrings;

  /**
   * Executes the command to generate and insert docstrings into the 
   * active editor's content.
   * 
   * This method checks for an active editor, retrieves the current 
   * text, generates the docstring, and applies it to the document. 
   * It also manages temporary files for content comparison and handles 
   * any errors that may occur during the process.
   * 
   * @param data - The data associated with the command execution.
   * @param provider - An instance of `ChatGptViewProvider` for accessing 
   * the docstring generation functionality.
   */
  public async execute(data: any, provider: ChatGptViewProvider) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      this.showError('No active editor found.');
      return;
    }

    const preSaveContent = activeEditor.document.getText();
    const originalFileUri = activeEditor.document.uri;
    const tempFilePath = this.createTempFile(preSaveContent);

    const text = await provider.getActiveEditorText();
    if (!text) {
      this.showError('No text found in the active editor.');
      return;
    }

    const docstringContent = await this.generateDocstring(text, provider);
    const editSuccess = await this.applyDocstring(activeEditor, docstringContent);

    if (!editSuccess) {
      this.showError('Failed to update the document with the new docstring.');
      return;
    }

    const didSave = await activeEditor.document.save();
    if (!didSave) {
      this.showError('File could not be saved.');
      return;
    }

    await this.showDiff(originalFileUri, tempFilePath);
    this.cleanupTempFile(tempFilePath);
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
   * Creates a temporary file with the specified content.
   * 
   * This method generates a temporary file path in the system's 
   * temporary directory and writes the provided content to that file.
   * 
   * @param content - The content to write to the temporary file.
   * @returns The path of the created temporary file.
   */
  private createTempFile(content: string): string {
    const tempFilePath = path.join(os.tmpdir(), `preSave-${Date.now()}.ts`);
    fs.writeFileSync(tempFilePath, content);
    return tempFilePath;
  }

  /**
   * Generates a docstring based on the provided text using the 
   * `ChatGptViewProvider`.
   * 
   * This method constructs a prompt for the docstring generator and 
   * returns the generated docstring.
   * 
   * @param text - The text for which the docstring is to be generated.
   * @param provider - An instance of `ChatGptViewProvider` for accessing 
   * the docstring generation functionality.
   * @returns A promise that resolves to the generated docstring.
   */
  private async generateDocstring(text: string, provider: ChatGptViewProvider): Promise<string> {
    const docstringPrompt = loadGenerateDocstringPrompt;
    const prompt = `${docstringPrompt}\n\n${text}\n\n`;
    return await provider.docstringGenerator.generateDocstring(prompt);
  }

  /**
   * Applies the generated docstring to the active editor's content.
   * 
   * This method creates a workspace edit to replace the entire content 
   * of the active document with the provided docstring content.
   * 
   * @param editor - The active text editor where the docstring will be applied.
   * @param content - The docstring content to insert into the editor.
   * @returns A promise that resolves to true if the edit was successful; 
   * otherwise, false.
   */
  private async applyDocstring(editor: vscode.TextEditor, content: string): Promise<boolean> {
    const edit = new vscode.WorkspaceEdit();
    const entireRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(editor.document.getText().length)
    );
    edit.replace(editor.document.uri, entireRange, content);
    return await vscode.workspace.applyEdit(edit);
  }

  /**
   * Displays a diff comparison between the original file and the temporary 
   * file containing the pre-save content.
   * 
   * @param originalFileUri - The URI of the original file to compare.
   * @param tempFilePath - The path of the temporary file for comparison.
   */
  private async showDiff(originalFileUri: vscode.Uri, tempFilePath: string) {
    const tempFileUri = vscode.Uri.file(tempFilePath);
    await vscode.commands.executeCommand(
      'vscode.diff',
      tempFileUri,
      originalFileUri,
      'Pre-Save vs Saved Comparison'
    );
  }

  /**
   * Cleans up the temporary file created during the command execution.
   * 
   * This method sets up a listener to delete the temporary file once 
   * the associated text document is closed.
   * 
   * @param tempFilePath - The path of the temporary file to clean up.
   */
  private cleanupTempFile(tempFilePath: string) {
    const tempFileUri = vscode.Uri.file(tempFilePath);
    const listener = vscode.workspace.onDidCloseTextDocument((doc) => {
      if (doc.uri.toString() === tempFileUri.toString()) {
        fs.unlink(tempFilePath, (err) => {
          if (err) {
            console.error(`Failed to delete temp file: ${tempFilePath}`, err);
          } else {
            console.log(`Temp file ${tempFilePath} successfully deleted.`);
          }
        });
        listener.dispose();
      }
    });
  }
}