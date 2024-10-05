// src/services/response/DocstringService.ts

/**
 * This module provides the DocstringService class, which is responsible for generating 
 * and formatting docstrings based on user prompts. It utilizes state management through 
 * StateGraph and integrates with various services to perform its tasks.
 */

import { Annotation, START, StateGraph } from "@langchain/langgraph";
import { inject, injectable } from "inversify";
import { IDocstringService } from "../../interfaces/IDocstringService";
import TYPES from "../../inversify.types";
import { CoreLogger } from "../../logging/CoreLogger";
import { IChatModel } from "../../models/IChatModel";
import { ChatModelFactory } from "../../models/llm_models";
import { ModelConfig } from "../../models/ModelConfig";
import { ModelManager } from "../../models/ModelManager";

@injectable()
export class DocstringService implements IDocstringService {
    private logger = CoreLogger.getInstance({ loggerName: "DocstringService" });

    constructor(
        @inject(TYPES.ModelManager) private modelManager: ModelManager,
    ) { }

    // Define the state annotations for the StateGraph.
    private MyGraphState = Annotation.Root({
        generateDocstringsLogger: Annotation<CoreLogger>,
        formatDocstringsLogger: Annotation<CoreLogger>,
        userPrompt: Annotation<string>,
        generatedDocstrings: Annotation<string>,
        formattedDocstrings: Annotation<string>,
        modelConfig: Annotation<ModelConfig>,
        chatModel: Annotation<IChatModel>,
        updateResponse: Annotation<(message: string) => void>,
    });

    /**
     * Creates and compiles the state graph for generating and formatting docstrings.
     * 
     * @returns The compiled state graph application.
     */
    private createGraph() {
        const graph = new StateGraph(this.MyGraphState)
            .addNode("generateDocstringsNode", this.generateDocstringsNode.bind(this))
            .addNode("formatDocstringsNode", this.formatDocstringsNode.bind(this))
            .addEdge(START, "generateDocstringsNode")
            .addEdge("generateDocstringsNode", "formatDocstringsNode");
        const app = graph.compile();
        return app;
    }

    /**
     * Generates and formats docstrings based on the provided code prompt.
     *
     * @param prompt - The input code prompt for generating the docstrings.
     * @param updateResponse - Optional callback to update the response as it's being generated.
     * @returns A promise that resolves with the formatted docstrings.
     */
    public async generateDocstring(
        prompt: string,
        updateResponse?: (message: string) => void
    ): Promise<string> {
        try {
            this.logger.info("Starting docstrings generation...");

            await this.modelManager.prepareModelForConversation(false);
            const modelConfig = this.modelManager.modelConfig;
            const chatModel = ChatModelFactory.createChatModel();

            const inputs = {
                generateDocstringsLogger: CoreLogger.getInstance({
                    loggerName: "GenerateDocstringsNode",
                }),
                formatDocstringsLogger: CoreLogger.getInstance({
                    loggerName: "FormatDocstringsNode",
                }),
                userPrompt: prompt,
                modelConfig: modelConfig,
                chatModel: chatModel,
                updateResponse: updateResponse || (() => { }),
            };

            const state = await this.createGraph().invoke(inputs);

            // Return the formatted docstrings
            return state.formattedDocstrings;
        } catch (error) {
            this.logger.error("Error during docstrings generation:", error);
            throw error;
        }
    }

    /**
     * Node responsible for generating the docstrings using the AI model.
     * 
     * @param state - The current state of the graph containing necessary data for generation.
     * @returns A promise that resolves with the generated docstrings.
     */
    private async generateDocstringsNode(state: typeof this.MyGraphState.State) {
        const {
            modelConfig,
            generateDocstringsLogger,
            userPrompt,
            chatModel,
            updateResponse,
        } = state;

        generateDocstringsLogger.info(
            "Generating docstrings with prompt:",
            userPrompt
        );

        try {
            // Send the prompt to the model and get the response
            const chunks: string[] = [];
            const result = await chatModel.streamText({
                system: modelConfig.systemPrompt ?? undefined,
                prompt: userPrompt,
                maxTokens: modelConfig.maxTokens ?? undefined,
                topP: modelConfig.topP ?? undefined,
                temperature: modelConfig.temperature ?? undefined,
                abortSignal: undefined,
            });

            // Process the streamed response
            for await (const textPart of result.textStream) {
                updateResponse(textPart);
                chunks.push(textPart);
            }

            // Return the final response
            const response = chunks.join("");

            generateDocstringsLogger.info("Docstrings generated successfully.");

            // Update the state with the generated docstrings
            return { generatedDocstrings: response };
        } catch (error) {
            generateDocstringsLogger.error("Error generating docstrings:", error);
            throw error;
        }
    }

    /**
     * Node responsible for formatting the generated docstrings.
     * 
     * @param state - The current state of the graph containing the generated docstrings.
     * @returns A promise that resolves with the formatted docstrings.
     */
    private async formatDocstringsNode(state: typeof this.MyGraphState.State) {
        const { formatDocstringsLogger, generatedDocstrings } = state;

        formatDocstringsLogger.info("Formatting docstrings...");

        try {
            const formattedDocstrings = this.formatDocstring(generatedDocstrings);

            formatDocstringsLogger.info("Docstrings formatted successfully.");

            // Update the state with the formatted docstrings
            return { formattedDocstrings: formattedDocstrings };
        } catch (error) {
            formatDocstringsLogger.error("Error formatting docstrings:", error);
            throw error;
        }
    }

    /**
     * Formats the generated docstring by trimming unnecessary parts.
     * 
     * @param generatedDocstring - The raw generated docstring to format.
     * @returns The formatted docstring.
     */
    private formatDocstring(generatedDocstring: string): string {
        let trimmed = generatedDocstring.trim();
        let lines = trimmed.split(/\r?\n/);

        if (lines[0].trim().startsWith("```")) lines.shift();
        if (lines[lines.length - 1].trim().startsWith("```")) lines.pop();

        const formatted = lines.join("\n").trim();
        return formatted;
    }
}