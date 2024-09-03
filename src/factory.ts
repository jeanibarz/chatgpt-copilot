// File: src/factory.ts

import * as vscode from "vscode";
import { ChatGptViewProvider } from "./chatgptViewProvider";
import { ChatHistoryManager } from "./chatHistoryManager";
import { CommandHandler } from "./commandHandler";
import { ConfigurationManager } from "./configurationManager";
import { Logger } from "./logger";
import { ModelManager } from "./modelManager";
import { WebviewManager } from "./webviewManager";

export function createChatGptViewProvider(context: vscode.ExtensionContext, logger: Logger) {
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
