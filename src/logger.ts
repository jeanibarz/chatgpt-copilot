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
}