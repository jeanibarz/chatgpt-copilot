/**
 * src/config/Configuration.ts
 * 
 * The `configuration.ts` module manages application configuration settings 
 * for the ChatGPT VS Code extension. It provides functionalities to load 
 * default prompts, retrieve configuration values, and handle user input 
 * for sensitive information such as API keys and credentials paths.
 * 
 * Key Features:
 * - Loads a default system prompt from a Markdown file.
 * - Retrieves configuration values with optional defaults and required checks.
 * - Listens for configuration changes and triggers callbacks.
 * - Manages the retrieval of the OpenAI API Key from various sources, 
 *   including workspace settings, global state, and environment variables.
 * - Prompts the user for necessary credentials paths, ensuring that the 
 *   application can authenticate with Google Cloud services.
 * 
 * This module utilizes the `CoreLogger` for logging errors and information,
 * ensuring that issues can be tracked and resolved effectively during 
 * the application's execution.
 */

import { readFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CoreLogger } from "../logging/CoreLogger";

let extensionContext: vscode.ExtensionContext;
const logger = CoreLogger.getInstance();

export let defaultSystemPromptForFreeQuestion: string = '';
export let defaultSystemPromptForGenerateDocstring: string = '';
export let defaultUserPromptForContextSelection: string = '';
export let defaultSystemPromptForContextSelection: string = '';

export function initialize(context: vscode.ExtensionContext) {
    extensionContext = context;
    loadPrompts();
}

function loadPrompts() {
    defaultSystemPromptForFreeQuestion = loadPrompt('freeQuestionDefaultSystemPrompt.md');
    defaultSystemPromptForGenerateDocstring = loadPrompt('generateUpdateDocstringsPrompt.md');
    defaultUserPromptForContextSelection = loadPrompt('contextSelectionExpertDefaultUserPrompt.md');
    defaultSystemPromptForContextSelection = loadPrompt('contextSelectionExpertDefaultSystemPrompt.md');
}

function loadPrompt(filename: string): string {
    const promptPath = extensionContext.asAbsolutePath(path.join('config', 'prompts', filename));
    try {
        logger.info(`Loading prompt from ${promptPath}`);
        return readFileSync(promptPath, 'utf-8');
    } catch (error) {
        logger.logError(error, `Failed to load prompt: ${filename}`, true);
        return '';
    }
}

/**
 * Retrieves a configuration value based on the specified key.
 * If the value is not found, the optional default value is returned.
 * 
 * @param key - The configuration key to look up.
 * @param defaultValue - Optional default value to return if the configuration value is not found.
 * @returns The configuration value of type T or the defaultValue if it is not found.
 */
export function getConfig<T>(key: string, defaultValue?: T): T {
    const configValue = vscode.workspace.getConfiguration("chatgpt").get<T>(key);
    return configValue !== undefined ? configValue : defaultValue as T;
}

/**
 * Retrieves a required configuration value based on the specified key.
 * Throws an error if the value is not found and logs the error.
 * 
 * @param key - The configuration key to look up.
 * @returns The configuration value of type T.
 * @throws An error if the configuration value is not found.
 */
export function getRequiredConfig<T>(key: string): T {
    const value = getConfig<T>(key);
    if (value === undefined) {
        const errorMessage = `Configuration value for "${key}" is required but not found.`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }
    return value;
}

/**
 * Registers a callback to be invoked when the configuration changes.
 * The callback will be triggered if the "chatgpt" configuration is modified.
 * 
 * @param callback - The function to call when the configuration changes.
 */
export function onConfigurationChanged(callback: () => void): void {
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("chatgpt")) {
            logger.info('Configuration for "chatgpt" changed.');
            callback();
        }
    });
}

/**
 * Retrieves the OpenAI API Key for the current workspace configuration.
 * The function checks the workspace settings, global state, and environment variables.
 * Prompts the user if the API Key is not found, offering options to store it in session or open settings.
 * 
 * @returns A Promise that resolves to the API Key or undefined if not found.
 */
export async function getApiKey(): Promise<string | undefined> {
    const state = vscode.extensions.getExtension('chatgpt-copilot')?.exports.globalState; // Adjust as necessary
    const configuration = vscode.workspace.getConfiguration('chatgpt');
    let apiKey = (configuration.get('gpt3.apiKey') as string) || (state?.get('chatgpt-gpt3-apiKey') as string);

    if (!apiKey) {
        const result = await promptForApiKey();
        if (result) {
            apiKey = result;
        } else {
            throw Error(`Can't proceed without a valid API key`);
        }
    }

    return apiKey;
}

async function promptForApiKey(): Promise<string | undefined> {
    const choice = await vscode.window.showErrorMessage(
        'Please add your API Key to use OpenAI official APIs. Storing the API Key in Settings is discouraged due to security reasons.',
        'Store in session (Recommended)',
        'Open settings',
    );

    if (choice === 'Open settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'chatgpt.gpt3.apiKey');
        return undefined;
    } else if (choice === 'Store in session (Recommended)') {
        return await getApiKeyFromUser();
    }

    return undefined;
}

async function getApiKeyFromUser(): Promise<string | undefined> {
    const value = await vscode.window.showInputBox({
        title: 'Store OpenAI API Key in session',
        prompt: 'Please enter your OpenAI API Key to store in your session only. This option won’t persist the token in your settings.json file.',
        ignoreFocusOut: true,
        placeHolder: 'API Key',
    });

    if (value) {
        const state = vscode.extensions.getExtension('chatgpt-copilot')?.exports.globalState; // Adjust as necessary
        state?.update('chatgpt-gpt3-apiKey', value);
        logger.info('API Key stored in session.');
        vscode.window.showInformationMessage('API Key stored in session.');
    }

    return value;
}

/**
 * Retrieves the JSON credentials path for Google Cloud authentication.
 * If the path is not set, prompts the user to enter it.
 * Logs the path if it is set and throws an error if the user does not provide a valid path.
 * 
 * @returns A Promise that resolves to the JSON credentials path.
 * @throws An error if the JSON credentials path is required but not provided.
 */
export async function getJsonCredentialsPath(): Promise<string> {
    const configuration = vscode.workspace.getConfiguration("chatgpt");
    let jsonCredentialsPath = configuration.get<string>("gpt3.jsonCredentialsPath");

    if (!jsonCredentialsPath) {
        jsonCredentialsPath = await promptForJsonCredentialsPath();
        await configuration.update("gpt3.jsonCredentialsPath", jsonCredentialsPath, vscode.ConfigurationTarget.Global);
        logger.info(`JSON credentials path set to: ${jsonCredentialsPath}`);
    }

    return jsonCredentialsPath;
}

async function promptForJsonCredentialsPath(): Promise<string> {
    const input = await vscode.window.showInputBox({
        title: 'Enter Google Cloud JSON Credentials Path',
        prompt: 'Please enter the path to your Google Cloud JSON credentials file.',
        ignoreFocusOut: true,
        placeHolder: 'Path to JSON credentials',
    });

    if (!input) {
        throw new Error("JSON credentials path is required for Vertex AI authentication.");
    }

    return input;
}