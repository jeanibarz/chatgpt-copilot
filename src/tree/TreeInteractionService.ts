// src/TreeInteractionService.ts

/**
 * 
 * This module provides a service for interacting with tree data structures 
 * within a VS Code extension. It facilitates the processing of commands 
 * related to expanding and folding nodes in a tree view.
 * 
 * The `TreeInteractionService` class is responsible for managing user 
 * interactions with the tree data provider, allowing for dynamic updates 
 * to the tree structure based on user commands.
 * 
 * Key Features:
 * - Processes commands to expand or fold specific nodes in the tree.
 * - Validates command input to ensure correct formatting.
 * - Refreshes the tree data provider after processing commands.
 */

import { inject, injectable } from "inversify";
import { ContentInclusionCommandType, InclusionState, ITreeCommandsJson, ITreeNode } from '../interfaces';
import TYPES from "../inversify.types";
import { CoreLogger } from '../logging/CoreLogger';
import { FileManager } from '../services/FileManager';
import { FilteredTreeDataProvider } from "./FilteredTreeDataProvider";

/**
 * The `TreeInteractionService` class manages interactions with the tree 
 * data provider, allowing for the expansion and folding of tree nodes 
 * based on user commands.
 * 
 * Key Features:
 * - Processes commands to expand or fold specific nodes in the tree.
 * - Validates command input to ensure correct formatting.
 * - Refreshes the tree data provider after processing commands.
 */
@injectable()
export class TreeInteractionService {
    private fileManager: FileManager;
    private logger: CoreLogger;

    /**
     * Constructor for the `TreeInteractionService` class.
     * Initializes a new instance of the TreeInteractionService with 
     * the provided tree data provider and logger.
     * 
     * @param treeDataProvider - An instance of `FilteredTreeDataProvider` for managing tree data.
     * @param logger - An instance of `ChatGptViewProvider['logger']` for logging events.
     */
    constructor(
        @inject(TYPES.FilteredTreeDataProvider) private treeDataProvider: FilteredTreeDataProvider,
        @inject(TYPES.CoreLogger) logger: CoreLogger,
        @inject(TYPES.FileManager) fileManager: FileManager) {
        this.logger = logger;
        this.fileManager = fileManager;
    }

    /**
     * Processes inclusion or exclusion commands for tree nodes.
     * Validates the commands and refreshes the tree data provider 
     * after processing.
     * 
     * @param commands - An array of commands to process, each containing 
     *                  the command type, file or folder path, and optional symbol path.
     * @returns A promise that resolves when the commands have been processed.
     */
    async processInclusionOrExclusionCommands(commands: Array<[ContentInclusionCommandType, string, string | null]>): Promise<void> {
        try {
            // Input validation
            if (!Array.isArray(commands)) {
                throw new Error('Invalid commands format. Expected an array of commands.');
            }

            for (const command of commands) {
                await this.processSingleInclusionOrExclusionCommand(command);
            }

            // // Refresh the tree to reflect inclusion/exclusion changes
            // await this.treeDataProvider.refresh();
        } catch (error) {
            this.logger.error(`Error in processInclusionOrExclusionCommands: ${error instanceof Error ? error.message : String(error)}`, { error });
        }
    }

