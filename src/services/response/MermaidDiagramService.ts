// src/services/response/MermaidDiagramService.ts

import { Annotation, START, StateGraph } from "@langchain/langgraph";
import * as fs from 'fs';
import { inject, injectable } from "inversify";
import * as path from 'path';
import * as vscode from 'vscode';
import { PromptType } from "../../constants/PromptType";
import { IMermaidDiagramService } from "../../interfaces/IMermaidDiagramService";
import TYPES from "../../inversify.types";
import { CoreLogger } from "../../logging/CoreLogger";
import { IChatModel } from "../../models/IChatModel";
import { ChatModelFactory } from "../../models/llm_models";
import { ModelConfig } from "../../models/ModelConfig";
import { ModelManager } from "../../models/ModelManager";
import { StateManager } from "../../state/StateManager";

@injectable()
export class MermaidDiagramService implements IMermaidDiagramService {
    private logger = CoreLogger.getInstance({ loggerName: "MermaidDiagramService" });

    constructor(
        @inject(TYPES.ModelManager) private modelManager: ModelManager,
    ) { }

    // Define the state annotations for the StateGraph.
    private MyGraphState = Annotation.Root({
        readFileLogger: Annotation<CoreLogger>,
        generateDiagramLogger: Annotation<CoreLogger>,
        formatDiagramLogger: Annotation<CoreLogger>,
        saveDiagramLogger: Annotation<CoreLogger>,
        errorLogger: Annotation<CoreLogger>,
        userPrompt: Annotation<string>,
        fileContent: Annotation<string>,
        generatedDiagram: Annotation<string>,
        formattedDiagram: Annotation<string>,
        modelConfig: Annotation<ModelConfig>,
        chatModel: Annotation<IChatModel>,
        updateResponse: Annotation<(message: string) => void>,
    });

    private createGraph() {
        const graph = new StateGraph(this.MyGraphState)
            .addNode("readFileNode", this.readFileNode.bind(this))
            .addNode("generateDiagramNode", this.generateDiagramNode.bind(this))
            .addNode("formatDiagramNode", this.formatDiagramNode.bind(this))
            .addEdge(START, "readFileNode")
            .addEdge("readFileNode", "generateDiagramNode")
            .addEdge("generateDiagramNode", "formatDiagramNode");
        return graph.compile();
    }

    /**
     * Generates and formats a mermaid diagram based on the provided code prompt.
     *
     * @param prompt - The input code prompt for generating the diagram.
     * @param updateResponse - Optional callback to update the response as it's being generated.
     * @returns A promise that resolves with the formatted mermaid diagram.
     */
    public async generateDiagram(
        filePath: string,
        updateResponse?: (message: string) => void,
    ): Promise<string> {
        try {
            this.logger.info("Starting mermaid diagram generation...");

            await this.modelManager.prepareModelForConversation(false);
            const modelConfig = this.modelManager.modelConfig;
            const chatModel = ChatModelFactory.createChatModel();

            const inputs = {
                readFileLogger: CoreLogger.getInstance({ loggerName: "ReadFileNode" }),
                generateDiagramLogger: CoreLogger.getInstance({ loggerName: "GenerateDiagramNode" }),
                formatDiagramLogger: CoreLogger.getInstance({ loggerName: "FormatDiagramNode" }),
                saveDiagramLogger: CoreLogger.getInstance({ loggerName: "SaveDiagramNode" }),
                errorLogger: CoreLogger.getInstance({ loggerName: "ErrorNode" }),
                userPrompt: filePath,
                modelConfig: modelConfig,
                chatModel: chatModel,
                updateResponse: updateResponse || (() => { }),
            };

            const state = await this.createGraph().invoke(inputs);
            return state.formattedDiagram;
        } catch (error) {
            this.logger.error("Error during mermaid diagram generation:", error);
            throw error;
        }
    }

    public async processMultipleFiles(
        fileUris: vscode.Uri[],
        outputFolder: vscode.Uri,
        logMessages: string[] = []
    ): Promise<void> {
        const fileProcessingPromises = fileUris.map(async (fileUri) => {
            await this.processFile(fileUri, outputFolder, logMessages);
        });

        try {
            await Promise.all(fileProcessingPromises);
        } catch (error) {
            this.logger.error(`Error processing multiple files: ${(error as Error).message}`);
            throw error;
        }
    }


    /**
     * Recursively retrieves all file URIs within the specified folder.
     *
     * @param folderUri - The URI of the folder to traverse.
     * @returns A promise that resolves to an array of file URIs.
     */
    public async getAllFilesInFolder(folderUri: vscode.Uri): Promise<vscode.Uri[]> {
        let fileUris: vscode.Uri[] = [];
        const entries = await vscode.workspace.fs.readDirectory(folderUri);

        for (const [name, type] of entries) {
            const entryUri = vscode.Uri.joinPath(folderUri, name);

            if (type === vscode.FileType.Directory) {
                const subFiles = await this.getAllFilesInFolder(entryUri);
                fileUris = fileUris.concat(subFiles);
            } else if (type === vscode.FileType.File) {
                fileUris.push(entryUri);
            }
        }

        return fileUris;
    }

