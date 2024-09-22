import * as vscode from 'vscode';
import { InclusionState, NodeType } from '../../../interfaces';
import { TreeNodeFactory } from '../../TreeNodeFactory';

// Mock the vscode API
jest.mock('vscode', () => ({
    SymbolKind: {
        Function: 12,
    },
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        })),
    },
    Range: jest.fn((start, end) => ({ start, end })),
    Position: jest.fn((line, character) => ({ line, character })),
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2,
    },
}));

describe('TreeNodeFactory.createSymbolNode', () => {
    it('should create a symbol TreeNode from a DocumentSymbol object', () => {
        const symbol: vscode.DocumentSymbol = {
            name: 'mySymbol',
            kind: vscode.SymbolKind.Function,
            range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 0)),
            selectionRange: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 0)),
            children: [],
            detail: '',
        };
        const filePath = '/path/to/MyFile.ts';

        const node = TreeNodeFactory.createSymbolNode(symbol, filePath);

        expect(node).toEqual({
            label: symbol.name,
            path: `${filePath}::${symbol.name}`,
            type: NodeType.Symbol,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            content: InclusionState.NotIncluded,
            symbolKind: symbol.kind,
            range: symbol.range,
            children: [],
        });
    });
});
