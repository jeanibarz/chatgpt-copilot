import * as fs from 'fs';
import * as vscode from "vscode";
import { Logger, LogLevel } from "../src/logger";

jest.mock("fs", () => ({
    appendFileSync: jest.fn(),
}));

jest.mock("vscode", () => {
    const appendLineMock = jest.fn();
    const createOutputChannelMock = jest.fn(() => ({
        appendLine: appendLineMock,
    }));

    return {
        window: {
            createOutputChannel: createOutputChannelMock,
        },
    };
});

describe('Logger Tests', () => {
    let logger: Logger;
    let mockOutputChannel: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockOutputChannel = vscode.window.createOutputChannel("TestLogger");
        logger = Logger.getInstance("TestLogger", "test.log");
    });

    it('should log info messages correctly to output channel', () => {
        logger.info("This is an info message");

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining("INFO This is an info message"));
    });

    it('should log debug messages correctly to output channel', () => {
        logger.debug("This is a debug message");
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining("DEBUG This is a debug message"));
    });

    it('should log error messages correctly to output channel', () => {
        logger.error("This is an error message");
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining("ERROR This is an error message"));
    });

    it('should attempt to log to file if log file path is defined', () => {
        logger.info("Logging to file");
        expect(fs.appendFileSync).toHaveBeenCalled();
    });

    it('should format messages with additional properties correctly', () => {
        logger.info("Test info message", { key: "value" });
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('{"key":"value"}'));
    });

    it('should log messages with timestamps', () => {
        const message = "This message should contain a timestamp";
        logger.info(message);

        // Get the current time formatted to match the expected format with milliseconds
        const currentTime = new Date().toISOString(); // Includes milliseconds

        // Check if the message contains the expected string
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining(message));
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining(currentTime)); // Now matches with milliseconds
    });

    it('should log without throwing error if log file path is undefined', () => {
        const mockLoggerWithoutPath = Logger.getInstance("MockLoggerWithoutPath");
        expect(() => mockLoggerWithoutPath.logToFile("Test message")).not.toThrow();
    });

    it('should log different log levels correctly when using the same logger instance', () => {
        logger.info("First info message");
        logger.error("First error message");
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining("INFO"));
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining("ERROR"));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});
