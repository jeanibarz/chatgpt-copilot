// src/interfaces/index.ts

import * as vscode from 'vscode';

// Interfaces
export * from './IApiRequestOptions';
export * from './IAssistantResponse';
export * from './IChatGPTMessage';
export * from './IChatModel';
export * from './ICommand';
export * from './IDocstringService';
export * from './IFileDocstring';
export * from './IHandler';
export * from './ILLMModel';
export * from './ILogger';
export * from './IModelNormalizer';
export * from './IRetrievedFileContent';
export * from './ISelectedFile';
export * from './ISinkLogger';
export * from './ITreeCommandsJson';
export * from './ITreeNode';

// Enums
export * from './enums/ChatGPTCommandType';
export * from './enums/ContentInclusionCommandType';
export * from './enums/InclusionState';
export * from './enums/NodeType';
export * from './enums/RenderMethod';

export interface IWebviewManager {
    initializeWebView(webviewView: vscode.WebviewView, extensionUri: vscode.Uri, nonce: string): void;
    sendMessage(message: any): void;
}

export interface ICommandHandler {
    // Define methods that CommandHandler provides
    setProvider(provider: any): void;
    executeCommand(commandType: any, options: any): Promise<void>;
}

export interface IModelManager {
    // Define methods and properties for ModelManager
    model: string;
    modelConfig: any;
}

export interface IConfigurationManager {
    loadConfiguration(): void;
    autoScroll: boolean;
}

export interface IChatHistoryManager {
    // Define methods for ChatHistoryManager
}
