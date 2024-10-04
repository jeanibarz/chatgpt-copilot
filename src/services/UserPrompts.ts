// src/services/UserPrompts.ts

import * as vscode from 'vscode';

export async function promptForApiKey(): Promise<string | undefined> {
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

export async function getApiKeyFromUser(): Promise<string | undefined> {
    const value = await vscode.window.showInputBox({
        title: 'Store OpenAI API Key in session',
        prompt: 'Please enter your OpenAI API Key to store in your session only. This option won’t persist the token in your settings.json file.',
        ignoreFocusOut: true,
        placeHolder: 'API Key',
    });

    return value;
}

export async function promptForJsonCredentialsPath(): Promise<string> {
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