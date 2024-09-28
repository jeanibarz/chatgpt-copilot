/**
 * This module contains a factory function for creating an instance of the `ChatGptViewProvider`.
 * It initializes all necessary dependencies, including the webview manager, model manager,
 * configuration manager, command handler, and chat history manager.
 * 
 * The factory function ensures that the `ChatGptViewProvider` is properly configured
 * before being used, promoting better organization and maintainability within the codebase.
 * 
 * Key Features:
 * - Creates and initializes the `ChatGptViewProvider` with required dependencies.
 * - Sets up the command handler to work in conjunction with the view provider.
 */

import * as vscode from "vscode";
import { ChatHistoryManager } from "../ChatHistoryManager";
import { CommandHandler } from "../controllers/CommandHandler";
import { IChatGptViewProviderOptions, RenderMethod } from "../interfaces";
import { CoreLogger } from "../logging/CoreLogger";
import { ExplicitFilesManager } from "../services";
import { ConfigurationManager } from "../services/ConfigurationManager";
import { ModelManager } from "../services/ModelManager";
import { FilteredTreeDataProvider, TreeRenderer } from "../tree";
import { WebviewManager } from "../view/WebviewManager";
import { ChatGptViewProvider } from "./ChatGptViewProvider";
/**
 * Creates and returns an instance of `ChatGptViewProvider` with all necessary dependencies initialized.
 * 
 * @param context - The extension context provided by VS Code.
 * @param logger - An instance of `CoreLogger` for logging events.
 * @returns An instance of `ChatGptViewProvider` configured with the provided context and logger.
 */
export async function createChatGptViewProvider(context: vscode.ExtensionContext, workspaceRoot: string, logger: CoreLogger): Promise<ChatGptViewProvider> {
    const webviewManager = new WebviewManager();
    const modelManager = new ModelManager();
    const configurationManager = new ConfigurationManager(modelManager);
    const commandHandler = new CommandHandler();
    const chatHistoryManager = new ChatHistoryManager();

    // Instantiate the ExplicitFilesManager
    const explicitFilesManager = new ExplicitFilesManager(context);
    const treeRenderer = new TreeRenderer();
    const treeDataProvider = new FilteredTreeDataProvider(
        workspaceRoot,
        explicitFilesManager,
        treeRenderer,
        context,
    );
    await treeDataProvider.initializeLineCounts();
    logger.info(await treeDataProvider.renderTree(RenderMethod.FullPathDetails));

    vscode.window.registerTreeDataProvider('chatgpt-copilot.project-explorer', treeDataProvider);

    const options: IChatGptViewProviderOptions = {
        context: context,
        workspaceRoot: workspaceRoot,
        logger: logger,
        webviewManager: webviewManager,
        commandHandler: commandHandler,
        modelManager: modelManager,
        treeDataProvider: treeDataProvider,
        treeRenderer: treeRenderer,
        configurationManager: configurationManager,
        chatHistoryManager: chatHistoryManager,
    };

    const provider = new ChatGptViewProvider(options);

    commandHandler.setProvider(provider);
    return provider;
}