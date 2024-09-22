/**
 * src/TreeDataProvider.ts
 * 
 * This module provides a tree data provider for the VS Code extension, 
 * managing files and symbols in a hierarchical structure. It allows for 
 * the representation of files and folders in a tree format, enabling 
 * users to navigate their workspace effectively.
 * 
 * The MyTreeDataProvider class implements the vscode.TreeDataProvider 
 * interface, providing methods to refresh the tree, retrieve children 
 * nodes, and render the tree in various formats. It also handles 
 * inclusion states for files and folders based on user-defined settings.
 */

import * as path from 'path';
import * as vscode from 'vscode';

import {
    InclusionState,
    ITreeNode, NodeType, RenderMethod
} from '../interfaces';
import { CoreLogger } from '../logging/CoreLogger';
import { EventHandler } from "../services/EventHandler";
import { ExplicitFilesManager } from '../services/ExplicitFilesManager';
import { Utility } from '../Utility';
import { NodeManager } from "./NodeManager";
import { SymbolService } from './SymbolService';
import { TreeBuilder } from "./TreeBuilder";
import { TreeNodeFactory } from './TreeNodeFactory';
import { TreeRenderer } from './TreeRenderer';

/**
 * The MyTreeDataProvider class provides tree data for the VS Code extension, 
 * managing files and symbols in a hierarchical structure.
 */
export class MyTreeDataProvider implements vscode.TreeDataProvider<ITreeNode> {
    private logger = CoreLogger.getInstance();
    private _onDidChangeTreeData: vscode.EventEmitter<
        ITreeNode | undefined | null
    > = new vscode.EventEmitter<ITreeNode | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<
        ITreeNode | undefined | null
    > = this._onDidChangeTreeData.event;

    private nodeManager: NodeManager;
    private treeBuilder: TreeBuilder;
    private eventHandler: EventHandler;
    private nodePathMap: Map<string, ITreeNode> = new Map();
    private symbolService: SymbolService;
    private treeRenderer: TreeRenderer;
    private matchedFilesCache: string[] | null = null;
    private matchedFoldersCache: string[] | null = null;
    private treeNodes: ITreeNode[] | null = null;

    /**
     * Constructor for the MyTreeDataProvider class.
     *
     * @param explicitFilesManager - Manages the explicit files to include.
     */
    constructor(private explicitFilesManager: ExplicitFilesManager) {
        this.symbolService = new SymbolService();
        this.nodeManager = new NodeManager(this.symbolService, this.explicitFilesManager);
        this.treeBuilder = new TreeBuilder(this.nodeManager, this.explicitFilesManager);
        this.treeRenderer = new TreeRenderer(this.symbolService);
        this.eventHandler = new EventHandler(this.explicitFilesManager, this.refresh.bind(this));
    }

    /**
     * Initializes event subscriptions.
     */
    initialize(): void {
        this.eventHandler.initialize();
    }

    /**
     * Refreshes the tree data provider.
     */
    public async refresh(): Promise<void> {
        this.nodeManager = new NodeManager(new SymbolService(), this.explicitFilesManager);
        this.treeBuilder = new TreeBuilder(this.nodeManager, this.explicitFilesManager);
        this.treeNodes = null;
        this._onDidChangeTreeData.fire();
        await this.buildTree();
    }

    /**
     * Builds the tree structure and caches it.
     */
    private async buildTree(): Promise<void> {
        try {
            this.treeNodes = await this.treeBuilder.buildTree();
        } catch (error) {
            this.logger.error(`Error building tree: ${error instanceof Error ? error.message : String(error)}`);
            this.treeNodes = [];
        }
    }

