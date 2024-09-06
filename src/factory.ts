// File: src/factory.ts

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
import { ChatGptViewProvider } from "./chatgptViewProvider";
import { ChatHistoryManager } from "./chatHistoryManager";
import { CommandHandler } from "./commandHandler";
import { ConfigurationManager } from "./configurationManager";
import { CoreLogger } from "./coreLogger";
import { ModelManager } from "./modelManager";
import { WebviewManager } from "./webviewManager";

/**
 * Creates and returns an instance of `ChatGptViewProvider` with all necessary dependencies initialized.
 * 
 * @param context - The extension context provided by VS Code.
 * @param logger - An instance of `CoreLogger` for logging events.
 * @returns An instance of `ChatGptViewProvider` configured with the provided context and logger.
 */
export function createChatGptViewProvider(context: vscode.ExtensionContext, logger: CoreLogger) {
    const webviewManager = new WebviewManager(logger);
    const modelManager = new ModelManager();
    const configurationManager = new ConfigurationManager(logger, modelManager);
    const commandHandler = new CommandHandler(logger, null); // Temporarily pass null for provider

    const provider = new ChatGptViewProvider({
        context,
        logger,
        webviewManager,
        commandHandler,
        modelManager,
        configurationManager,
        chatHistoryManager: new ChatHistoryManager(),
    });

    // Now we can set the provider in the command handler
    commandHandler.setProvider(provider); // Method to set the provider in CommandHandler

    return provider;
}
