// src/tree/TreeRenderer.ts

/**
 * This module provides functionality for rendering project trees in various formats 
 * within a VS Code extension. It handles the visualization of project files and 
 * directories, allowing users to view the structure of their projects in both ASCII 
 * format and full path format. The `TreeRenderer` class is responsible for generating 
 * these representations based on a tree structure defined by `TreeNode` objects.
 * 
 * Key Features:
 * - Renders project files in ASCII format with a summary header.
 * - Provides full path representations of project files.
 * - Collects detailed information about files and their symbols.
 */

import * as vscode from 'vscode';

import { InclusionState, ITreeNode, NodeType, RenderMethod } from '../interfaces';
import { CoreLogger } from '../logging/CoreLogger';
import { SymbolService } from './SymbolService';

export class TreeRenderer {
    private logger = CoreLogger.getInstance();

    /**
     * Constructor for the `TreeRenderer` class.
     * Initializes a new instance of the TreeRenderer with the provided SymbolService.
     * 
     * @param symbolService - An instance of `SymbolService` for retrieving file symbols.
     */
    constructor(private symbolService: SymbolService) { }

    /**
     * Renders the tree in the specified format.
     * 
     * @param tree - The tree structure.
     * @param format - The render format.
     * @returns A string representing the tree.
     */
    async renderTree(tree: ITreeNode[], format: RenderMethod): Promise<string> {
        switch (format) {
            case RenderMethod.Ascii:
                return this.renderTreeAscii(tree);
            case RenderMethod.FullPath:
                return this.renderTreeFullPath(tree);
            case RenderMethod.FullPathDetails:
                return await this.renderTreeFullPathDetails(tree);
            default:
                this.logger.warn(`Unrecognized format "${format}". Defaulting to ASCII.`);
                return this.renderTreeAscii(tree);
        }
    }

    /**
     * Renders the tree in ASCII format.
     *
     * @param tree - Array of root `TreeNode`s.
     * @returns A string representing the ASCII tree.
     */
    public renderTreeAscii(tree: ITreeNode[]): string {
        const lines: string[] = [];
        tree.forEach(node => this.renderNodeAscii(node, '', lines));
        return lines.join('\n');
    }

