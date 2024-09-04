// extension.ts

/**
 * @author Pengfei Ni
 *
 * @license
 * Copyright (c) 2022 - 2023, Ali Gençay
 * Copyright (c) 2024 - Present, Pengfei Ni
 *
 * All rights reserved. Code licensed under the ISC license
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */

import * as path from 'path';
import * as vscode from 'vscode';

import AbortController from "abort-controller";
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createChatGptViewProvider } from "./factory";
import { Logger } from "./logger";

const logger = Logger.getInstance("ChatGPT Copilot");

global.AbortController = AbortController;

const menuCommands = [
  "addTests",
  "findProblems",
  "optimize",
  "explain",
  "addComments",
  "completeCode",
  "generateCode",
  "customPrompt1",
  "customPrompt2",
  "adhoc",
];

const logFilePath = path.join(__dirname, 'error.log');

export class ContextDecorationProvider implements vscode.FileDecorationProvider {
  private _decoratedFiles: Map<string, boolean> = new Map<string, boolean>();
  private _onDidChange = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
  readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[]> = this._onDidChange.event;

  constructor(private context: vscode.ExtensionContext) {
    // Register the provider
    this.context.subscriptions.push(vscode.window.registerFileDecorationProvider(this));
  }

  provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    const projectRoot = this.context.globalState.get('chatgpt.projectRoot') as string;

    // Check if the file/folder is part of the project root or context and ensure it's decorated only once
    if (this._decoratedFiles.get(uri.fsPath) && projectRoot && uri.fsPath.startsWith(projectRoot)) {
      // Return the badge only once
      return {
        badge: '★',
        tooltip: 'This folder is in the ChatGPT context',
        color: new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'),
      };
    }

    return undefined; // No decoration if not in context
  }

  updateTreeFileDecoration(resourceUri: vscode.Uri, isAdding: boolean = true): void {
    if (isAdding) {
      // Add the folder and its contents recursively
      this._addFolderAndContents(resourceUri.fsPath);
    } else {
      // Clear decorations that no longer match the new project root
      this._decoratedFiles.clear();
    }
    this._onDidChange.fire(undefined); // Fire event for all URIs
  }

  private _addFolderAndContents(folderPath: string) {
    // Add the folder itself to the decorated files, but only if it's not already added
    if (!this._decoratedFiles.has(folderPath)) {
      this._decoratedFiles.set(folderPath, true);
    }

    const entries = readdirSync(folderPath);
    entries.forEach((entry) => {
      const entryPath = join(folderPath, entry);
      const entryStat = statSync(entryPath);

      if (entryStat.isDirectory()) {
        // Recursively add the folder and its contents, but only if it's not already added
        if (!this._decoratedFiles.has(entryPath)) {
          this._decoratedFiles.set(entryPath, true);
          this._addFolderAndContents(entryPath);
        }
      } else if (entryStat.isFile()) {
        // Add the file to the decorated list, but only if it's not already added
        if (!this._decoratedFiles.has(entryPath)) {
          this._decoratedFiles.set(entryPath, true);
        }
      }
    });
  }

  dispose() {
    this._onDidChange.dispose();
  }
}


