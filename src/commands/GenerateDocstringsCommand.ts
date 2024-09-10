import * as vscode from 'vscode';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';
import { loadGenerateDocstringPrompt } from '../config/configuration';
import { ICommand } from './ICommand';

export class GenerateDocstringsCommand implements ICommand {
  public type = CommandType.GenerateDocstrings;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const text = await provider.getActiveEditorText();
    if (!text) {
      vscode.window.showErrorMessage('No text found in the active editor.');
      return;
    }
    const docstringPrompt = loadGenerateDocstringPrompt;
    const prompt = `${docstringPrompt}\n\n${text}\n\n`;
    const docstringFilePath = await provider.docstringGenerator.generateDocstring(prompt);
    const originalFilePath = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (originalFilePath) {
      await provider.showSideBySideComparison(originalFilePath, docstringFilePath);
    }
  }
}
