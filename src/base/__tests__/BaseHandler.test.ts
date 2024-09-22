import { ILogger } from '../../interfaces/ILogger';
import { BaseHandler } from '../BaseHandler';

// Mock ILogger interface with all methods
const loggerMock: jest.Mocked<ILogger> = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    logError: jest.fn(),
};

// Create a concrete subclass for testing
class TestHandler extends BaseHandler<string> {
    // Implement the abstract execute method
    public async execute(data: string): Promise<void> {
        // For testing, this can be left empty
    }
}

describe('BaseHandler', () => {
    let handler: TestHandler;

    beforeEach(() => {
        // Instantiate the TestHandler with the mocked logger
        handler = new TestHandler(loggerMock);
    });

    afterEach(() => {
        jest.clearAllMocks(); // Clear mock calls between tests
    });

    it('should log an error using handleError', () => {
        const error = new Error('Test error');

        // Call the protected method handleError
        handler['handleError'](error); // Access the protected method

        // Check if the logger's logError method was called with the right arguments
        expect(loggerMock.logError).toHaveBeenCalledWith(error, 'BaseHandler');
    });
});
