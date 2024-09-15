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
import { CoreLogger } from "../CoreLogger";
import { ConfigurationManager } from "../services/ConfigurationManager";
import { ModelManager } from "../services/ModelManager";
import { WebviewManager } from "../view/WebviewManager";
import { ChatGptViewProvider } from "./ChatGptViewProvider";

/**
 * Creates and returns an instance of `ChatGptViewProvider` with all necessary dependencies initialized.
 * 
 * @param context - The extension context provided by VS Code.
 * @param logger - An instance of `CoreLogger` for logging events.
 * @returns An instance of `ChatGptViewProvider` configured with the provided context and logger.
 */
export function createChatGptViewProvider(context: vscode.ExtensionContext, logger: CoreLogger): ChatGptViewProvider {
    const webviewManager = new WebviewManager(logger);
    const modelManager = new ModelManager();
    const configurationManager = new ConfigurationManager(logger, modelManager);
    const commandHandler = new CommandHandler();

    const provider = new ChatGptViewProvider({
        context,
        logger,
        webviewManager,
        commandHandler,
        modelManager,
        configurationManager,
        chatHistoryManager: new ChatHistoryManager(),
    });

    commandHandler.setProvider(provider);
    return provider;
}