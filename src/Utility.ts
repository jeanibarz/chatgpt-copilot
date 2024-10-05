// src/Utility.ts

/**
 * 
 * This module provides utility functions that are used throughout the application.
 * It includes methods for generating random IDs and creating delays, which can be 
 * useful in various scenarios such as message handling and asynchronous operations.
 * 
 * The `Utility` class contains static methods that can be called without needing 
 * to instantiate the class, making it easy to access common functionalities.
 * 
 * Key Features:
 * - Generates random IDs for unique identifiers.
 * - Provides a delay function for asynchronous operations.
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { container } from "./inversify.config";
import TYPES from "./inversify.types";
import { CoreLogger } from "./logging/CoreLogger";
import { ChatGptViewProvider } from "./view";

const logger = CoreLogger.getInstance();

export class Utility {
    /**
     * Gets a random ID for use in message identifiers or other unique purposes.
     * 
     * @returns A randomly generated string ID.
     */
    public static getRandomId(): string {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Creates a delay for a specified amount of time.
     * 
     * @param ms - The number of milliseconds to delay.
     * @returns A Promise that resolves after the specified delay.
     */
    public static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Constructs a node path based on the parent path and label.
     * 
     * If the label is a symbol, it appends it with '::'; otherwise, it joins 
     * the parent path with the label.
     * 
     * @param parentPath - The parent path to which the label will be appended.
     * @param label - The label to append to the parent path.
     * @returns The constructed node path.
     */
    public static getNodePath(parentPath: string, label: string): string {
        // If the label is a symbol, append with '::'
        if (parentPath.includes('::')) {
            return `${parentPath}::${label}`;
        } else {
            return path.join(parentPath, label);
        }
    }

    /**
     * Parses a node path into its components based on the file system separator.
     * 
     * @param nodePath - The node path to parse.
     * @returns An array of path components.
     */
    public static parseNodePath(nodePath: string): string[] {
        return nodePath.split(path.sep);
    }

    /**
     * Creates a debounced version of a function that delays its execution 
     * until after wait milliseconds have elapsed since the last time it was invoked.
     * This version supports both synchronous and asynchronous functions.
     * 
     * @param func - The function to debounce. Can be synchronous or asynchronous.
     * @param wait - The number of milliseconds to wait before invoking the function.
     * @returns A debounced version of the provided function.
     */
    public static debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
        let timeout: NodeJS.Timeout | null = null;

        return (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
            return new Promise((resolve, reject) => {
                if (timeout) {
                    clearTimeout(timeout);
                }

                timeout = setTimeout(async () => {
                    timeout = null;
                    try {
                        const result = await func(...args);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                }, wait);
            });
        };
    }

    /**
     * Normalizes a file system path by removing trailing slashes (except for root) 
     * and resolving to an absolute path.
     *
     * @param p - The path to normalize.
     * @returns The normalized path.
     */
    public static normalizePath(p: string): string {
        let normalizedPath = path.resolve(p); // Resolves to absolute path and normalizes
        if (normalizedPath !== path.parse(normalizedPath).root) {
            normalizedPath = normalizedPath.replace(new RegExp(`${path.sep}+$`), '');
        }
        return normalizedPath;
    }

    /**
     * Type guard to check if a value is a string.
     * 
     * @param value - The value to check.
     * @returns True if the value is a string, false otherwise.
     */
    public static isString(value: any): value is string {
        return typeof value === 'string';
    }

    /**
     * Retrieves a user-friendly error message from an error object.
     * 
     * @param error - The error object from which to extract the message.
     * @returns A string containing the error message.
     */
    public static getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    /**
     * Helper function to get a description of the symbol kind.
     *
     * @param kind - The vscode.SymbolKind.
     * @returns A string describing the symbol kind, or null if unknown.
     */
    public static getSymbolKindDescription(kind: vscode.SymbolKind): string | null {
        switch (kind) {
            case vscode.SymbolKind.Class:
                return 'Class';
            case vscode.SymbolKind.Method:
                return 'Method';
            case vscode.SymbolKind.Function:
                return 'Function';
            case vscode.SymbolKind.Interface:
                return 'Interface';
            case vscode.SymbolKind.Enum:
                return 'Enum';
            // Add more kinds as needed
            default:
                return null; // Skip unknown symbol kinds
        }
    }

    /**
     * Checks if a given path is a directory.
     * 
     * @param path - The path to check.
     * @returns A promise that resolves to true if the path is a directory, false otherwise.
     */
    public static async isDirectory(path: string): Promise<boolean> {
        try {
            const stat = await vscode.workspace.fs.stat(vscode.Uri.file(path));
            return stat.type === vscode.FileType.Directory;
        } catch (error) {
            return false; // If stat fails, it's not a directory
        }
    }

    /**
     * Displays an error message in the VS Code window.
     * 
     * @param message - The error message to display.
     */
    public static showError(message: string) {
        vscode.window.showErrorMessage(message);
    }

    /**
     * Retrieves the ChatGptViewProvider instance.
     * 
     * @returns A promise that resolves to the ChatGptViewProvider instance.
     * @throws Error if the provider is not found.
     */
    public static async getProvider(): Promise<ChatGptViewProvider> {
        const provider = container.get<ChatGptViewProvider>(TYPES.ChatGptViewProvider);
        if (!provider) {
            throw new Error("Provider not found");
        }
        return provider;
    }

    public static async stopGenerationRequest(): Promise<void> {
        const provider = await this.getProvider();

        try {
            // Abort the ongoing generation if there is an active abort controller
            if (provider.abortController) {
                provider.abortController.abort();
                logger.info("Generation stopped successfully");
            } else {
                logger.warn("No generation process to stop");
            }

            // Update the view state to reflect the stopped generation
            provider.inProgress = false;
            await provider.sendMessage({
                type: "showInProgress",
                inProgress: provider.inProgress
            });

            // Optionally finalize and send a response update to the view
            const responseInMarkdown = !provider.modelManager.isCodexModel;
            await provider.sendMessage({
                type: "addResponse",
                value: provider.response,
                done: true,
                id: provider.currentMessageId,
                autoScroll: provider.configurationManager.autoScroll ?? false,
                responseInMarkdown,
            });

            provider.response = '';  // Reset the response after stopping

        } catch (error) {
            logger.error(`Failed to stop generation: ${(error as Error).message}`);
        }
    }

    public static getExtensionContext(): vscode.ExtensionContext {
        return container.get<vscode.ExtensionContext>(TYPES.ExtensionContext);
    }
}