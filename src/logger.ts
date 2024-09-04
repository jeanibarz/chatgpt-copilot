import * as fs from "fs";
import * as vscode from "vscode";

// Ensure configuration methods are imported if refactored

export enum LogLevel {
    Info = "INFO",
    Debug = "DEBUG",
    Warning = "WARNING",
    Error = "ERROR",
}

export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;
    private logFilePath?: string;

    private constructor(channelName: string, logFilePath?: string) {
        this.outputChannel = vscode.window.createOutputChannel(channelName);
        this.logFilePath = logFilePath;
    }

    public static getInstance(channelName: string = "DefaultLogger", logFilePath?: string): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(channelName, logFilePath);
        }
        return Logger.instance;
    }

    public logToFile(message: string) {
        if (this.logFilePath) {
            fs.appendFileSync(this.logFilePath, message + '\n');
        }
    }

    public logToOutputChannel(message: string) {
        this.outputChannel.appendLine(`${new Date().toISOString()} - ${message}`);
    }

    public log(level: LogLevel, message: string, properties?: any) {
        const formattedMessage = `${level} ${message} ${properties ? JSON.stringify(properties) : ""}`.trim();
        this.logToOutputChannel(formattedMessage);
        this.logToFile(formattedMessage);
    }

    public info(message: string, properties?: any) {
        this.log(LogLevel.Info, message, properties);
    }

    public warning(message: string, properties?: any) {
        this.log(LogLevel.Warning, message, properties);
    }

    public debug(message: string, properties?: any) {
        this.log(LogLevel.Debug, message, properties);
    }

    public error(message: string, properties?: any) {
        this.log(LogLevel.Error, message, properties);
    }

    public logError(error: any, context: string, showUserMessage: boolean = false): void {
        const message = error instanceof Error ? error.message : String(error);
        this.error(`Error in ${context}: ${message}`);

        if (showUserMessage) {
            vscode.window.showErrorMessage(`Error in ${context}: ${message}`);
        }
    }
}