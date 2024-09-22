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

describe('NodeManager.findNodeByPath', () => {
    let nodeManager: NodeManager;

    beforeEach(() => {
        const symbolServiceMock = {} as any;
        const explicitFilesManagerMock = {} as any;
        nodeManager = new NodeManager(symbolServiceMock, explicitFilesManagerMock);
    });

    it('should return the correct node if it exists and is not intermediary', () => {
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

        const result = nodeManager.findNodeByPath(path);
        expect(result).toEqual(node);
    });

    it('should return undefined if node is intermediary and includeIntermediary is false', () => {
        const path = '/path/to/intermediary';
        const intermediaryNode: ITreeNode = {
            label: 'IntermediaryNode',
            path: path,
            type: NodeType.File,
            collapsibleState: 0,
            content: InclusionState.NotIncluded,
            isIntermediary: true,
            children: [],
        };
        nodeManager.registerNode(path, intermediaryNode);

        const result = nodeManager.findNodeByPath(path);
        expect(result).toBeUndefined();
    });

    it('should return the node even if it is intermediary when includeIntermediary is true', () => {
        const path = '/path/to/intermediary';
        const intermediaryNode: ITreeNode = {
            label: 'IntermediaryNode',
            path: path,
            type: NodeType.File,
            collapsibleState: 0,
            content: InclusionState.NotIncluded,
            isIntermediary: true,
            children: [],
        };
        nodeManager.registerNode(path, intermediaryNode);

        const result = nodeManager.findNodeByPath(path, true);
        expect(result).toEqual(intermediaryNode);
    });
});
