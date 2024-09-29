// src/tree/TreeNodeFactory.ts

/**
 * This module provides a factory for creating TreeNode objects, which represent 
 * different types of nodes in a tree structure within a VS Code extension. 
 * It includes methods to create folder nodes, file nodes, and symbol nodes, 
 * allowing for the representation of files and folders in a hierarchical view.
 * 
 * The `TreeNodeFactory` class is responsible for instantiating these nodes 
 * based on the provided parameters and ensuring that they are valid and correctly 
 * configured for use in the tree view.
 * 
 * Key Features:
 * - Creates folder nodes with specified names, paths, and collapsible states.
 * - Creates file nodes with specified names, paths, and symbol indicators.
 * - Creates symbol nodes based on DocumentSymbol objects from the VS Code API.
 */

import * as vscode from 'vscode';

import { InclusionState, ITreeNode, NodeType } from '../interfaces';
import { CoreLogger } from '../logging/CoreLogger';

const logger = CoreLogger.getInstance();

/**
 * Factory class to create TreeNode objects for different node types.
 */
export class TreeNodeFactory {
    /**
     * Creates a folder TreeNode.
     * 
     * @param name - The name of the folder.
     * @param fullPath - The full path of the folder.
     * @param collapsibleState - The collapsible state of the folder node.
     * @param content - The inclusion state of the folder (default: NotIncluded).
     * @param isIntermediary - Indicates if the node is an intermediary (default: false).
     * @returns A TreeNode representing the folder.
     */
    public static createFolderNode(
        name: string,
        fullPath: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        content: InclusionState = InclusionState.NotIncluded,
        isIntermediary: boolean = false,
    ): ITreeNode {
        return {
            label: name,
            path: fullPath,
            type: NodeType.Folder,
            collapsibleState: collapsibleState,
            content: content,
            isIntermediary: isIntermediary,
            children: []
        };
    }

    /**
     * Creates a file TreeNode.
     * 
     * @param name - The name of the file.
     * @param fullPath - The full path of the file.
     * @param hasSymbols - Indicates if the file contains symbols (default: false).
     * @param content - The inclusion state of the file (default: Included).
     * @returns A TreeNode representing the file.
     */
    public static createFileNode(
        name: string,
        fullPath: string,
        hasSymbols: boolean = false,
        content: InclusionState = InclusionState.Included
    ): ITreeNode {
        return {
            label: name,
            path: fullPath,
            type: NodeType.File,
            collapsibleState: hasSymbols ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            content: content,
            isIntermediary: false,
            children: hasSymbols ? [] : undefined
        };
    }

    /**
     * Creates a symbol TreeNode.
     * 
     * @param symbol - The DocumentSymbol object.
     * @param filePath - The path of the file containing the symbol.
     * @returns A TreeNode representing the symbol, or null if not included.
     */
    public static createSymbolNode(
        symbol: vscode.DocumentSymbol,
        filePath: string,
    ): ITreeNode | null {
        return {
            label: symbol.name,
            path: `${filePath}::${symbol.name}`,
            type: NodeType.Symbol,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            content: InclusionState.NotIncluded,
            symbolKind: symbol.kind,
            range: symbol.range,
            children: []
        };
    }
}