    /**
     * Processes a single inclusion or exclusion command.
     * Validates the command structure and executes the appropriate 
     * inclusion or exclusion logic.
     * 
     * @param command - A tuple containing the command type, file or folder path, 
     *                  and optional symbol path.
     * @returns A promise that resolves when the command has been processed.
     */
    private async processSingleInclusionOrExclusionCommand(command: [ContentInclusionCommandType, string, string | null]): Promise<void> {
        try {
            // Validate command structure
            if (!Array.isArray(command) || command.length < 2) {
                throw new Error('Invalid command format. Expected [CommandType, string, string | null].');
            }

            const [action, fileOrFolderPath, symbolPath] = command;

            // Validate action
            if (!Object.values(ContentInclusionCommandType).includes(action)) {
                throw new Error(`Invalid CommandType: ${action}`);
            }

            // Validate fileOrFolderPath
            if (typeof fileOrFolderPath !== 'string' || fileOrFolderPath.trim() === '') {
                throw new Error('Invalid file or folder path in command.');
            }

            const resolvedPath = this.resolvePath(fileOrFolderPath);

            if (symbolPath) {
                // Validate symbolPath
                if (typeof symbolPath !== 'string' || symbolPath.trim() === '') {
                    throw new Error('Invalid symbol path in command.');
                }
                await this.processSymbolInclusionOrExclusion(action, resolvedPath, symbolPath);
            } else {
                await this.processFileOrFolderInclusionOrExclusion(action, resolvedPath);
            }
        } catch (error) {
            this.logger.error(`Error processing single inclusion/exclusion command: ${error instanceof Error ? error.message : String(error)}`, { error, command });
        }
    }

    /**
     * Resolves the path of a file or folder.
     * Utilizes the file manager to resolve the provided path.
     * 
     * @param fileOrFolderPath - The path of the file or folder to resolve.
     * @returns The resolved path as a string.
     */
    private resolvePath(fileOrFolderPath: string): string {
        try {
            return this.fileManager.resolvePath(fileOrFolderPath);
        } catch (error) {
            this.logger.error(`Error resolving path "${fileOrFolderPath}": ${error instanceof Error ? error.message : String(error)}`, { error });
            throw error;
        }
    }

    /**
     * Processes inclusion or exclusion of a file or folder based on the command type.
     * Updates the inclusion state of the node in the tree data provider.
     * 
     * @param action - The command type indicating whether to include or exclude.
     * @param path - The path of the file or folder to process.
     * @returns A promise that resolves when the inclusion/exclusion has been processed.
     */
    private async processFileOrFolderInclusionOrExclusion(action: ContentInclusionCommandType, path: string): Promise<void> {
        try {
            const node = this.treeDataProvider.findNodeByPath(path, true);

            if (node) {
                const newInclusionState = this.getInclusionStateFromAction(action);
                this.treeDataProvider.updateNodeInclusionState(node, newInclusionState);
            } else {
                this.logger.warn(`File or folder not found: ${path}`);
            }
        } catch (error) {
            this.logger.error(`Error processing file or folder inclusion/exclusion: ${error instanceof Error ? error.message : String(error)}`, { error, action, path });
        }
    }

    /**
     * Determines the inclusion state based on the command action.
     * 
     * @param action - The command type to evaluate.
     * @returns The corresponding inclusion state.
     */
    private getInclusionStateFromAction(action: ContentInclusionCommandType): InclusionState {
        if (action === ContentInclusionCommandType.Add) {
            return InclusionState.Included;
        } else if (action === ContentInclusionCommandType.Remove) {
            return InclusionState.NotIncluded;
        } else {
            this.logger.warn(`Unknown CommandType: ${action}`);
            return InclusionState.NotIncluded;
        }
    }

    /**
     * Processes inclusion or exclusion of a symbol within a file.
     * Updates the inclusion state of the symbol node in the tree data provider.
     * 
     * @param action - The command type indicating whether to include or exclude.
     * @param filePath - The path of the file containing the symbol.
     * @param symbolPath - The path of the symbol to process.
     * @returns A promise that resolves when the symbol inclusion/exclusion has been processed.
     */
    private async processSymbolInclusionOrExclusion(action: ContentInclusionCommandType, filePath: string, symbolPath: string): Promise<void> {
        try {
            const fileNode = this.treeDataProvider.findNodeByPath(filePath,);

            if (fileNode && fileNode.children) {
                const symbolNode = this.findSymbolNode(fileNode, symbolPath);
                if (symbolNode) {
                    const newInclusionState = this.getInclusionStateFromAction(action);
                    this.treeDataProvider.updateNodeInclusionState(symbolNode, newInclusionState);
                } else {
                    this.logger.warn(`Symbol not found: ${symbolPath} in file ${filePath}`);
                }
            } else {
                this.logger.warn(`File not found for symbol inclusion: ${filePath}`);
            }
        } catch (error) {
            this.logger.error(`Error processing symbol inclusion/exclusion: ${error instanceof Error ? error.message : String(error)}`, { error, action, filePath, symbolPath });
        }
    }

