// src/view/ChatGptViewProviderFactory.ts

/**
 * 
 * 
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

import { Container } from "inversify";
import * as vscode from "vscode";
import { ChatHistoryManager } from "../ChatHistoryManager";
import { CommandHandler, ResponseHandler, SessionManager } from "../controllers";
import { ConversationManager } from "../ConversationManager";
import { DocstringGenerator } from "../DocstringGenerator";
import { ErrorHandler } from "../errors/ErrorHandler";
import { AddChatHistoryMessageHandler } from '../handlers/AddChatHistoryMessageHandler';
import { ConfigurationChangedHandler } from "../handlers/ConfigurationChangedHandler";
import { CreateChatModelHandler } from "../handlers/CreateChatModelHandler";
import { ExecuteCommandHandler } from "../handlers/ExecuteCommandHandler";
import { HandleApiErrorHandler } from '../handlers/HandleApiErrorHandler';
import { SendApiRequestHandler } from '../handlers/SendApiRequestHandler';
import { SendMessageHandler } from '../handlers/SendMessageHandler';
import { ShowSideBySideComparisonHandler } from "../handlers/ShowSideBySideComparisonHandler";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { MermaidDiagramGenerator } from "../MermaidDiagramGenerator";
import { ConfigurationManager, ContextManager, ContextRetriever, DocstringExtractor, EventHandler, ExplicitFilesManager, FileManager, ModelManager } from "../services";
import { MediatorService } from "../services/MediatorService";
import { FilteredTreeDataProvider, TreeRenderer } from "../tree";
import { WebviewManager } from "../view/WebviewManager";
import { ChatGptViewProvider } from "./ChatGptViewProvider";
import { WebviewMessageHandler } from "./WebviewMessageHandler";

/**
 * Creates and returns an instance of `ChatGptViewProvider` with all necessary dependencies initialized.
 * 
 * @param context - The extension context provided by VS Code.
 * @param workspaceRoot - The root directory of the workspace.
 * @param logger - An instance of `CoreLogger` for logging events.
 * @returns An instance of `ChatGptViewProvider` configured with the provided context and logger.
 */
