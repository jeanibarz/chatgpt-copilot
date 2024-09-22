import * as vscode from 'vscode';

import { InclusionState, ITreeNode, NodeType } from '../../../interfaces';
import { NodeManager } from '../../NodeManager';
import { SymbolService } from '../../SymbolService';
import { TreeNodeFactory } from '../../TreeNodeFactory';

jest.mock('../../SymbolService');
jest.mock('../../TreeNodeFactory');

// Mock the vscode API
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        })),
    },
    SymbolKind: {
        Function: 12,
        Class: 2,
    },
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2,
    },
}));

describe('NodeManager.loadFileSymbols', () => {
    let nodeManager: NodeManager;
    let symbolServiceMock: jest.Mocked<SymbolService>;

    beforeEach(() => {
        symbolServiceMock = new SymbolService() as jest.Mocked<SymbolService>;
        const explicitFilesManagerMock = {} as any;
        nodeManager = new NodeManager(symbolServiceMock, explicitFilesManagerMock);
        nodeManager['symbolsToInclude'].add('Function');
    });

    it('should filter out symbols that are not in symbolsToInclude', async () => {
        const fileNode: ITreeNode = {
            label: 'file.ts',
            path: '/path/to/file.ts',
            type: NodeType.File,
            collapsibleState: 1,
            content: InclusionState.NotIncluded,
            isIntermediary: false,
            children: [],
        };

        // Only the function symbol should be included, the class should be filtered out
        const mockSymbols = [
            { name: 'functionSymbol', kind: vscode.SymbolKind.Function, location: {}, range: {}, children: [] } as any,
            { name: 'classSymbol', kind: vscode.SymbolKind.Class, location: {}, range: {}, children: [] } as any,
        ];

        symbolServiceMock.getFileSymbols.mockResolvedValue(mockSymbols);
        symbolServiceMock.flattenSymbols.mockReturnValue(mockSymbols);

        jest.spyOn(TreeNodeFactory, 'createSymbolNode')
            .mockImplementationOnce(() => ({
                label: 'functionSymbolNode',
                path: '/path/to/file.ts::functionSymbol',
                type: NodeType.Symbol,
                collapsibleState: 0,
                content: InclusionState.NotIncluded,
                isIntermediary: false,
                children: [],
                symbolKind: vscode.SymbolKind.Function,
            }));

        await nodeManager.loadFileSymbols(fileNode);

        // The class symbol should be filtered out, so only 1 symbol node should be created
        expect(fileNode.children).toHaveLength(1);
        expect(fileNode.children![0].label).toBe('functionSymbolNode');
    });

    it('should create no symbol nodes when symbolsToInclude is empty', async () => {
        // Clear the symbolsToInclude set
        nodeManager['symbolsToInclude'].clear();

        const fileNode: ITreeNode = {
            label: 'file.ts',
            path: '/path/to/file.ts',
            type: NodeType.File,
            collapsibleState: 1,
            content: InclusionState.NotIncluded,
            isIntermediary: false,
            children: [],
        };

        const mockSymbols = [
            { name: 'functionSymbol', kind: vscode.SymbolKind.Function, location: {}, range: {}, children: [] } as any,
        ];

        symbolServiceMock.getFileSymbols.mockResolvedValue(mockSymbols);
        symbolServiceMock.flattenSymbols.mockReturnValue(mockSymbols);

        await nodeManager.loadFileSymbols(fileNode);

        // No symbols should be included, as symbolsToInclude is empty
        expect(fileNode.children).toHaveLength(0);
    });

    it('should include multiple symbol kinds when symbolsToInclude has multiple entries', async () => {
        // Add both Function and Class to symbolsToInclude
        nodeManager['symbolsToInclude'].add('Class');

        const fileNode: ITreeNode = {
            label: 'file.ts',
            path: '/path/to/file.ts',
            type: NodeType.File,
            collapsibleState: 1,
            content: InclusionState.NotIncluded,
            isIntermediary: false,
            children: [],
        };

        const mockSymbols = [
            { name: 'functionSymbol', kind: vscode.SymbolKind.Function, location: {}, range: {}, children: [] } as any,
            { name: 'classSymbol', kind: vscode.SymbolKind.Class, location: {}, range: {}, children: [] } as any,
        ];

        symbolServiceMock.getFileSymbols.mockResolvedValue(mockSymbols);
        symbolServiceMock.flattenSymbols.mockReturnValue(mockSymbols);

        jest.spyOn(TreeNodeFactory, 'createSymbolNode')
            .mockImplementationOnce(() => ({
                label: 'functionSymbolNode',
                path: '/path/to/file.ts::functionSymbol',
                type: NodeType.Symbol,
                collapsibleState: 0,
                content: InclusionState.NotIncluded,
                isIntermediary: false,
                children: [],
                symbolKind: vscode.SymbolKind.Function,
            }))
            .mockImplementationOnce(() => ({
                label: 'classSymbolNode',
                path: '/path/to/file.ts::classSymbol',
                type: NodeType.Symbol,
                collapsibleState: 0,
                content: InclusionState.NotIncluded,
                isIntermediary: false,
                children: [],
                symbolKind: vscode.SymbolKind.Class,
            }));

        await nodeManager.loadFileSymbols(fileNode);

        // Both Function and Class symbols should be included
        expect(fileNode.children).toHaveLength(2);
        expect(fileNode.children![0].label).toBe('functionSymbolNode');
        expect(fileNode.children![1].label).toBe('classSymbolNode');
    });

    it('should not create symbol nodes if no symbols are found', async () => {
        const fileNode: ITreeNode = {
            label: 'file.ts',
            path: '/path/to/file.ts',
            type: NodeType.File,
            collapsibleState: 1,
            content: InclusionState.NotIncluded,
            isIntermediary: false,
            children: [],
        };

        symbolServiceMock.getFileSymbols.mockResolvedValue([]);
        symbolServiceMock.flattenSymbols.mockReturnValue([]);

        await nodeManager.loadFileSymbols(fileNode);

        expect(fileNode.children).toHaveLength(0);
    });

    it('should log an error if loading symbols fails', async () => {
        const fileNode: ITreeNode = {
            label: 'file.ts',
            path: '/path/to/file.ts',
            type: NodeType.File,
            collapsibleState: 1,
            content: InclusionState.NotIncluded,
            isIntermediary: false,
            children: [],
        };

        const loggerErrorSpy = jest.spyOn(nodeManager['logger'], 'error');
        symbolServiceMock.getFileSymbols.mockRejectedValue(new Error('Symbol service error'));

        await nodeManager.loadFileSymbols(fileNode);

        expect(loggerErrorSpy).toHaveBeenCalledWith('Error loading symbols for file "/path/to/file.ts": Symbol service error');
    });
});