    /**
     * Finds a symbol node within a file node based on the symbol path.
     * 
     * @param fileNode - The file node to search within.
     * @param symbolPath - The path of the symbol to find.
     * @returns The found symbol node or undefined if not found.
     */
    private findSymbolNode(fileNode: ITreeNode, symbolPath: string): ITreeNode | undefined {
        try {
            if (!fileNode.children || fileNode.children.length === 0) {
                return undefined;
            }

            return fileNode.children.find(child => {
                // Split the child.path to remove everything before "::"
                const [_, childSymbolPart] = child.path.split("::", 2);
                // Compare only the part after "::" with the symbolPath
                return childSymbolPart === symbolPath;
            });
        } catch (error) {
            this.logger.error(`Error finding symbol node: ${error instanceof Error ? error.message : String(error)}`, { error, fileNode, symbolPath });
            return undefined;
        }
    }

    /**
     * Processes a set of commands defined in the provided JSON object.
     * Validates the commands and invokes the appropriate processing methods.
     * 
     * @param commandsJson - An object containing arrays of commands to expand or fold.
     * @returns A promise that resolves when the commands have been processed.
     */
    async processCommands(commandsJson: ITreeCommandsJson): Promise<void> {
        this.logger.debug('Starting processCommands with input:', { commandsJson });

        try {
            // Validate the commandsJson parameter
            this.validateCommandsJson(commandsJson);

            const { expand, fold } = commandsJson;

            // Process 'expand' commands
            if (expand && Array.isArray(expand)) {
                this.logger.debug(`Processing ${expand.length} expand commands.`);
                await this.processCommandList(expand, 'expand');
            }

            // Process 'fold' commands
            if (fold && Array.isArray(fold)) {
                this.logger.debug(`Processing ${fold.length} fold commands.`);
                await this.processCommandList(fold, 'fold');
            }

            // Refresh the tree to reflect changes
            // this.refreshTreeDataProvider();

            this.logger.debug('Completed processCommands.');
        } catch (error) {
            this.logger.error(`Error in processCommands: ${error instanceof Error ? error.message : String(error)}`, { error });
        }
    }

    /**
     * Validates the commands JSON structure.
     * Ensures that it contains the required expand and fold arrays.
     * 
     * @param commandsJson - The JSON object to validate.
     * @throws Will throw an error if the JSON structure is invalid.
     */
    private validateCommandsJson(commandsJson: ITreeCommandsJson): void {
        if (!commandsJson || typeof commandsJson !== 'object') {
            const errorMsg = 'Invalid JSON command format. Expected an object.';
            this.logger.error(errorMsg, { commandsJson });
            throw new Error(errorMsg);
        }

        const { expand, fold } = commandsJson;

        if ((!expand || !Array.isArray(expand)) && (!fold || !Array.isArray(fold))) {
            const errorMsg = 'JSON must contain "expand" and/or "fold" arrays.';
            this.logger.error(errorMsg, { expand, fold });
            throw new Error(errorMsg);
        }
    }

    /**
     * Processes a list of commands for expanding or folding nodes.
     * 
     * @param paths - An array of paths to process.
     * @param action - The action to perform, either 'expand' or 'fold'.
     * @returns A promise that resolves when all commands have been processed.
     */
    private async processCommandList(paths: string[], action: 'expand' | 'fold'): Promise<void> {
        try {
            if (!Array.isArray(paths)) {
                this.logger.warn(`Expected an array of paths for action "${action}", but received: ${typeof paths}`);
                return;
            }

            for (const path of paths) {
                await this.processSingleCommand(path, action);
            }
        } catch (error) {
            this.logger.error(`Error processing command list for action "${action}": ${error instanceof Error ? error.message : String(error)}`, { error, paths, action });
        }
    }

