// src/services/DocstringExtractor.test.ts

import { CoreLogger } from '../logging/CoreLogger';
import { DocstringExtractor } from './DocstringExtractor';
import { FileManager } from './FileManager';

describe('DocstringExtractor', () => {
    let fileManager: FileManager;
    let docstringExtractor: DocstringExtractor;
    let mockCoreLogger: jest.Mocked<CoreLogger>;

    beforeEach(() => {
        // Manually create a mock for CoreLogger
        mockCoreLogger = {
            getLoggerName: jest.fn().mockReturnValue('testLogger'),
            getChannelName: jest.fn().mockReturnValue('testChannel'),
            removeFromRegistry: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
            logError: jest.fn(),
        } as unknown as jest.Mocked<CoreLogger>;

        // Initialize the FileManager with the mocked CoreLogger
        fileManager = new FileManager(mockCoreLogger);

        // Initialize the DocstringExtractor with the mocked FileManager
        docstringExtractor = new DocstringExtractor(fileManager);
    });

    it('should extract module-level docstrings from ConfigurationManager.ts', async () => {
        // Define the mock file path
        const mockFilePath = './ConfigurationManager.ts';

        // Mock the readFileContent method to return the ConfigurationManager.ts content
        jest.spyOn(fileManager, 'readFileContent').mockImplementation((filePath: string) => {
            if (filePath === mockFilePath) {
                return `
/**
 * This module provides a configuration management system for use within a VS Code extension.
 * It handles loading and managing application settings and configurations, particularly 
 * related to the model and response settings for the extension.
 * 
 * The \`ConfigurationManager\` class is responsible for loading the configuration from the 
 * underlying configuration files and making it accessible to other components of the extension. 
 * It utilizes a logger to log configuration loading events and errors, ensuring that the 
 * state of the configuration can be monitored effectively.
 * 
 * Key Features:
 * - Loads configuration settings from the VS Code configuration.
 * - Integrates with the \`ModelManager\` to manage model-related settings.
 * - Provides methods to access workspace configuration and specific settings.
 * - Logs configuration loading events for better observability.
 * 
 * Usage:
 * - The \`loadConfiguration\` method initializes various configuration flags and settings 
 *   based on the loaded values.
 * - The \`getWorkspaceConfiguration\` method retrieves the workspace configuration 
 *   object for the "chatgpt" extension.
 */

import { getConfig, getRequiredConfig } from "../config/Configuration";
import { CoreLogger } from "../CoreLogger";
import { ModelManager } from "./ModelManager";

// Rest of the file content...
                `;
            }
            return '';
        });

        // Define the list of mock files (only one in this case)
        const mockFiles = [mockFilePath];

        // Call the method to extract docstrings
        const result = await docstringExtractor.extractModuleDocstrings(mockFiles);

        // Define the expected docstring
        const expectedDocstring = `
/**
 * This module provides a configuration management system for use within a VS Code extension.
 * It handles loading and managing application settings and configurations, particularly 
 * related to the model and response settings for the extension.
 * 
 * The \`ConfigurationManager\` class is responsible for loading the configuration from the 
 * underlying configuration files and making it accessible to other components of the extension. 
 * It utilizes a logger to log configuration loading events and errors, ensuring that the 
 * state of the configuration can be monitored effectively.
 * 
 * Key Features:
 * - Loads configuration settings from the VS Code configuration.
 * - Integrates with the \`ModelManager\` to manage model-related settings.
 * - Provides methods to access workspace configuration and specific settings.
 * - Logs configuration loading events for better observability.
 * 
 * Usage:
 * - The \`loadConfiguration\` method initializes various configuration flags and settings 
 *   based on the loaded values.
 * - The \`getWorkspaceConfiguration\` method retrieves the workspace configuration 
 *   object for the "chatgpt" extension.
 */
        `.trim();

        // Assertions
        expect(result).toEqual([
            {
                filePath: mockFilePath,
                docstring: expectedDocstring,
            },
        ]);
        expect(result.length).toBe(1); // Ensure only one docstring was extracted
    });
});