export async function createChatGptViewProvider(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    logger: CoreLogger,
): Promise<ChatGptViewProvider> {
    // Create an Injectify container
    const container = new Container();

    // Bind ExtensionContext
    container.bind<vscode.ExtensionContext>(TYPES.ExtensionContext).toConstantValue(context);

    // // Bind singletons
    // container.bind<ModelManager>(TYPES.ModelManager).toDynamicValue((context) => {
    //     const configManager = context.container.get<ConfigurationManager>(TYPES.ConfigurationManager);
    //     const modelManager = new ModelManager();
    //     modelManager.initialize(configManager); // Assuming some initialization logic
    //     return modelManager;
    // }).inSingletonScope();

    container.bind<CoreLogger>(TYPES.CoreLogger).toConstantValue(logger);
    container.bind<WebviewManager>(TYPES.WebviewManager).to(WebviewManager).inSingletonScope();
    container.bind<CommandHandler>(TYPES.CommandHandler).to(CommandHandler).inSingletonScope();
    container.bind<ModelManager>(TYPES.ModelManager).to(ModelManager).inSingletonScope();
    container.bind<ConfigurationManager>(TYPES.ConfigurationManager).to(ConfigurationManager).inSingletonScope();
    container.bind<ChatHistoryManager>(TYPES.ChatHistoryManager).to(ChatHistoryManager).inSingletonScope();
    container.bind<TreeRenderer>(TYPES.TreeRenderer).to(TreeRenderer).inSingletonScope();
    container.bind<ExplicitFilesManager>(TYPES.ExplicitFilesManager).to(ExplicitFilesManager).inSingletonScope();

    // Bind other services
    container.bind<EventHandler>(TYPES.EventHandler).to(EventHandler).inSingletonScope();
    container.bind<ContextManager>(TYPES.ContextManager).to(ContextManager).inSingletonScope();
    container.bind<ContextRetriever>(TYPES.ContextRetriever).to(ContextRetriever).inSingletonScope();
    container.bind<DocstringExtractor>(TYPES.DocstringExtractor).to(DocstringExtractor).inSingletonScope();
    container.bind<FileManager>(TYPES.FileManager).to(FileManager).inSingletonScope();
    container.bind<WebviewMessageHandler>(TYPES.WebviewMessageHandler).to(WebviewMessageHandler).inSingletonScope();
    container.bind<ResponseHandler>(TYPES.ResponseHandler).to(ResponseHandler).inSingletonScope();
    container.bind<ErrorHandler>(TYPES.ErrorHandler).to(ErrorHandler).inSingletonScope();
    container.bind<DocstringGenerator>(TYPES.DocstringGenerator).to(DocstringGenerator).inSingletonScope();
    container.bind<MermaidDiagramGenerator>(TYPES.MermaidDiagramGenerator).to(MermaidDiagramGenerator).inSingletonScope();

    // Bind Handlers
    container.bind<SendMessageHandler>(SendMessageHandler).to(SendMessageHandler);
    container.bind<AddChatHistoryMessageHandler>(AddChatHistoryMessageHandler).to(AddChatHistoryMessageHandler);
    container.bind<SendApiRequestHandler>(SendApiRequestHandler).to(SendApiRequestHandler);
    container.bind<HandleApiErrorHandler>(HandleApiErrorHandler).to(HandleApiErrorHandler);
    container.bind<ShowSideBySideComparisonHandler>(ShowSideBySideComparisonHandler).to(ShowSideBySideComparisonHandler);
    container.bind<ExecuteCommandHandler>(ExecuteCommandHandler).to(ExecuteCommandHandler);
    container.bind<ConfigurationChangedHandler>(ConfigurationChangedHandler).to(ConfigurationChangedHandler);
    container.bind<CreateChatModelHandler>(CreateChatModelHandler).to(CreateChatModelHandler);


    // Bind FilteredTreeDataProvider with dynamic value
    container.bind<FilteredTreeDataProvider>(TYPES.FilteredTreeDataProvider).toDynamicValue((ctx: interfaces.Context) => {
        const explicitFilesManager = ctx.container.get<ExplicitFilesManager>(TYPES.ExplicitFilesManager);
        const treeRenderer = ctx.container.get<TreeRenderer>(TYPES.TreeRenderer);
        const extensionContext = ctx.container.get<vscode.ExtensionContext>(TYPES.ExtensionContext);
        return new FilteredTreeDataProvider(workspaceRoot, explicitFilesManager, treeRenderer, extensionContext);
    }).inSingletonScope();

    // Bind ChatGptViewProvider
    container.bind<ChatGptViewProvider>(TYPES.ChatGptViewProvider).to(ChatGptViewProvider).inSingletonScope();

    // Bind any remaining dependencies required by ChatGptViewProvider
    container.bind<SessionManager>(TYPES.SessionManager).to(SessionManager).inSingletonScope();
    container.bind<ConversationManager>(TYPES.ConversationManager).to(ConversationManager).inSingletonScope();

    // --- Add Mediator Binding ---
    container.bind<MediatorService>(TYPES.MediatorService).to(MediatorService).inSingletonScope();

    // Resolve ChatGptViewProvider
    logger.info("Resolving ChatGptViewProvider");
    const provider = container.get<ChatGptViewProvider>(TYPES.ChatGptViewProvider);
    logger.info("ChatGptViewProvider resolved");

    // Register Tree Data Provider
    vscode.window.registerTreeDataProvider('chatgpt-copilot.project-explorer', provider.treeDataProvider);
    logger.info("Tree Data Provider registered");

    // Set provider in CommandHandler or other managers if needed
    provider.commandHandler.setProvider(provider);
    logger.info("CommandHandler set with provider");

    return provider;
}