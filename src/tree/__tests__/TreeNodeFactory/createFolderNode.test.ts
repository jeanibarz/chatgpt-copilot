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

describe('TreeNodeFactory.createFolderNode', () => {
    it('should create a folder TreeNode with default values', () => {
        const nodeName = 'MyFolder';
        const fullPath = '/path/to/MyFolder';
        const collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

        const node = TreeNodeFactory.createFolderNode(nodeName, fullPath, collapsibleState);

        expect(node).toEqual({
            label: nodeName,
            path: fullPath,
            type: NodeType.Folder,
            collapsibleState: collapsibleState,
            content: InclusionState.NotIncluded, // Default value
            isIntermediary: false, // Default value
            children: [],
        });
    });

    it('should create a folder TreeNode with specific inclusion state and intermediary flag', () => {
        const nodeName = 'IntermediaryFolder';
        const fullPath = '/path/to/IntermediaryFolder';
        const collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        const content = InclusionState.Included;
        const isIntermediary = true;

        const node = TreeNodeFactory.createFolderNode(nodeName, fullPath, collapsibleState, content, isIntermediary);

        expect(node).toEqual({
            label: nodeName,
            path: fullPath,
            type: NodeType.Folder,
            collapsibleState: collapsibleState,
            content: content,
            isIntermediary: isIntermediary,
            children: [],
        });
    });
});