    /**
     * Retrieves the children of a tree node.
     * @param element - The parent node.
     * @returns An array of child TreeNodes.
     */
    public async getChildren(element?: ITreeNode): Promise<ITreeNode[]> {
        try {
            if (!element) {
                if (!this.treeNodes) {
                    await this.buildTree();
                }
                return this.treeNodes || [];
            }

            if (element.type === NodeType.Folder) {
                element.children = await this.getFolderChildren(element);
            }
            return element.children || [];
        } catch (error) {
            this.logger.error(`Error in getChildren: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }

    /**
     * Retrieves the tree item representation of the specified tree node.
     *
     * @param element - The tree node to convert into a tree item.
     * @returns A vscode.TreeItem representing the tree node.
     */
    public getTreeItem(element: ITreeNode): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);
        treeItem.id = element.path;

        // Set tooltip based on inclusion state
        treeItem.tooltip = this.getTooltipForInclusionState(element.content);

        // Set commands for files and symbols
        if (element.type === NodeType.File) {
            treeItem.resourceUri = vscode.Uri.file(element.path);
            treeItem.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [treeItem.resourceUri],
            };
        } else if (element.type === NodeType.Symbol) {
            if (element.uri && element.range) {
                treeItem.command = {
                    command: 'vscode.open',
                    title: 'Go to Symbol',
                    arguments: [element.uri, { selection: element.range }],
                };
            }
        }

        // Set context value for UI interactions
        treeItem.contextValue = this.getContextValue(element.type);

        return treeItem;
    }

    /**
     * Determines the tooltip text based on inclusion state.
     * @param state - The InclusionState.
     * @returns The tooltip string.
     */
    private getTooltipForInclusionState(state: InclusionState): string {
        switch (state) {
            case InclusionState.Included:
                return 'All contents are included.';
            case InclusionState.PartiallyIncluded:
                return 'Some contents are included.';
            case InclusionState.NotIncluded:
                return 'No contents are included.';
            default:
                return '';
        }
    }

    /**
     * Determines the context value based on node type.
     * @param type - The NodeType.
     * @returns The context value string.
     */
    private getContextValue(type: NodeType): string {
        switch (type) {
            case NodeType.Symbol:
                return 'symbolNode';
            case NodeType.File:
                return 'fileNode';
            case NodeType.Folder:
                return 'folderNode';
            default:
                return '';
        }
    }

    /**
     * Finds a node by its path.
     * @param path - The path of the node.
     * @param includeIntermediary - Whether to include intermediary nodes.
     * @returns The TreeNode or undefined.
     */
    public findNodeByPath(path: string, includeIntermediary: boolean = false): ITreeNode | undefined {
        return this.nodeManager.findNodeByPath(path, includeIntermediary);
    }

    /**
     * Retrieves matched files.
     * @returns An array of matched file paths.
     */
    public retrieveMatchedFiles(): string[] {
        const explicitFiles = this.explicitFilesManager.getExplicitFilesArray();
        return explicitFiles
            ? explicitFiles.map(filePath => Utility.normalizePath(filePath))
            : [];
    }

    /**
     * Retrieves matched folders.
     * @returns An array of matched folder paths.
     */
    public retrieveMatchedFolders(): string[] {
        const explicitFolders = this.explicitFilesManager.getExplicitFoldersArray();
        return explicitFolders
            ? explicitFolders.map(folderPath => Utility.normalizePath(folderPath))
            : [];
    }

    /**
     * Retrieves the matched files included in the tree data provider.
     *
     * @returns An array of normalized included file paths.
     */
    public getMatchedFiles(): Set<string> {
        if (!this.matchedFilesCache) {
            const explicitFiles = this.explicitFilesManager.getExplicitFilesArray();
            this.matchedFilesCache = explicitFiles
                ? explicitFiles.map(filePath => Utility.normalizePath(filePath))
                : [];
        }
        return new Set(this.matchedFilesCache);
    }

    /**
     * Retrieves the matched folders included in the tree data provider.
     *
     * @returns An array of normalized included folder paths.
     */
    public getMatchedFolders(): Set<string> {
        if (!this.matchedFoldersCache) {
            const explicitFolders = this.explicitFilesManager.getExplicitFoldersArray();
            this.matchedFoldersCache = explicitFolders
                ? explicitFolders.map(folderPath => Utility.normalizePath(folderPath))
                : [];
        }
        return new Set(this.matchedFoldersCache);
    }

    /**
     * Renders the tree in the specified format.
     * @param format - The render format.
     * @returns A string representing the tree.
     */
    public async renderTree(format: RenderMethod): Promise<string> {
        try {
            const tree = await this.getChildren();
            return this.treeRenderer.renderTree(tree, format);
        } catch (error) {
            this.logger.error(`Error rendering tree: ${error instanceof Error ? error.message : String(error)}`);
            return '';
        }
    }

    /**
     * Retrieves the parent path of a given path.
     *
     * @param fullPath - The full path of the current node.
     * @returns The parent path, or undefined if the node is a root.
     */
    private getParentPath(fullPath: string): string | undefined {
        const dirname = path.dirname(fullPath);
        if (dirname === fullPath) return undefined; // Root node has no parent
        return Utility.normalizePath(dirname);
    }

    /**
     * Joins the current path with a new segment and normalizes the result.
     *
     * @param currentPath - The existing path.
     * @param newPart - The new path segment to append.
     * @returns The combined and normalized path.
     */
    private joinAndNormalizePath(currentPath: string, newPart: string): string {
        return Utility.normalizePath(path.join(currentPath, newPart));
    }

    /**
     * Determines the inclusion state of a folder based on its children.
     *
     * @param children - An array of child TreeNodes.
     * @returns The determined inclusion state.
     */
    private determineFolderInclusionState(children: ITreeNode[]): InclusionState {
        const { includedCount, notIncludedCount } = this.countChildInclusionStates(children);

        if (includedCount > 0 && notIncludedCount === 0) {
            return InclusionState.Included;
        } else if (includedCount > 0 && notIncludedCount > 0) {
            return InclusionState.PartiallyIncluded;
        } else {
            return InclusionState.NotIncluded;
        }
    }

    /**
     * Counts the inclusion states of child nodes.
     *
     * @param children - An array of child TreeNodes.
     * @returns An object containing counts of included and not included nodes.
     */
    private countChildInclusionStates(children: ITreeNode[]): { includedCount: number; notIncludedCount: number; } {
        let includedCount = 0;
        let notIncludedCount = 0;

        for (const child of children) {
            switch (child.content) {
                case InclusionState.Included:
                    includedCount++;
                    break;
                case InclusionState.NotIncluded:
                    notIncludedCount++;
                    break;
                case InclusionState.PartiallyIncluded:
                    includedCount++;
                    notIncludedCount++;
                    break;
            }
        }

        return { includedCount, notIncludedCount };
    }

    /**
     * Updates a node's inclusion state and propagates the change to all
     * children and parent nodes.
     *
     * @param path - The path of the node to update.
     * @param inclusionState - The new inclusion state.
     */
    public updateNodeInclusionState(
        node: ITreeNode,
        inclusionState: InclusionState
    ): void {
        if (node) {
            this.setInclusionStateRecursively(node, inclusionState);
            this.updateParentInclusionStates(node);
        } else {
            this.logger.warn(`Node not found for path "${path}"`);
        }
    }

    /**
     * Updates a node's inclusion state and propagates the change to all
     * children and parent nodes.
     *
     * @param path - The path of the node to update.
     * @param inclusionState - The new inclusion state.
     */
    public updateNodeInclusionStateByPath(
        path: string,
        inclusionState: InclusionState
    ): void {
        const node = this.findNodeByPath(path, true);
        if (node) {
            this.updateNodeInclusionState(node, inclusionState);
        } else {
            this.logger.warn(`Node not found for path "${path}"`);
        }
    }

    /**
     * Recalculates the inclusion state of parent nodes based on their children's states.
     *
     * @param currentNode - The current node whose parent needs to be updated.
     */
    private updateParentInclusionStates(currentNode: ITreeNode): void {
        const parentPath = this.getParentPath(currentNode.path);
        if (!parentPath) return; // Reached the root

        const parentNode = this.nodePathMap.get(parentPath);
        if (parentNode) {
            const inclusionState = this.determineFolderInclusionState(parentNode.children);
            parentNode.content = inclusionState;

            // Recursively update ancestors
            this.updateParentInclusionStates(parentNode);
        }
    }

    /**
     * Recursively sets the inclusion state for a node and all its children.
     *
     * @param node - The node to update.
     * @param inclusionState - The new inclusion state.
     */
    private setInclusionStateRecursively(
        node: ITreeNode,
        inclusionState: InclusionState
    ): void {
        node.content = inclusionState;

        // Update isIntermediary flag based on inclusion state
        node.isIntermediary = inclusionState === InclusionState.PartiallyIncluded;

        if (node.children && node.children.length > 0) {
            for (const childNode of node.children) {
                this.setInclusionStateRecursively(
                    childNode,
                    inclusionState
                );
            }
        }
    }

    /**
     * Refreshes a specific node in the tree.
     *
     * @param node - The node to refresh.
     */
    public refreshNode(node: ITreeNode): void {
        this._onDidChangeTreeData.fire(node);
    }

    /**
     * Retrieves the children of a folder node.
     * 
     * @param folderNode - The folder node to retrieve children for.
     * @returns A promise that resolves to an array of TreeNode objects.
     */
    private async getFolderChildren(folderNode: ITreeNode): Promise<ITreeNode[]> {
        try {
            const normalizedFolderPath = Utility.normalizePath(folderNode.path);
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(normalizedFolderPath));
            this.logger.info(`Entries in ${normalizedFolderPath}:`, entries);

            const children = await this.processDirectoryEntries(entries, normalizedFolderPath);
            const inclusionState = this.determineFolderInclusionState(children);
            folderNode.content = inclusionState;
            folderNode.isIntermediary = inclusionState === InclusionState.PartiallyIncluded;

            return children;
        } catch (error) {
            this.logger.error(`Error reading directory: ${folderNode.path}`, { error });
            return [];
        }
    }

    /**
     * Creates a folder node using the TreeNodeFactory.
     * 
     * @param name - The name of the folder.
     * @param fullPath - The full path of the folder.
     * @returns A promise that resolves to a TreeNode representing the folder.
     */
    private async createFolderNode(name: string, fullPath: string): Promise<ITreeNode> {
        const folderNode = TreeNodeFactory.createFolderNode(name, fullPath, vscode.TreeItemCollapsibleState.Collapsed);
        folderNode.children = await this.getChildren(folderNode);

        // Ensure children array is initialized
        if (!folderNode.children) {
            folderNode.children = [];
        }

        // Determine inclusion state based on children
        const inclusionState = this.determineFolderInclusionState(folderNode.children);
        folderNode.content = inclusionState;

        // Update isIntermediary flag based on new inclusion state
        folderNode.isIntermediary = inclusionState === InclusionState.PartiallyIncluded;

        return folderNode;
    }

    /**
     * Processes directory entries to create TreeNodes for matched folders and files.
     * 
     * @param entries - The directory entries to process.
     * @param parentPath - The path of the parent directory.
     * @param matchedFilesSet - A Set of file paths that are matched for inclusion checking.
     * @returns A promise that resolves to an array of TreeNode objects.
     */
    private async processDirectoryEntries(
        entries: [string, vscode.FileType][],
        parentPath: string,
    ): Promise<ITreeNode[]> {
        // Input Validation
        if (!Array.isArray(entries)) {
            this.logger.error(`Expected 'entries' to be an array, but received: ${typeof entries}`);
            return [];
        }

        if (!Utility.isString(parentPath) || parentPath.trim() == '') {
            this.logger.error(`Invalid 'parentPath' provided: "${parentPath}". Expected a non-empty string.`);
            return [];
        }

        const children: ITreeNode[] = [];
        let includedCount = 0;
        let excludedCount = 0;
        for (const [name, type] of entries) {
            let fullPath = path.join(parentPath, name);
            fullPath = this.joinAndNormalizePath(parentPath, name); // Normalize the full path
            this.logger.debug(`Processing entry: "${fullPath}" of type "${type}"`);

            try {
                if (type === vscode.FileType.Directory) {
                    const isFolderIncluded = this.getMatchedFolders().has(fullPath);
                    const isIntermediary = !isFolderIncluded;

                    const folderNode = TreeNodeFactory.createFolderNode(
                        name,
                        fullPath,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        InclusionState.NotIncluded,
                        isIntermediary,
                    );
                    children.push(folderNode);
                    isFolderIncluded ? includedCount++ : excludedCount++;
                    folderNode.children = await this.getFolderChildren(folderNode);
                } else if (type === vscode.FileType.File) {
                    const isFileIncluded = this.getMatchedFiles().has(fullPath);
                    if (isFileIncluded) {
                        this.logger.debug(`Including file: "${fullPath}"`);
                        const fileNode = await this.nodeManager.createFileNode(name, fullPath);

                        if (fileNode) {
                            children.push(fileNode);
                            includedCount++;
                        } else {
                            this.logger.warn(`Failed to create file node for "${fullPath}"`);
                            excludedCount++;
                        }
                    } else {
                        this.logger.debug(`Excluding file: "${fullPath}"`);
                        excludedCount++;
                    }
                } else {
                    this.logger.warn(`Unknown FileType for "${fullPath}". Skipping.`);
                    excludedCount++;
                }
            } catch (error: any) {
                this.logger.error(`Error processing entry "${fullPath}": ${error.message}`, { error, fullPath });
                excludedCount++;
            }
        }

        this.logger.info(`Processed ${entries.length} entries: ${includedCount} included, ${excludedCount} excluded.`);
        return children;
    }

    // /**
    //  * Checks if a folder is partially included based on its contents.
    //  *
    //  * @param folderPath - The path of the folder to check.
    //  * @param matchedFilesSet - A Set of matched file paths for inclusion checking.
    //  * @returns A promise that resolves to true if the folder is partially included; otherwise, false.
    //  */
    // private async isFolderPartiallyIncluded(
    //     folderPath: string,
    //     matchedFilesSet: Set<string>
    // ): Promise<boolean> {
    //     // Check if the folder's inclusion state is cached
    //     if (this.folderInclusionCache.has(folderPath)) {
    //         return this.folderInclusionCache.get(folderPath) === InclusionState.PartiallyIncluded;
    //     }

    //     try {
    //         const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(folderPath));
    //         this.logger.debug(`Reading directory "${folderPath}". Entries found: ${entries.length}`);

    //         const inclusionState = await this.determineInclusionStateFromEntries(entries, folderPath, matchedFilesSet);
    //         this.folderInclusionCache.set(folderPath, inclusionState);

    //         return inclusionState === InclusionState.PartiallyIncluded;
    //     } catch (error) {
    //         this.logger.error(`Error checking partial inclusion for folder "${folderPath}": ${error instanceof Error ? error.message : String(error)}`, { error, folderPath });
    //         return false;
    //     }
    // }

    // private folderInclusionCache: Map<string, InclusionState> = new Map();

    // /**
    //  * Determines the inclusion state of a folder based on its entries.
    //  *
    //  * @param entries - The entries in the folder.
    //  * @param folderPath - The path of the folder.
    //  * @param matchedFilesSet - A Set of matched file paths for inclusion checking.
    //  * @returns A promise that resolves to the determined inclusion state.
    //  */
    // private async determineInclusionStateFromEntries(
    //     entries: [string, vscode.FileType][],
    //     folderPath: string,
    //     matchedFilesSet: Set<string>
    // ): Promise<InclusionState> {
    //     let hasIncluded = false;
    //     let hasExcluded = false;

    //     for (const [name, type] of entries) {
    //         const fullPath = path.join(folderPath, name);

    //         if (type === vscode.FileType.Directory) {
    //             const inclusionState = await this.getFolderInclusionState(fullPath, matchedFilesSet);
    //             if (inclusionState === InclusionState.Included) {
    //                 hasIncluded = true;
    //             } else if (inclusionState === InclusionState.PartiallyIncluded) {
    //                 hasIncluded = true;
    //                 hasExcluded = true;
    //                 break;
    //             } else {
    //                 hasExcluded = true;
    //             }
    //         } else if (type === vscode.FileType.File) {
    //             if (matchedFilesSet.has(fullPath)) {
    //                 hasIncluded = true;
    //             } else {
    //                 hasExcluded = true;
    //             }
    //         }

    //         if (hasIncluded && hasExcluded) {
    //             return InclusionState.PartiallyIncluded;
    //         }
    //     }

    //     if (hasIncluded) {
    //         return InclusionState.Included;
    //     } else {
    //         return InclusionState.NotIncluded;
    //     }
    // }

    // /**
    //  * Retrieves the inclusion state of a folder based on its explicit inclusion
    //  * and whether it is partially included.
    //  *
    //  * @param folderPath - The path of the folder to check.
    //  * @param matchedFilesSet - A Set of matched file paths for inclusion checking.
    //  * @returns A promise that resolves to the inclusion state of the folder.
    //  */
    // private async getFolderInclusionState(
    //     folderPath: string,
    //     matchedFilesSet: Set<string>
    // ): Promise<InclusionState> {
    //     if (this.explicitFilesManager.isFolderIncluded(folderPath)) {
    //         return InclusionState.Included;
    //     } else {
    //         const isPartiallyIncluded = await this.isFolderPartiallyIncluded(folderPath, matchedFilesSet);
    //         return isPartiallyIncluded ? InclusionState.PartiallyIncluded : InclusionState.NotIncluded;
    //     }
    // }

    /**
     * Traverses symbols and adds nested symbols to the output.
     *
     * @param symbols - Array of vscode.DocumentSymbol.
     * @param parentContext - The parent context string.
     * @param inclusionSymbol - The symbol representing inclusion state.
     * @returns An array of formatted symbol strings.
     */
    private traverseSymbols(
        symbols: vscode.DocumentSymbol[] | null | undefined,
        parentContext: string,
        inclusionSymbol: string
    ): string[] {
        if (!symbols || symbols.length === 0) {
            return [];
        }
        let result: string[] = [];
        symbols.forEach((symbol) => {
            const symbolKind = Utility.getSymbolKindDescription(symbol.kind);

            if (symbolKind && symbolKind !== 'Unknown Symbol') {
                const symbolName = `${parentContext}::${symbol.name}`;
                result.push(
                    `${inclusionSymbol} ${symbolKind}: ${symbolName}`
                );

                if (
                    symbol.children &&
                    symbol.children.length > 0
                ) {
                    result = result.concat(
                        this.traverseSymbols(
                            symbol.children,
                            symbolName,
                            inclusionSymbol
                        )
                    );
                }
            }
        });
        return result;
    }
}
