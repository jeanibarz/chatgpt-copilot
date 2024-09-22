import { ILogger } from '../../interfaces/ILogger';
import { BaseModelNormalizer } from '../../models/normalizers/BaseModelNormalizer';

// Mock the ILogger interface
const loggerMock: jest.Mocked<ILogger> = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    logError: jest.fn(),
};

// Create a concrete subclass for testing
class TestModelNormalizer extends BaseModelNormalizer {
    // Implement the abstract normalize method
    public normalize(modelType: string): string | null {
        if (modelType === 'TestModel') {
            return 'NormalizedTestModel';
        }
        return null;
    }
}

describe('BaseModelNormalizer', () => {
    let normalizer: TestModelNormalizer;

    beforeEach(() => {
        // Instantiate the TestModelNormalizer with the mocked logger
        normalizer = new TestModelNormalizer(loggerMock);
    });

    afterEach(() => {
        jest.clearAllMocks(); // Clear mock calls between tests
    });

    it('should log successful normalization', () => {
        const modelType = 'TestModel';
        const normalizedType = normalizer.normalize(modelType);

        // Call the protected logNormalization method
        normalizer['logNormalization'](modelType, normalizedType);

        // Check if the logger's info method was called with the right arguments
        expect(loggerMock.info).toHaveBeenCalledWith(`Normalized model type: ${modelType} to ${normalizedType}`);
    });

    it('should log warning if normalization is not found', () => {
        const modelType = 'UnknownModel';
        const normalizedType = normalizer.normalize(modelType);

        // Call the protected logNormalization method
        normalizer['logNormalization'](modelType, normalizedType);

        // Check if the logger's warn method was called with the right arguments
        expect(loggerMock.warn).toHaveBeenCalledWith(`No normalization found for model type: ${modelType}`);
    });
});
