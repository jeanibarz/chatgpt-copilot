import * as vscode from 'vscode';
import { getJsonCredentialsPath, } from "../services/CredentialsManager";
import { StateManager } from "../state/StateManager";

// Mock the Logger class
jest.mock('../coreLogger', () => {
    return {
        CoreLogger: {
            getInstance: jest.fn(() => ({
                info: jest.fn(),
                error: jest.fn(),
                log: jest.fn(),
                logToOutputChannel: jest.fn(),
                outputChannel: {
                    appendLine: jest.fn(), // Mock the appendLine method
                },
            })),
        },
    };
});

// Mock the vscode.window.showInputBox method
jest.mock('vscode', () => ({
    window: {
        showInputBox: jest.fn(),
        createOutputChannel: jest.fn(),
    },
    workspace: {
        getConfiguration: jest.fn().mockReturnValue({
            get: jest.fn().mockReturnValue(undefined),
            update: jest.fn(),
        }),
    },
    ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3,
    }
}));

// Tests for getConfig and getRequiredConfig
describe('getConfig', () => {
    const stateManager = StateManager.getInstance();

    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    it('should return default value if config value is undefined', () => {
        const result = stateManager.getConfig<string>('testKey', 'defaultValue');
        expect(result).toBe('defaultValue');
    });

    it('should return the config value if it is defined', () => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValueOnce({
            get: jest.fn().mockReturnValue('someValue'),
        });

        const result = stateManager.getConfig<string>('testKey');
        expect(result).toBe('someValue');
    });

    it('should return typed value from configuration', () => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue(42), // Mock for numeric type
        });

        const result = stateManager.getConfig<number>('testKey');
        expect(result).toBe(42);
    });

    it('should handle when no default value is provided and config is undefined', () => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue(undefined),
        });

        expect(() => stateManager.getConfig<string>('nonExistentKey')).not.toThrow();
    });

    it('should throw an error when required config value is not present', () => {
        expect(() => stateManager.getRequiredConfig<any>('nonExistentKey')).toThrowError();
    });
});

describe('getJsonCredentialsPath', () => {
    it('should return the path from configuration if set', async () => {
        // Mock the configuration to return a predefined path
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue('/path/to/credentials.json'),
            update: jest.fn(),
        });

        const result = await getJsonCredentialsPath();
        expect(result).toBe('/path/to/credentials.json');
    });

    it('should prompt the user for the path if not set in configuration', async () => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue(undefined),
            update: jest.fn(),
        });

        // Mock the input box to return a valid path
        (vscode.window.showInputBox as jest.Mock).mockResolvedValue('/user/input/path.json');

        const result = await getJsonCredentialsPath();
        expect(result).toBe('/user/input/path.json');
    });

    it('should throw an error if the user cancels the input', async () => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue(undefined),
            update: jest.fn(),
        });

        // Mock the input box to return undefined (user cancels)
        (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

        await expect(getJsonCredentialsPath()).rejects.toThrow("JSON credentials path is required for Vertex AI authentication.");
    });
});