export async function activate(context: vscode.ExtensionContext) {
  const contextProvider = new ContextDecorationProvider(context);

  let adhocCommandPrefix: string =
    context.globalState.get("chatgpt-adhoc-prompt") || "";

  const logger = Logger.getInstance("ChatGPT Copilot");

  const setRootFolderCommand = vscode.commands.registerCommand('chatgpt.setRootFolder', async (uri: vscode.Uri) => {
    if (uri && uri.fsPath) {
      // Set the project root folder path in the global state
      context.globalState.update('chatgpt.projectRoot', uri.fsPath);
      vscode.window.showInformationMessage(`Set project root to: ${uri.fsPath}`);

      // Trigger decoration updates for the new projectRoot folder and its contents
      contextProvider.updateTreeFileDecoration(vscode.Uri.file(uri.fsPath));
    } else {
      vscode.window.showErrorMessage("No folder selected.");
    }
  });

  const setParentFolderAsRootCommand = vscode.commands.registerCommand('chatgpt.setParentFolderAsRoot', async (uri: vscode.Uri) => {
    if (uri && uri.fsPath) {
      const parentFolder = path.dirname(uri.fsPath);
      context.globalState.update('chatgpt.projectRoot', parentFolder);
      vscode.window.showInformationMessage(`Set parent folder as project root: ${parentFolder}`);

      // Trigger decoration updates for the parent folder and its contents
      contextProvider.updateTreeFileDecoration(vscode.Uri.file(parentFolder));
    } else {
      vscode.window.showErrorMessage("No file selected.");
    }
  });

  context.subscriptions.push(setRootFolderCommand, setParentFolderAsRootCommand);

  const provider = createChatGptViewProvider(context, logger);

  const view = vscode.window.registerWebviewViewProvider(
    "chatgpt-copilot.view",
    provider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    },
  );

  const showTypeHint = vscode.commands.registerCommand('chatgpt-copilot.showTypeHint', async () => {
    provider.showFiles();
  });

  context.subscriptions.push(view, showTypeHint);

  const freeText = vscode.commands.registerCommand(
    "chatgpt-copilot.freeText",
    async () => {
      const value = await vscode.window.showInputBox({
        prompt: "Ask anything...",
      });

      if (value) {
        provider?.sendApiRequest(value, { command: "freeText" });
      }
    },
  );

  const resetThread = vscode.commands.registerCommand(
    "chatgpt-copilot.clearConversation",
    async () => {
      provider?.sendMessage({ type: "clearConversation" });
    },
  );

  const exportConversation = vscode.commands.registerCommand(
    "chatgpt-copilot.exportConversation",
    async () => {
      provider?.sendMessage({ type: "exportConversation" });
    },
  );

  const clearSession = vscode.commands.registerCommand(
    "chatgpt-copilot.clearSession",
    () => {
      context.globalState.update("chatgpt-session-token", null);
      context.globalState.update("chatgpt-clearance-token", null);
      context.globalState.update("chatgpt-user-agent", null);
      context.globalState.update("chatgpt-gpt3-apiKey", null);
      provider?.clearSession();
      provider?.sendMessage({ type: "clearConversation" });
    },
  );

  const configChanged = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("chatgpt.response.showNotification")) {
      provider.configurationManager.subscribeToResponse =
        vscode.workspace
          .getConfiguration("chatgpt")
          .get("response.showNotification") || false;
    }

    if (e.affectsConfiguration("chatgpt.response.autoScroll")) {
      provider.configurationManager.autoScroll = !!vscode.workspace
        .getConfiguration("chatgpt")
        .get("response.autoScroll");
    }

    if (e.affectsConfiguration("chatgpt.gpt3.model")) {
      provider.modelManager.model = vscode.workspace
        .getConfiguration("chatgpt")
        .get("gpt3.model");
    }

    if (e.affectsConfiguration("chatgpt.gpt3.customModel")) {
      if (provider.modelManager.model === "custom") {
        provider.modelManager.model = vscode.workspace
          .getConfiguration("chatgpt")
          .get("gpt3.customModel");
      }
    }

    if (
      e.affectsConfiguration("chatgpt.gpt3.apiBaseUrl") ||
      e.affectsConfiguration("chatgpt.gpt3.model") ||
      e.affectsConfiguration("chatgpt.gpt3.apiKey") ||
      e.affectsConfiguration("chatgpt.gpt3.customModel") ||
      e.affectsConfiguration("chatgpt.gpt3.organization") ||
      e.affectsConfiguration("chatgpt.gpt3.maxTokens") ||
      e.affectsConfiguration("chatgpt.gpt3.temperature") ||
      e.affectsConfiguration("chatgpt.systemPrompt") ||
      e.affectsConfiguration("chatgpt.gpt3.top_p")
    ) {
      provider.prepareConversation(true);
    }

    if (
      e.affectsConfiguration("chatgpt.promptPrefix") ||
      e.affectsConfiguration("chatgpt.gpt3.generateCode-enabled") ||
      e.affectsConfiguration("chatgpt.gpt3.model")
    ) {
      setContext();
    }

    if (e.affectsConfiguration("chatgpt.fileInclusionRegex") || e.affectsConfiguration("chatgpt.fileExclusionRegex")) {
      // TODO: Handle any specific actions needed when these configurations change
    }
  });

  const adhocCommand = vscode.commands.registerCommand(
    "chatgpt-copilot.adhoc",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        return;
      }

      const selection = editor.document.getText(editor.selection);
      let dismissed = false;
      if (selection) {
        await vscode.window
          .showInputBox({
            title: "Add prefix to your ad-hoc command",
            prompt:
              "Prefix your code with your custom prompt. i.e. Explain this",
            ignoreFocusOut: true,
            placeHolder: "Ask anything...",
            value: adhocCommandPrefix,
          })
          .then((value) => {
            if (!value) {
              dismissed = true;
              return;
            }

            adhocCommandPrefix = value.trim() || "";
            context.globalState.update(
              "chatgpt-adhoc-prompt",
              adhocCommandPrefix,
            );
          });

        if (!dismissed && adhocCommandPrefix?.length > 0) {
          provider?.sendApiRequest(adhocCommandPrefix, {
            command: "adhoc",
            code: selection,
          });
        }
      }
    },
  );

  const generateCodeCommand = vscode.commands.registerCommand(
    `chatgpt-copilot.generateCode`,
    () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        return;
      }

      const selection = editor.document.getText(editor.selection);
      if (selection) {
        provider?.sendApiRequest(selection, {
          command: "generateCode",
          language: editor.document.languageId,
        });
      }
    },
  );

  // Skip AdHoc - as it was registered earlier
  const registeredCommands = menuCommands
    .filter((command) => command !== "adhoc" && command !== "generateCode")
    .map((command) =>
      vscode.commands.registerCommand(`chatgpt-copilot.${command}`, () => {
        const prompt = vscode.workspace
          .getConfiguration("chatgpt")
          .get<string>(`promptPrefix.${command}`);
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
          return;
        }

        const selection = editor.document.getText(editor.selection);
        if (selection && prompt) {
          provider?.sendApiRequest(prompt, {
            command,
            code: selection,
            language: editor.document.languageId,
          });
        }
      }),
    );

  context.subscriptions.push(
    view,
    freeText,
    resetThread,
    exportConversation,
    clearSession,
    configChanged,
    adhocCommand,
    generateCodeCommand,
    ...registeredCommands,
  );

  const setContext = () => {
    menuCommands.forEach((command) => {
      if (command === "generateCode") {
        let generateCodeEnabled = !!vscode.workspace
          .getConfiguration("chatgpt")
          .get<boolean>("gpt3.generateCode-enabled");
        const modelName = vscode.workspace
          .getConfiguration("chatgpt")
          .get("gpt3.model") as string;
        generateCodeEnabled =
          generateCodeEnabled &&
          modelName.startsWith("code-");
        vscode.commands.executeCommand(
          "setContext",
          "generateCode-enabled",
          generateCodeEnabled,
        );
      } else {
        const enabled = !!vscode.workspace
          .getConfiguration("chatgpt.promptPrefix")
          .get<boolean>(`${command}-enabled`);
        vscode.commands.executeCommand(
          "setContext",
          `${command}-enabled`,
          enabled,
        );
      }
    });
  };

  setContext();
}

export function deactivate() { }
