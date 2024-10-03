// src/commands/GenerateDocstringsCommand.ts

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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { inject, injectable } from "inversify";
import { defaultSystemPromptForGenerateDocstring } from '../config/Configuration';
import { IDocstringService } from "../interfaces";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { Utility } from "../Utility";

@injectable()
export class GenerateDocstringsCommand implements ICommand {
  public readonly type = ChatGPTCommandType.GenerateDocstrings;
  private logger: CoreLogger = CoreLogger.getInstance();

  constructor(
    @inject(TYPES.IDocstringService) private docstringService: IDocstringService,
  ) { }


  public async execute(data: any) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      Utility.showError('No active editor found.');
      return;
    }

    const preSaveContent = activeEditor.document.getText();
    const originalFileUri = activeEditor.document.uri;
    const tempFilePath = this.createTempFile(preSaveContent);

    const text = activeEditor.document.getText();
    if (!text) {
      Utility.showError('No text found in the active editor.');
      return;
    }

    const docstringContent = await this.generateDocstring(text);
    const editSuccess = await this.applyDocstring(activeEditor, docstringContent);

    if (!editSuccess) {
      Utility.showError('Failed to update the document with the new docstring.');
      return;
    }

    const didSave = await activeEditor.document.save();
    if (!didSave) {
      Utility.showError('File could not be saved.');
      return;
    }

    await this.showDiff(originalFileUri, tempFilePath);
    this.cleanupTempFile(tempFilePath);
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
   * Generates a docstring based on the provided text.
   * 
   * This method constructs a prompt for the docstring generator and 
   * returns the generated docstring.
   * 
   * @param text - The text for which the docstring is to be generated.
   * the docstring generation functionality.
   * @returns A promise that resolves to the generated docstring.
   */
  private async generateDocstring(text: string): Promise<string> {
    const docstringPrompt = defaultSystemPromptForGenerateDocstring;
    this.logger.info(`docstringPrompt: ${docstringPrompt}`);
    const prompt = `${docstringPrompt}\n\n${text}\n\n`;
    return await this.docstringService.generateDocstring(prompt);
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
      if (doc.uri.fsPath === tempFileUri.fsPath) {
        fs.unlink(tempFileUri.fsPath, (err) => {
          if (err) {
            console.error(`Failed to delete temp file: ${tempFileUri.fsPath}`, err);
          } else {
            console.log(`Temp file ${tempFileUri.fsPath} successfully deleted.`);
          }
        });
        listener.dispose();
      }
    });
  }
}