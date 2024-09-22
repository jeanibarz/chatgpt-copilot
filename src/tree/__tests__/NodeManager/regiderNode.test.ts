import { InclusionState, ITreeNode, NodeType } from '../../../interfaces';
import { NodeManager } from '../../NodeManager';

// Mock the vscode API
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        })),
    },
}));

describe('NodeManager.registerNode', () => {
    let nodeManager: NodeManager;

    beforeEach(() => {
        const symbolServiceMock = {} as any;
        const explicitFilesManagerMock = {} as any;
        nodeManager = new NodeManager(symbolServiceMock, explicitFilesManagerMock);
    });

    it('should register a node correctly in the nodePathMap', () => {
        const path = '/path/to/node';
        const node: ITreeNode = {
            label: 'TestNode',
            path: path,
            type: NodeType.File,
            collapsibleState: 0,
            content: InclusionState.NotIncluded,
            isIntermediary: false,
            children: [],
        };

        nodeManager.registerNode(path, node);

        const result = nodeManager.getNode(path);
        expect(result).toEqual(node);
    });
});