    /**
     * Processes a single command for expanding or folding a node.
     * 
     * @param path - The path of the node to process.
     * @param action - The action to perform, either 'expand' or 'fold'.
     * @returns A promise that resolves when the command has been processed.
     */
    private async processSingleCommand(path: string, action: 'expand' | 'fold'): Promise<void> {
        try {
            // Validate the path
            if (typeof path !== 'string' || path.trim() === '') {
                this.logger.warn(`${action.charAt(0).toUpperCase() + action.slice(1)}: Invalid path "${path}". Skipping.`);
                return;
            }

            this.logger.debug(`${action.charAt(0).toUpperCase() + action.slice(1)}: Attempting to find node for path "${path}".`);
            const node = this.treeDataProvider.findNodeByPath(path);
            if (node) {
                this.logger.debug(`${action.charAt(0).toUpperCase() + action.slice(1)}: Found node for path "${path}". Processing.`);
                if (action === 'expand') {
                    await this.expandNode(node);
                } else {
                    await this.foldNode(node);
                }
                this.logger.info(`${action.charAt(0).toUpperCase() + action.slice(1)}: Successfully processed node at path "${path}".`);
            } else {
                this.logger.warn(`${action.charAt(0).toUpperCase() + action.slice(1)}: Node not found for path "${path}".`);
            }
        } catch (error: unknown) {
            this.logger.error(`${action.charAt(0).toUpperCase() + action.slice(1)}: Failed to process node at path "${path}": ${error instanceof Error ? error.message : String(error)}`, { error, path });
        }
    }

    /**
     * Refreshes the tree data provider after processing commands.
     * Logs the outcome of the refresh operation.
     * 
     * @returns A promise that resolves when the refresh has completed.
     */
    private refreshTreeDataProvider(): void {
        try {
            this.logger.debug('Refreshing the tree data provider after processing commands.');
            this.treeDataProvider.refresh();
            this.logger.info('Tree data provider refreshed successfully.');
        } catch (error: unknown) {
            this.logger.error(`Failed to refresh the tree data provider: ${error instanceof Error ? error.message : String(error)}`, { error });
            throw new Error(`Failed to refresh the tree data provider: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Expands a node in the tree view.
     *
     * @param node - The node to expand.
     * @returns A promise that resolves when the node has been expanded.
     */
    private async expandNode(node: ITreeNode): Promise<void> {
        try {
            // Ensure the node is collapsible
            if (node.collapsibleState === undefined || node.collapsibleState === null) {
                node.collapsibleState = 1; // vscode.TreeItemCollapsibleState.Collapsed
            }
            node.collapsibleState = 2; // vscode.TreeItemCollapsibleState.Expanded
            this.treeDataProvider.refreshNode(node);
        } catch (error) {
            this.logger.error(`Error expanding node: ${error instanceof Error ? error.message : String(error)}`, { error, node });
        }
    }

    /**
     * Folds a node in the tree view.
     *
     * @param node - The node to fold.
     * @returns A promise that resolves when the node has been folded.
     */
    private async foldNode(node: ITreeNode): Promise<void> {
        try {
            // Ensure the node is collapsible
            if (node.collapsibleState === undefined || node.collapsibleState === null) {
                node.collapsibleState = 2; // vscode.TreeItemCollapsibleState.Expanded
            }
            node.collapsibleState = 1; // vscode.TreeItemCollapsibleState.Collapsed
            this.treeDataProvider.refreshNode(node);
        } catch (error) {
            this.logger.error(`Error folding node: ${error instanceof Error ? error.message : String(error)}`, { error, node });
        }
    }
}
