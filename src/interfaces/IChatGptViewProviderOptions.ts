import * as vscode from 'vscode';
import { CommandHandler } from "../controllers/CommandHandler";
import { CoreLogger } from "../logging/CoreLogger";
import { ChatHistoryManager, ConfigurationManager, ModelManager } from "../services";
import { MyTreeDataProvider } from "../tree";
import { WebviewManager } from "../view";

/**
 * Interface defining the options required to create a ChatGptViewProvider.
 */
export interface IChatGptViewProviderOptions {
  context: vscode.ExtensionContext;
  logger: CoreLogger;
  webviewManager: WebviewManager;
  commandHandler: CommandHandler;
  modelManager: ModelManager;
  configurationManager: ConfigurationManager;
  chatHistoryManager: ChatHistoryManager;
  myTreeDataProvider: MyTreeDataProvider;
}