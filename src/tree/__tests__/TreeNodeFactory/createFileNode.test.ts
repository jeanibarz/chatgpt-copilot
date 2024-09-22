import * as vscode from 'vscode';
import { InclusionState, NodeType } from '../../../interfaces';
import { TreeNodeFactory } from '../../TreeNodeFactory';

// Mock the vscode API
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        })),
    },
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2,
    },
}));

describe('TreeNodeFactory.createFileNode', () => {
    it('should create a file TreeNode with default values', () => {
        const nodeName = 'MyFile.ts';
        const fullPath = '/path/to/MyFile.ts';

        const node = TreeNodeFactory.createFileNode(nodeName, fullPath);

        expect(node).toEqual({
            label: nodeName,
            path: fullPath,
            type: NodeType.File,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            content: InclusionState.Included, // Default value
            isIntermediary: false, // Default value
            children: undefined, // No symbols, so no children
        });
    });

    it('should create a file TreeNode with symbols and collapsed state', () => {
        const nodeName = 'MyFileWithSymbols.ts';
        const fullPath = '/path/to/MyFileWithSymbols.ts';
        const hasSymbols = true;

        const node = TreeNodeFactory.createFileNode(nodeName, fullPath, hasSymbols);

        expect(node).toEqual({
            label: nodeName,
            path: fullPath,
            type: NodeType.File,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, // Symbols present, so collapsed
            content: InclusionState.Included, // Default value
            isIntermediary: false, // Default value
            children: [], // Symbols present, so children is an empty array
        });
    });
});