    // Helper method to process a file with progress updates
    public async processFile(
        fileUri: vscode.Uri,
        outputFolder: vscode.Uri,
        logMessages: string[]
    ): Promise<void> {
        try {
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const fileText = Buffer.from(fileContent).toString('utf-8');

            if (!fileText) {
                logMessages.push(`No content found in file: ${fileUri.fsPath}`);
                return;
            }

            const diagramContent = await this.generateDiagram(fileUri.fsPath);

            const saveSuccess = await this.saveDiagramToFile(
                fileUri,
                diagramContent,
                outputFolder,
                logMessages
            );

            if (!saveSuccess) {
                logMessages.push(`Failed to save diagram for file: ${fileUri.fsPath}`);
            } else {
                logMessages.push(`Successfully processed file: ${fileUri.fsPath}`);
            }

        } catch (error) {
            logMessages.push(`Error processing file ${fileUri.fsPath}: ${(error as Error).message}`);
        }
    }

    /**
     * Node responsible for reading the file.
     */
    private async readFileNode(state: typeof this.MyGraphState.State) {
        const { userPrompt, readFileLogger } = state;
        readFileLogger.info("Reading file content...");
        try {
            const fileUri = vscode.Uri.file(userPrompt);
            const fileContentUint8Array = await vscode.workspace.fs.readFile(fileUri);
            const fileContent = Buffer.from(fileContentUint8Array).toString('utf-8');
            readFileLogger.info("File content successfully read.");
            return { fileContent };
        } catch (error) {
            readFileLogger.error("Error reading file:", error);
            throw error;
        }
    }

    /**
     * Node responsible for generating the mermaid diagram using the AI model.
     */
    private async generateDiagramNode(state: typeof this.MyGraphState.State) {
        const {
            modelConfig,
            generateDiagramLogger,
            fileContent,
            chatModel,
            updateResponse,
        } = state;

        generateDiagramLogger.info("Generating mermaid diagram with prompt...");

        try {
            const userPrompt = StateManager.getInstance().getPromptStateManager().getPrompt(PromptType.UserGenerateMermaidDiagram);
            const prompt = `${userPrompt}\n\n${fileContent}\n\n`;
            const chunks: string[] = [];
            const result = await chatModel.streamText({
                system: modelConfig.systemPrompt ?? undefined,
                prompt: prompt,
                maxTokens: modelConfig.maxTokens ?? undefined,
                topP: modelConfig.topP ?? undefined,
                temperature: modelConfig.temperature ?? undefined,
                abortSignal: undefined,
            });

            for await (const textPart of result.textStream) {
                updateResponse(textPart);
                chunks.push(textPart);
            }

            const response = chunks.join("");
            generateDiagramLogger.info("Mermaid diagram generated successfully.");

            return { generatedDiagram: response };
        } catch (error) {
            generateDiagramLogger.error("Error generating mermaid diagram:", error);
            throw error;
        }
    }

    /**
     * Node responsible for formatting the generated mermaid diagram.
     */
    private async formatDiagramNode(state: typeof this.MyGraphState.State) {
        const { formatDiagramLogger, generatedDiagram } = state;

        formatDiagramLogger.info("Formatting mermaid diagram...");

        try {
            const formattedDiagram = this.formatMermaidDiagram(generatedDiagram);
            formatDiagramLogger.info("Mermaid diagram formatted successfully.");
            return { formattedDiagram };
        } catch (error) {
            formatDiagramLogger.error("Error formatting mermaid diagram:", error);
            throw error;
        }
    }

    private formatMermaidDiagram(diagram: string): string {
        const trimmedDiagram = diagram.trim();
        if (!trimmedDiagram.startsWith("```mermaid")) {
            return `\`\`\`mermaid\n${trimmedDiagram}\n\`\`\``;
        }
        return trimmedDiagram;
    }

    private async saveDiagramToFile(
        fileUri: vscode.Uri,
        diagramContent: string,
        outputFolder: vscode.Uri,
        logMessages: string[]
    ): Promise<boolean> {
        const rootPath = vscode.workspace.getWorkspaceFolder(fileUri)?.uri.fsPath;
        if (!rootPath) {
            logMessages.push('No workspace folder is open.');
            return false;
        }

        const relativePath = path.relative(rootPath, fileUri.fsPath);
        const parsedPath = path.parse(relativePath);

        // Replace directory separators with underscores and sanitize
        const safeDir = parsedPath.dir.replace(/[\/\\]/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
        const safeName = parsedPath.name.replace(/[^a-zA-Z0-9_\-]/g, '');

        const diagramFileNameWithExt = `${safeDir}_${safeName}${parsedPath.ext}.md`;

        const diagramFilePath = path.join(outputFolder.fsPath, diagramFileNameWithExt); // Use Option 1 or Option 2

        try {
            if (!fs.existsSync(outputFolder.fsPath)) {
                fs.mkdirSync(outputFolder.fsPath, { recursive: true });
            }

            fs.writeFileSync(diagramFilePath, diagramContent, 'utf-8');
            logMessages.push(`Diagram saved to ${path.relative(rootPath, diagramFilePath)}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to save diagram: ${(error as Error).message}`);
            logMessages.push(`Failed to save diagram for ${fileUri.fsPath}: ${(error as Error).message}`);
            return false;
        }
    }
}
