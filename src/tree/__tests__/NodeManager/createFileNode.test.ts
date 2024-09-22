import { ITreeNode, InclusionState, NodeType } from '../../../interfaces';
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
}));

describe('NodeManager.createFileNode', () => {
    let nodeManager: NodeManager;
    let symbolServiceMock: jest.Mocked<SymbolService>;

    beforeEach(() => {
        symbolServiceMock = new SymbolService() as jest.Mocked<SymbolService>;
        const explicitFilesManagerMock = {} as any;
        nodeManager = new NodeManager(symbolServiceMock, explicitFilesManagerMock);
    });

    it('should create a file node without symbols', async () => {
        symbolServiceMock.hasFileSymbols.mockResolvedValue(false);
        const createFileNodeSpy = jest.spyOn(TreeNodeFactory, 'createFileNode').mockReturnValue({
            label: 'file.ts',
            path: '/path/to/file.ts',
            type: NodeType.File,
            collapsibleState: 0,
            content: InclusionState.NotIncluded,
            isIntermediary: false,
            children: [],
        } as ITreeNode);

        const fileNode = await nodeManager.createFileNode('file.ts', '/path/to/file.ts');

        expect(fileNode).not.toBeNull();
        expect(fileNode?.children).toEqual([]);
        expect(createFileNodeSpy).toHaveBeenCalledWith('file.ts', '/path/to/file.ts', false, InclusionState.NotIncluded);
    });

    it('should create a file node with symbols', async () => {
        symbolServiceMock.hasFileSymbols.mockResolvedValue(true);
        const createFileNodeSpy = jest.spyOn(TreeNodeFactory, 'createFileNode').mockReturnValue({
            label: 'file.ts',
            path: '/path/to/file.ts',
            type: NodeType.File,
            collapsibleState: 1, // Collapsed for symbol node
            content: InclusionState.NotIncluded,
            isIntermediary: false,
            children: [],
        } as ITreeNode);

        const loadFileSymbolsSpy = jest.spyOn<any, any>(nodeManager, 'loadFileSymbols').mockImplementation(() => Promise.resolve());

        const fileNode = await nodeManager.createFileNode('file.ts', '/path/to/file.ts');

        expect(fileNode).not.toBeNull();
        expect(loadFileSymbolsSpy).toHaveBeenCalledWith(fileNode);
        expect(createFileNodeSpy).toHaveBeenCalledWith('file.ts', '/path/to/file.ts', true, InclusionState.NotIncluded);
    });

    it('should log an error and return null if symbol service fails', async () => {
        symbolServiceMock.hasFileSymbols.mockRejectedValue(new Error('Symbol service failed'));
        const loggerErrorSpy = jest.spyOn(nodeManager['logger'], 'error');

        const fileNode = await nodeManager.createFileNode('file.ts', '/path/to/file.ts');

        expect(fileNode).toBeNull();
        expect(loggerErrorSpy).toHaveBeenCalledWith('Error creating file node for "/path/to/file.ts": Symbol service failed');
    });
});