    /**
     * Recursively renders a node in ASCII format.
     * 
     * @param node - The TreeNode.
     * @param prefix - The prefix string for formatting.
     * @param lines - The array of lines to append to.
     */
    private renderNodeAscii(node: ITreeNode, prefix: string, lines: string[]): void {
        lines.push(`${prefix}${node.label}`);
        if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
                const isLast = index === node.children!.length - 1;
                const newPrefix = prefix + (isLast ? '└─ ' : '├─ ');
                this.renderNodeAscii(child, newPrefix, lines);
            });
        }
    }

    /**
     * Renders the tree with full paths.
     * 
     * @param tree - The tree structure.
     * @returns A string representing the tree.
     */
    renderTreeFullPath(tree: ITreeNode[]): string {
        const lines: string[] = [];
        tree.forEach(node => this.renderNodeFullPath(node, '', lines));
        return lines.join('\n');
    }

    /**
     * Recursively renders a node with full paths.
     * 
     * @param node - The TreeNode.
     * @param prefix - The prefix string for formatting.
     * @param lines - The array of lines to append to.
     */
    private renderNodeFullPath(node: ITreeNode, prefix: string, lines: string[]): void {
        lines.push(`${prefix}${node.path}`);
        if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
                const isLast = index === node.children!.length - 1;
                const newPrefix = prefix + (isLast ? '└─ ' : '├─ ');
                this.renderNodeFullPath(child, newPrefix, lines);
            });
        }
    }

    /**
     * Renders detailed paths of the tree asynchronously with specific indentation.
     *
     * @param tree - Array of root `TreeNode`s.
     * @returns A promise that resolves to a string containing detailed paths.
     */
    public async renderTreeFullPathDetails(tree: ITreeNode[]): Promise<string> {
        const detailedPaths: string[] = [];
        const sortedTree = this.sortNodesByPath(tree);
        for (const rootNode of sortedTree) {
            const nodeDetails = await this.collectNodeDetails(rootNode);
            detailedPaths.push(...nodeDetails);
        }
        return detailedPaths.join('\n');
    }

    /**
     * Collects details of a node and its children asynchronously.
     * Skips rendering intermediary nodes but continues traversal.
     *
     * @param node - The `TreeNode` to collect details from.
     * @returns A promise that resolves to an array of strings containing node details.
     */
    private async collectNodeDetails(
        node: ITreeNode,
    ): Promise<string[]> {
        const result: string[] = [];

        if (!node.isIntermediary) {
            const formattedNode = this.formatNode(node);
            result.push(formattedNode);
        } else {
            this.logger.debug(`Skipping intermediary node: ${node.path}`);
        }

        if (node.children && node.children.length > 0) {
            // Sort the children by their path in ascending order
            const sortedChildren = this.sortNodesByPath(node.children);
            for (const child of sortedChildren) {
                const childDetails = await this.collectNodeDetails(child);
                result.push(...childDetails);
            }
        }

        return result;
    }

    /**
     * Formats a node based on its type with the specified indentation.
     *
     * - Folders: Level 1 indentation (no indentation)
     * - Files: Level 2 indentation (2 spaces)
     * - Symbols: Level 3 indentation (4 spaces)
     *
     * Also includes the inclusion state symbol at the beginning of the line.
     *
     * @param node - The `TreeNode` to format.
     * @returns A formatted string representing the node.
     */
    private formatNode(node: ITreeNode): string {
        const inclusionSymbol = this.getInclusionSymbol(node.content);
        let indentation = '';
        let nodeType = '';
        let nodePath = '';

        switch (node.type) {
            case NodeType.Folder:
                indentation = ''; // No indentation for folders
                nodeType = 'Folder';
                nodePath = node.path;
                break;
            case NodeType.File:
                indentation = '  '; // 2 spaces for files
                nodeType = 'File';
                nodePath = node.path;
                break;
            case NodeType.Symbol:
                indentation = '    '; // 4 spaces for symbols
                nodeType = 'Symbol';
                nodePath = node.label; // Display symbol name instead of path
                break;
            default:
                indentation = '';
                nodeType = node.type;
                nodePath = node.path;
        }

        if (node.type === NodeType.Symbol) {
            const symbolKindString = this.getSymbolKindString(node.symbolKind);
            return `${indentation}${inclusionSymbol} Symbol<${symbolKindString}>: ${node.label}`;
        }

        return `${indentation}${inclusionSymbol} ${nodeType}: ${nodePath}`;
    }

    /**
     * Helper function to get an inclusion symbol based on content state.
     *
     * @param content - The inclusion state.
     * @returns A string representing the inclusion symbol.
     */
    private getInclusionSymbol(
        content: InclusionState
    ): string {
        switch (content) {
            case InclusionState.Included:
                return '🟢'; // Fully included
            case InclusionState.PartiallyIncluded:
                return '🟡'; // Partially included
            case InclusionState.NotIncluded:
            default:
                return '🔴'; // Not included
        }
    }

    /**
     * Sorts an array of TreeNodes by their path in ascending order.
     *
     * @param nodes - The array of TreeNodes to sort.
     * @returns A new sorted array of TreeNodes.
     */
    private sortNodesByPath(nodes: ITreeNode[]): ITreeNode[] {
        return nodes.slice().sort((a, b) => a.path.localeCompare(b.path));
    }

    /**
     * Converts a `vscode.SymbolKind` to a readable string.
     *
     * @param symbolKind - The `vscode.SymbolKind`.
     * @returns A string representing the symbol kind.
     */
    private getSymbolKindString(symbolKind: vscode.SymbolKind | undefined): string {
        if (symbolKind === undefined) return 'Unknown';
        switch (symbolKind) {
            case vscode.SymbolKind.File: return "File";
            case vscode.SymbolKind.Module: return "Module";
            case vscode.SymbolKind.Namespace: return "Namespace";
            case vscode.SymbolKind.Package: return "Package";
            case vscode.SymbolKind.Class: return "Class";
            case vscode.SymbolKind.Method: return "Method";
            case vscode.SymbolKind.Property: return "Property";
            case vscode.SymbolKind.Field: return "Field";
            case vscode.SymbolKind.Constructor: return "Constructor";
            case vscode.SymbolKind.Enum: return "Enum";
            case vscode.SymbolKind.Interface: return "Interface";
            case vscode.SymbolKind.Function: return "Function";
            case vscode.SymbolKind.Variable: return "Variable";
            case vscode.SymbolKind.Constant: return "Constant";
            case vscode.SymbolKind.String: return "String";
            case vscode.SymbolKind.Number: return "Number";
            case vscode.SymbolKind.Boolean: return "Boolean";
            case vscode.SymbolKind.Array: return "Array";
            // Add other cases as needed
            default: return "Unknown";
        }
    }
}