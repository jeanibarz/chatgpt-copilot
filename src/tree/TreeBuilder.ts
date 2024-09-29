// src/services/TreeBuilder.ts

/**
 * This module is responsible for building a tree structure from file and folder paths.
 * It utilizes the NodeManager and ExplicitFilesManager to manage nodes and determine 
 * inclusions based on explicit file and folder configurations.
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { ITreeNode, InclusionState } from '../interfaces';
import { ExplicitFilesManager } from '../services/ExplicitFilesManager';
import { Utility } from '../Utility';
import { NodeManager } from './NodeManager';
import { TreeNodeFactory } from './TreeNodeFactory';

export class TreeBuilder {
    constructor(
        private nodeManager: NodeManager,
        private explicitFilesManager: ExplicitFilesManager
    ) { }

    /**
     * Builds the tree structure.
     * @returns An array of root TreeNodes.
     */
    async buildTree(): Promise<ITreeNode[]> {
        const allPaths = this.getAllMatchedNormalizedPaths();
        const rootNodes: ITreeNode[] = [];

        for (const fullPath of allPaths) {
            const pathParts = this.getPathParts(fullPath);
            let currentPath = this.getInitialPath(fullPath);
            let parentNode: ITreeNode | undefined;

            for (const part of pathParts) {
                currentPath = this.joinAndNormalizePath(currentPath, part);
                let currentNode = this.nodeManager.getNode(currentPath);

                if (!currentNode) {
                    const isFile = this.isFileNode(fullPath, currentPath);
                    currentNode = await this.createNode(part, currentPath, isFile);

                    if (currentNode) {
                        this.nodeManager.registerNode(currentPath, currentNode);
                        this.attachNodeToParent(parentNode, currentNode, rootNodes);
                    }
                } else {
                    if (currentNode.isIntermediary) {
                        const isMatchedFolder = this.explicitFilesManager.isFolderIncluded(currentPath);
                        if (isMatchedFolder) {
                            currentNode.isIntermediary = false;
                            currentNode.content = InclusionState.Included;
                        }
                    }
                }

                parentNode = currentNode;
            }
        }

        return rootNodes;
    }

    /**
     * Retrieves all matched normalized paths.
     * @returns An array of normalized paths.
     */
    private getAllMatchedNormalizedPaths(): string[] {
        return [
            ...this.retrieveMatchedFiles(),
            ...this.retrieveMatchedFolders()
        ].map(p => Utility.normalizePath(p));
    }

    /**
     * Splits a full path into parts.
     * @param fullPath - The full path.
     * @returns An array of path segments.
     */
    private getPathParts(fullPath: string): string[] {
        return fullPath.split(path.sep).filter(part => part.length > 0);
    }

    /**
     * Determines the initial path based on whether it's absolute.
     * @param fullPath - The full path.
     * @returns The root path or an empty string.
     */
    private getInitialPath(fullPath: string): string {
        return path.isAbsolute(fullPath) ? path.parse(fullPath).root : '';
    }

    /**
     * Joins and normalizes paths.
     * @param currentPath - The current path.
     * @param newPart - The new path segment.
     * @returns The combined and normalized path.
     */
    private joinAndNormalizePath(currentPath: string, newPart: string): string {
        return Utility.normalizePath(path.join(currentPath, newPart));
    }

    /**
     * Creates a new node.
     * @param name - The name of the node.
     * @param fullPath - The full path of the node.
     * @param isFile - Whether the node is a file.
     * @returns The created TreeNode or null.
     */
    private async createNode(name: string, fullPath: string, isFile: boolean): Promise<ITreeNode | null> {
        if (isFile) {
            return await this.nodeManager.createFileNode(name, fullPath);
        } else {
            const isMatchedFolder = this.explicitFilesManager.isFolderIncluded(fullPath);
            const isIntermediary = !isMatchedFolder;

            const folderNode = TreeNodeFactory.createFolderNode(
                name,
                fullPath,
                vscode.TreeItemCollapsibleState.Collapsed,
                isMatchedFolder ? InclusionState.Included : InclusionState.NotIncluded,
                isIntermediary
            );
            folderNode.children = []; // Initialize children array

            return folderNode;
        }
    }

    /**
     * Attaches a node to its parent or to the root nodes.
     * @param parentNode - The parent node.
     * @param currentNode - The current node.
     * @param rootNodes - The array of root nodes.
     */
    private attachNodeToParent(parentNode: ITreeNode | undefined, currentNode: ITreeNode, rootNodes: ITreeNode[]): void {
        if (parentNode) {
            if (!parentNode.children?.some(child => child.path === currentNode.path)) {
                parentNode.children?.push(currentNode);
                currentNode.parent = parentNode;
            }
        } else {
            rootNodes.push(currentNode);
        }
    }

    /**
     * Determines if the current path corresponds to a file node.
     * @param fullPath - The full path being processed.
     * @param currentPath - The current path segment.
     * @returns True if it's a file node; otherwise, false.
     */
    private isFileNode(fullPath: string, currentPath: string): boolean {
        const isLastPart = currentPath === Utility.normalizePath(fullPath);
        return isLastPart && this.explicitFilesManager.isFileIncluded(currentPath);
    }

    /**
     * Retrieves matched files from the ExplicitFilesManager.
     * @returns An array of matched file paths.
     */
    private retrieveMatchedFiles(): string[] {
        const explicitFiles = this.explicitFilesManager.getExplicitFilesArray();
        return explicitFiles
            ? explicitFiles.map(filePath => Utility.normalizePath(filePath))
            : [];
    }

    /**
     * Retrieves matched folders from the ExplicitFilesManager.
     * @returns An array of matched folder paths.
     */
    private retrieveMatchedFolders(): string[] {
        const explicitFolders = this.explicitFilesManager.getExplicitFoldersArray();
        return explicitFolders
            ? explicitFolders.map(folderPath => Utility.normalizePath(folderPath))
            : [];
    }
}