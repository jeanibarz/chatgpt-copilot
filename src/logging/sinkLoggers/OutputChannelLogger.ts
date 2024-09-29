// src/logging/sinkLoggers/OutputChannelLogger.ts

/**
 * This module provides the OutputChannelLogger class, which allows 
 * logging capabilities using the VS Code output channel. It formats 
 * and displays log messages at various levels of severity.
 */

import * as vscode from "vscode";
import { ISinkLogger } from "../../interfaces/ISinkLogger";

/**
 * The OutputChannelLogger class provides logging capabilities using the
 * VS Code output channel. It formats and displays log messages at various
 * levels of severity.
 */
export class OutputChannelLogger implements ISinkLogger {
    private outputChannel: vscode.OutputChannel;
    private channelName: string;

    /**
     * Constructor for the OutputChannelLogger class.
     * Initializes the output channel for logging messages.
     * 
     * @param channelName - The name of the output channel to be created.
     */
    constructor(channelName: string) {
        this.channelName = channelName;
        this.outputChannel = vscode.window.createOutputChannel(channelName);
    }

    /**
     * Logs a message to the output channel with a timestamp.
     * 
     * @param message - The message to log.
     */
    public log(message: string) {
        this.outputChannel.appendLine(`${new Date().toISOString()} - ${message}`);
    }

    /**
     * Retrieves the name of the output channel.
     * 
     * @returns The name of the output channel.
     */
    public getChannelName(): string {
        return this.channelName;
    }
}