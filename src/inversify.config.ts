// src/inversify.config.ts

import { Container, interfaces } from "inversify";
import * as vscode from 'vscode';
import { CommandHandler, ResponseHandler, SessionManager } from "./controllers";
import { ConversationManager } from "./ConversationManager";
import { ErrorHandler } from "./errors/ErrorHandler";
import { IDocstringService } from "./interfaces";
import TYPES from "./inversify.types";
import { CoreLogger } from "./logging/CoreLogger";
import { MermaidDiagramGenerator } from "./MermaidDiagramGenerator";
import { MessageProcessor } from "./MessageProcessor";
import { ChatModelFactory, OpenAIModelFactory } from "./models/llm_models";
import {
    ChatHistoryManager,
    ConfigurationManager,
    ContextManager,
    ContextRetriever,
    DocstringExtractor,
    EventHandler,
    ExplicitFilesManager,
    FileManager,
    ModelManager,
} from "./services"; // Import all required services and managers
import { DocstringService } from "./services/DocstringService";
import { FilteredTreeDataProvider, TreeRenderer } from "./tree";
import { ChatGptViewProvider, WebviewManager, WebviewMessageHandler } from "./view";

// Create the container
const container = new Container();

/**
 * Configures the container with the provided extension context.
 * 
 * @param extensionContext - The VSCode extension context to bind.
 */
export function configureContainer(extensionContext: vscode.ExtensionContext, workspaceRoot: string) {
    // Bind the ExtensionContext early
    container.bind<vscode.ExtensionContext>(TYPES.ExtensionContext).toConstantValue(extensionContext);

    // Bind the workspaceRoot as a constant value
    container.bind<string>(TYPES.WorkspaceRoot).toConstantValue(workspaceRoot);

    // Bind ChatGptViewProvider using dynamic value
    container.bind<ChatGptViewProvider>(TYPES.ChatGptViewProvider).toDynamicValue((context: interfaces.Context) => {
        const workspaceRoot = vscode.workspace.rootPath || '';
        const logger = CoreLogger.getInstance();
        const webviewManager = context.container.get<WebviewManager>(TYPES.WebviewManager);
        const commandHandler = context.container.get<CommandHandler>(TYPES.CommandHandler);
        const modelManager = context.container.get<ModelManager>(TYPES.ModelManager);
        const configurationManager = context.container.get<ConfigurationManager>(TYPES.ConfigurationManager);
        const treeDataProvider = context.container.get<FilteredTreeDataProvider>(TYPES.FilteredTreeDataProvider);
        const treeRenderer = context.container.get<TreeRenderer>(TYPES.TreeRenderer);
        const chatHistoryManager = context.container.get<ChatHistoryManager>(TYPES.ChatHistoryManager);
        const fileManager = context.container.get<FileManager>(TYPES.FileManager);
        const contextManager = context.container.get<ContextManager>(TYPES.ContextManager);
        const messageHandler = context.container.get<WebviewMessageHandler>(TYPES.WebviewMessageHandler);
        const responseHandler = context.container.get<ResponseHandler>(TYPES.ResponseHandler);
        const errorHandler = context.container.get<ErrorHandler>(TYPES.ErrorHandler);
        const mermaidDiagramGenerator = context.container.get<MermaidDiagramGenerator>(TYPES.MermaidDiagramGenerator);
        const sessionManager = context.container.get<SessionManager>(TYPES.SessionManager);
        const conversationManager = context.container.get<ConversationManager>(TYPES.ConversationManager);
        const messageProcessor = context.container.get<MessageProcessor>(TYPES.MessageProcessor);

        return new ChatGptViewProvider(
            webviewManager,
            commandHandler,
            modelManager,
            configurationManager,
            treeDataProvider,
            treeRenderer,
            chatHistoryManager,
            fileManager,
            contextManager,
            messageHandler,
            responseHandler,
            errorHandler,
            mermaidDiagramGenerator,
            extensionContext,
            sessionManager,
            conversationManager,
            messageProcessor
        );
    }).inSingletonScope();
}

// Bindings for services, handlers, and commands
container.bind<ModelManager>(TYPES.ModelManager).to(ModelManager).inSingletonScope();
container.bind<ConfigurationManager>(TYPES.ConfigurationManager).to(ConfigurationManager).inSingletonScope();
container.bind<ChatHistoryManager>(TYPES.ChatHistoryManager).to(ChatHistoryManager).inSingletonScope();
container.bind<CommandHandler>(TYPES.CommandHandler).to(CommandHandler).inSingletonScope();
container.bind<ResponseHandler>(TYPES.ResponseHandler).to(ResponseHandler).inSingletonScope();
container.bind<SessionManager>(TYPES.SessionManager).to(SessionManager).inSingletonScope();
container.bind<ConversationManager>(TYPES.ConversationManager).to(ConversationManager).inSingletonScope();
container.bind<MessageProcessor>(TYPES.MessageProcessor).to(MessageProcessor).inSingletonScope();
container.bind<WebviewManager>(TYPES.WebviewManager).to(WebviewManager).inSingletonScope();
container.bind<TreeRenderer>(TYPES.TreeRenderer).to(TreeRenderer).inSingletonScope();
container.bind<ExplicitFilesManager>(TYPES.ExplicitFilesManager).to(ExplicitFilesManager).inSingletonScope();
container.bind<FilteredTreeDataProvider>(TYPES.FilteredTreeDataProvider).to(FilteredTreeDataProvider).inSingletonScope();

// Bind other services
container.bind<EventHandler>(TYPES.EventHandler).to(EventHandler).inSingletonScope();
container.bind<ContextManager>(TYPES.ContextManager).to(ContextManager).inSingletonScope();
container.bind<ContextRetriever>(TYPES.ContextRetriever).to(ContextRetriever).inSingletonScope();
container.bind<DocstringExtractor>(TYPES.DocstringExtractor).to(DocstringExtractor).inSingletonScope();
container.bind<FileManager>(TYPES.FileManager).to(FileManager).inSingletonScope();
container.bind<WebviewMessageHandler>(TYPES.WebviewMessageHandler).to(WebviewMessageHandler).inSingletonScope();
container.bind<ErrorHandler>(TYPES.ErrorHandler).to(ErrorHandler).inSingletonScope();
container.bind<MermaidDiagramGenerator>(TYPES.MermaidDiagramGenerator).to(MermaidDiagramGenerator).inSingletonScope();
container.bind<IDocstringService>(TYPES.IDocstringService).to(DocstringService).inSingletonScope();

container.bind<ChatModelFactory>(TYPES.ChatModelFactory).to(ChatModelFactory).inSingletonScope();;
container.bind<OpenAIModelFactory>(TYPES.OpenAIModelFactory).to(OpenAIModelFactory).inSingletonScope();

export { container };
