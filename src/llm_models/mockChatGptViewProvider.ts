import * as vscode from 'vscode';
import { ChatGptViewProvider, ChatGptViewProviderOptions } from '../chatgptViewProvider';
import { ChatHistoryManager } from '../chatHistoryManager';
import { CommandHandler } from '../commandHandler';
import { ConfigurationManager } from '../configurationManager';
import { CoreLogger } from '../coreLogger';
import { ModelManager } from '../modelManager';
import { WebviewManager } from '../webviewManager';

export function createMockChatGptViewProvider(overrides: Partial<ChatGptViewProviderOptions> = {}): ChatGptViewProvider {
    const defaultOptions: ChatGptViewProviderOptions = {
        context: {
            subscriptions: [],
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn().mockReturnValue([]),
            },
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn().mockReturnValue([]),
                setKeysForSync: jest.fn(),
            },
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
                delete: jest.fn(),
                onDidChange: jest.fn(),
            },
            extensionUri: vscode.Uri.file('/mock/path'),
            extensionPath: '/mock/extensionPath',
            environmentVariableCollection: new vscode.EnvironmentVariableCollection(),
            asAbsolutePath: jest.fn((relativePath: string) => `/mock/absolute/${relativePath}`),
            storageUri: vscode.Uri.file('/mock/storage'),
            storagePath: '/mock/storagePath',
            globalStorageUri: vscode.Uri.file('/mock/globalStorage'),
            globalStoragePath: '/mock/globalStoragePath',
            logUri: vscode.Uri.file('/mock/log'),
            logPath: '/mock/logPath',
            extensionMode: vscode.ExtensionMode.Development,
            extension: {
                id: 'mock.extension.id',
                extensionPath: '/mock/extensionPath',
                packageJSON: {},
                extensionUri: vscode.Uri.file('/mock/extensionUri'),
                extensionKind: vscode.ExtensionKind.UI,
                isActive: true,
                exports: {},
                activate: jest.fn(),
            },
            languageModelAccessInformation: {
                onDidChange: jest.fn(),
                canSendRequest: jest.fn().mockReturnValue(true),
            }, // Add necessary properties as needed
        },
        logger: CoreLogger.getInstance("TestLogger"), // Use the singleton instance
        webviewManager: new WebviewManager(CoreLogger.getInstance({ loggerName: "TestLogger" })),
        commandHandler: new CommandHandler(CoreLogger.getInstance({ loggerName: "TestLogger" }), null), // Temporarily pass null for provider
        modelManager: new ModelManager(),
        configurationManager: new ConfigurationManager(CoreLogger.getInstance({ loggerName: "TestLogger" }), new ModelManager()),
        chatHistoryManager: new ChatHistoryManager(),
    };

    return new ChatGptViewProvider({ ...defaultOptions, ...overrides });
}
