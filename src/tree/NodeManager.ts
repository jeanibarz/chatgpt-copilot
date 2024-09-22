// src/services/NodeManager.ts

import { ITreeNode, InclusionState } from '../interfaces';
import { CoreLogger } from '../logging/CoreLogger';
import {
    ExplicitFilesManager
} from '../services/ExplicitFilesManager';
import { Utility } from "../Utility";
import { SymbolService } from './SymbolService';
import { TreeNodeFactory } from './TreeNodeFactory';
export class NodeManager {
    private logger = CoreLogger.getInstance();
    private nodePathMap: Map<string, ITreeNode> = new Map();
    private symbolService: SymbolService;
    private symbolsToInclude: Set<string>;

    constructor(symbolService: SymbolService, explicitFilesManager: ExplicitFilesManager) {
        this.symbolService = symbolService;
        this.symbolsToInclude = new Set();
        // this.symbolsToInclude = explicitFilesManager.getSymbolsToInclude();
    }

    /**
     * Finds a node by its path.
     * @param path - The path of the node.
     * @param includeIntermediary - Whether to include intermediary nodes.
     * @returns The TreeNode or undefined.
     */
    findNodeByPath(path: string, includeIntermediary: boolean = false): ITreeNode | undefined {
        const node = this.nodePathMap.get(path);
        if (!includeIntermediary && node?.isIntermediary) {
            return undefined;
        }
        return node;
    }

    /**
     * Registers a node in the nodePathMap.
     * @param fullPath - The full path of the node.
     * @param node - The TreeNode to register.
     */
    registerNode(fullPath: string, node: ITreeNode): void {
        this.nodePathMap.set(fullPath, node);
    }

    /**
     * Creates a file node.
     * @param name - The name of the file.
     * @param fullPath - The full path of the file.
     * @returns The created TreeNode or null.
     */
    async createFileNode(name: string, fullPath: string): Promise<ITreeNode | null> {
        try {
            const hasSymbols = await this.symbolService.hasFileSymbols(fullPath);
            const fileNode = TreeNodeFactory.createFileNode(
                name,
                fullPath,
                hasSymbols,
                InclusionState.NotIncluded
            );

            if (fileNode) {
                fileNode.children = [];

                if (hasSymbols) {
                    await this.loadFileSymbols(fileNode);
                }

                // Determine inclusion state based on symbols
                fileNode.content = this.determineInclusionState(fileNode.children);
            }

            return fileNode;
        } catch (error) {
            this.logger.error(`Error creating file node for "${fullPath}": ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Loads symbols for a file node.
     * @param fileNode - The file node.
     */
    public async loadFileSymbols(fileNode: ITreeNode): Promise<void> {
        try {
            const symbols = await this.symbolService.getFileSymbols(fileNode.path);
            if (!symbols || symbols.length === 0) {
                this.logger.warn(`No symbols found for file "${fileNode.path}"`);
                return;
            }
            const flatSymbols = this.symbolService.flattenSymbols(symbols);
            if (!flatSymbols || flatSymbols.length === 0) {
                this.logger.warn(`No flat symbols generated for file "${fileNode.path}"`);
                return;
            }

            // Filter symbols based on symbolsToInclude
            const filteredSymbols = flatSymbols.filter(symbol => {
                const kindDescription = Utility.getSymbolKindDescription(symbol.kind);
                if (kindDescription) {
                    return this.symbolsToInclude.has(kindDescription);
                } else {
                    this.logger.warn('Symbol kind description not found');
                }
            });

            if (filteredSymbols.length === 0) {
                this.logger.warn(`No symbols matched the inclusion criteria for file "${fileNode.path}"`);
                return;
            }

            // Create symbol nodes
            fileNode.children = filteredSymbols
                .map(symbol => TreeNodeFactory.createSymbolNode(symbol, fileNode.path))
                .filter((node): node is ITreeNode => node !== null);
        } catch (error) {
            this.logger.error(`Error loading symbols for file "${fileNode.path}": ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Determines the inclusion state based on child nodes.
     * @param children - The child nodes.
     * @returns The InclusionState.
     */
    determineInclusionState(children: ITreeNode[]): InclusionState {
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
     * @param children - The child nodes.
     * @returns An object with counts of included and not included nodes.
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
     * Retrieves a node by its path.
     * @param fullPath - The full path of the node.
     * @returns The TreeNode or undefined.
     */
    getNode(fullPath: string): ITreeNode | undefined {
        return this.nodePathMap.get(fullPath);
    }
}
