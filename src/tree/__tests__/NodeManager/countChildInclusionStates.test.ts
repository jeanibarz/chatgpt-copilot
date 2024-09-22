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

describe('NodeManager.countChildInclusionStates', () => {
    let nodeManager: NodeManager;

    beforeEach(() => {
        const symbolServiceMock = {} as any;
        const explicitFilesManagerMock = {} as any;
        nodeManager = new NodeManager(symbolServiceMock, explicitFilesManagerMock);
    });

    it('should correctly count included and not included children', () => {
        const children: ITreeNode[] = [
            { content: InclusionState.Included } as ITreeNode,
            { content: InclusionState.NotIncluded } as ITreeNode,
            { content: InclusionState.PartiallyIncluded } as ITreeNode,
        ];

        const result = nodeManager['countChildInclusionStates'](children);
        expect(result).toEqual({ includedCount: 2, notIncludedCount: 2 });
    });

    it('should return zero counts when there are no children', () => {
        const children: ITreeNode[] = [];

        const result = nodeManager['countChildInclusionStates'](children);
        expect(result).toEqual({ includedCount: 0, notIncludedCount: 0 });
    });

    it('should handle cases where all children are included', () => {
        const children: ITreeNode[] = [
            { content: InclusionState.Included } as ITreeNode,
            { content: InclusionState.Included } as ITreeNode,
        ];

        const result = nodeManager['countChildInclusionStates'](children);
        expect(result).toEqual({ includedCount: 2, notIncludedCount: 0 });
    });

    it('should handle cases where all children are not included', () => {
        const children: ITreeNode[] = [
            { content: InclusionState.NotIncluded } as ITreeNode,
            { content: InclusionState.NotIncluded } as ITreeNode,
        ];

        const result = nodeManager['countChildInclusionStates'](children);
        expect(result).toEqual({ includedCount: 0, notIncludedCount: 2 });
    });
});
