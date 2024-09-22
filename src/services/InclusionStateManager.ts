// src/services/InclusionStateManager.ts

import { ITreeNode, InclusionState } from '../interfaces';
import { CoreLogger } from '../logging/CoreLogger';

export class InclusionStateManager {
    private logger = CoreLogger.getInstance();

    /**
     * Updates the inclusion state of a node and its descendants.
     * @param node - The node to update.
     * @param inclusionState - The new inclusion state.
     */
    updateNodeInclusionState(node: ITreeNode | null | undefined, inclusionState: InclusionState): void {
        if (!node) {
            this.logger.warn('Node not found or invalid node.');
            return;
        }

        if (node.path) {
            this.setInclusionStateRecursively(node, inclusionState);
            this.updateParentInclusionStates(node);
        } else {
            this.logger.warn(`Node does not have a path property.`);
        }
    }

    /**
     * Recursively sets the inclusion state for a node and its children.
     * @param node - The node to update.
     * @param inclusionState - The new inclusion state.
     */
    private setInclusionStateRecursively(node: ITreeNode, inclusionState: InclusionState): void {
        node.content = inclusionState;
        node.isIntermediary = inclusionState === InclusionState.PartiallyIncluded;

        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                this.setInclusionStateRecursively(child, inclusionState);
            }
        }
    }

    /**
     * Updates the inclusion states of parent nodes based on their children's states.
     * @param currentNode - The current node.
     */
    private updateParentInclusionStates(currentNode: ITreeNode): void {
        const parent = currentNode.parent;
        if (!parent) return;

        parent.content = this.determineInclusionState(parent.children || []);
        parent.isIntermediary = parent.content === InclusionState.PartiallyIncluded;

        this.updateParentInclusionStates(parent);
    }

    /**
     * Determines the inclusion state based on child nodes.
     * @param children - The child nodes.
     * @returns The InclusionState.
     */
    private determineInclusionState(children: ITreeNode[]): InclusionState {
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

        if (includedCount > 0 && notIncludedCount === 0) {
            return InclusionState.Included;
        } else if (includedCount > 0 && notIncludedCount > 0) {
            return InclusionState.PartiallyIncluded;
        } else {
            return InclusionState.NotIncluded;
        }
    }
}
