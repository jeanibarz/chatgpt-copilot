import { ITreeNode, InclusionState } from '../../../interfaces';
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

describe('NodeManager.determineInclusionState', () => {
    let nodeManager: NodeManager;

    beforeEach(() => {
        const symbolServiceMock = {} as any;
        const explicitFilesManagerMock = {} as any;
        nodeManager = new NodeManager(symbolServiceMock, explicitFilesManagerMock);
    });

    it('should return Included if all children are included', () => {
        const children: ITreeNode[] = [
            { content: InclusionState.Included } as ITreeNode,
            { content: InclusionState.Included } as ITreeNode,
        ];

        const result = nodeManager.determineInclusionState(children);
        expect(result).toBe(InclusionState.Included);
    });

    it('should return NotIncluded if all children are not included', () => {
        const children: ITreeNode[] = [
            { content: InclusionState.NotIncluded } as ITreeNode,
            { content: InclusionState.NotIncluded } as ITreeNode,
        ];

        const result = nodeManager.determineInclusionState(children);
        expect(result).toBe(InclusionState.NotIncluded);
    });

    it('should return PartiallyIncluded if some children are included and others are not', () => {
        const children: ITreeNode[] = [
            { content: InclusionState.Included } as ITreeNode,
            { content: InclusionState.NotIncluded } as ITreeNode,
        ];

        const result = nodeManager.determineInclusionState(children);
        expect(result).toBe(InclusionState.PartiallyIncluded);
    });
});
