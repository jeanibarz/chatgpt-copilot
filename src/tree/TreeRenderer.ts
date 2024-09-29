// src/TreeRenderer.ts

/**
 * 
 * This module provides functionality for rendering project trees in various formats 
 * within a VS Code extension. It handles the visualization of project files and 
 * directories, allowing users to view the structure of their projects in both ASCII 
 * format and full path format. The `TreeRenderer` class is responsible for generating 
 * these representations based on a tree structure provided by a `vscode.TreeDataProvider`.
 * 
 * Key Features:
 * - Renders project files in ASCII format.
 * - Provides full path representations of project files.
 * - Handles rendering using the new `FilteredFileExplorerProvider`.
 */

import { injectable } from "inversify";
import * as vscode from 'vscode';
import { RenderMethod } from "../interfaces";
import { CoreLogger } from '../logging/CoreLogger';
import { FilteredTreeDataProvider } from "./FilteredTreeDataProvider";

@injectable()
export class TreeRenderer {
    private logger = CoreLogger.getInstance();

    constructor() { }

    /**
     * Renders the tree starting from the given item in the specified format.
     * @param item - The `vscode.TreeItem` to start rendering from. If undefined, starts from the root.
     * @param format - The render format.
     * @returns A string representing the tree.
     */
    async renderTree(format: RenderMethod, treeDataProvider: FilteredTreeDataProvider): Promise<string> {
        switch (format) {
            case RenderMethod.Ascii:
                return await this.renderTreeAscii(undefined, treeDataProvider);
            case RenderMethod.FullPath:
                return await this.renderTreeFullPath(undefined, treeDataProvider);
            case RenderMethod.FullPathDetails:
                return await this.renderTreeFullPathDetails(undefined, treeDataProvider);
            default:
                this.logger.warn(`Unrecognized format "${format}". Defaulting to ASCII.`);
                return await this.renderTreeAscii(undefined, treeDataProvider);
        }
    }

    /**
     * Renders the tree in ASCII format starting from the given item.
     *
     * @param item - The `vscode.TreeItem` to start rendering from. If undefined, starts from the root.
     * @returns A string representing the ASCII tree.
     */
    private async renderTreeAscii(item: vscode.TreeItem | undefined, treeDataProvider: FilteredTreeDataProvider): Promise<string> {
        const rootElements = await treeDataProvider.getChildren(item);
        const lines: string[] = [];
        if (rootElements) {
            for (const element of rootElements) {
                await this.renderNodeAscii(element, '', lines, treeDataProvider);
            }
        }
        return lines.join('\n');
    }

    /**
     * Recursively renders a node in ASCII format.
     * @param element - The `vscode.TreeItem`.
     * @param prefix - The prefix string for formatting.
     * @param lines - The array of lines to append to.
     */
    private async renderNodeAscii(element: vscode.TreeItem, prefix: string, lines: string[], treeDataProvider: FilteredTreeDataProvider): Promise<void> {
        const label = element.label || '';
        lines.push(`${prefix}${label}`);

        const children = await treeDataProvider.getChildren(element);
        if (children && children.length > 0) {
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const isLast = i === children.length - 1;
                const newPrefix = prefix + (isLast ? '└─ ' : '├─ ');
                await this.renderNodeAscii(child, newPrefix, lines, treeDataProvider);
            }
        }
    }

    /**
     * Renders the tree with full paths starting from the given item.
     * @param item - The `vscode.TreeItem` to start rendering from. If undefined, starts from the root.
     * @returns A string representing the tree.
     */
    private async renderTreeFullPath(item: vscode.TreeItem | undefined, treeDataProvider: FilteredTreeDataProvider): Promise<string> {
        const rootElements = await treeDataProvider.getChildren(item);
        const lines: string[] = [];
        if (rootElements) {
            for (const element of rootElements) {
                await this.renderNodeFullPath(element, '', lines, treeDataProvider);
            }
        }
        return lines.join('\n');
    }

    /**
     * Recursively renders a node with full paths.
     * @param element - The `vscode.TreeItem`.
     * @param prefix - The prefix string for formatting.
     * @param lines - The array of lines to append to.
     */
    private async renderNodeFullPath(element: vscode.TreeItem, prefix: string, lines: string[], treeDataProvider: FilteredTreeDataProvider): Promise<void> {
        const path = element.resourceUri ? element.resourceUri.fsPath : element.label || '';
        lines.push(`${prefix}${path}`);

        const children = await treeDataProvider.getChildren(element);
        if (children && children.length > 0) {
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const isLast = i === children.length - 1;
                const newPrefix = prefix + (isLast ? '└─ ' : '├─ ');
                await this.renderNodeFullPath(child, newPrefix, lines, treeDataProvider);
            }
        }
    }

    /**
     * Renders detailed paths of the tree asynchronously with specific indentation, starting from the given item.
     *
     * @param item - The `vscode.TreeItem` to start rendering from. If undefined, starts from the root.
     * @returns A promise that resolves to a string containing detailed paths.
     */
    private async renderTreeFullPathDetails(item: vscode.TreeItem | undefined, treeDataProvider: FilteredTreeDataProvider): Promise<string> {
        const detailedPaths: string[] = [];
        const rootElements = await treeDataProvider.getChildren(item);
        if (rootElements) {
            for (const element of rootElements) {
                await this.collectNodeDetails(element, '', detailedPaths, treeDataProvider);
            }
        }
        return detailedPaths.join('\n');
    }

    /**
     * Collects details of a node and its children asynchronously.
     * @param element - The `vscode.TreeItem` to collect details from.
     * @param indentation - The current indentation string.
     * @param result - The array to store the results.
     */
    private async collectNodeDetails(
        element: vscode.TreeItem,
        indentation: string,
        result: string[],
        treeDataProvider: FilteredTreeDataProvider,
    ): Promise<void> {
        const formattedNode = this.formatNode(element, indentation);
        result.push(formattedNode);

        const children = await treeDataProvider.getChildren(element);
        if (children && children.length > 0) {
            // Sort the children by their path in ascending order
            const sortedChildren = children.sort((a, b) => {
                const aPath = (a.resourceUri ? a.resourceUri.fsPath : a.label || '').toLowerCase();
                const bPath = (b.resourceUri ? b.resourceUri.fsPath : b.label || '').toLowerCase();
                return aPath.localeCompare(bPath);
            });
            for (const child of sortedChildren) {
                await this.collectNodeDetails(child, indentation + '  ', result, treeDataProvider);
            }
        }
    }

    /**
     * Formats a node based on its type with the specified indentation.
     *
     * @param element - The `vscode.TreeItem` to format.
     * @param indentation - The indentation string.
     * @returns A formatted string representing the node.
     */
    private formatNode(element: vscode.TreeItem, indentation: string): string {
        const label = element.label || '';
        const path = element.resourceUri ? element.resourceUri.fsPath : label;
        const contextValue = element.contextValue || '';
        let nodeType = '';

        switch (contextValue) {
            case 'folder':
                nodeType = 'Folder';
                break;
            case 'file':
                nodeType = 'File';
                break;
            default:
                nodeType = 'Unknown';
        }

        let lineCount = '';
        if (element.description) {
            lineCount = ` (${element.description})`;
        }

        return `${indentation}${nodeType}: ${path}${lineCount}`;
    }
}
