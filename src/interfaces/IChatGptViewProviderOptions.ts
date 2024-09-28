import * as vscode from 'vscode';
import { CommandHandler } from "../controllers/CommandHandler";
import { CoreLogger } from "../logging/CoreLogger";
import { ChatHistoryManager, ConfigurationManager, ModelManager } from "../services";
import { TreeRenderer } from "../tree";
import { FilteredTreeDataProvider } from "../tree/FilteredTreeDataProvider";
import { WebviewManager } from "../view";

/**
 * Interface defining the options required to create a ChatGptViewProvider.
 */
export interface IChatGptViewProviderOptions {
  context: vscode.ExtensionContext;
  workspaceRoot: string,
  logger: CoreLogger;
  webviewManager: WebviewManager;
  commandHandler: CommandHandler;
  modelManager: ModelManager;
  treeDataProvider: FilteredTreeDataProvider;
  treeRenderer: TreeRenderer;
  configurationManager: ConfigurationManager;
  chatHistoryManager: ChatHistoryManager;
}