/**
 * src/workflows/BasicDocstringGenerator.ts
 * 
 * This module provides functionality for generating and formatting docstrings
 * for an entire file using an AI model within a VS Code extension. The `DocstringsResponseGenerator` class
 * utilizes a StateGraph with two nodes to manage the generation and formatting processes.
 *
 * Key Features:
 * - Generates docstrings for all functions/classes in a file by sending prompts to the AI model.
 * - Formats generated docstrings to remove unnecessary annotations.
 * - Integrates with a logger for event tracking and debugging.
 */

import { Annotation, START, StateGraph } from "@langchain/langgraph";
import { IChatModel } from "../interfaces";
import { CoreLogger } from "../logging/CoreLogger";
import { ChatGptViewProvider } from "../view/ChatGptViewProvider";

/**
 * Define the state annotations for the StateGraph.
 */
const MyGraphState = Annotation.Root({
    generateDocstringsLogger: Annotation<CoreLogger>,
    formatDocstringsLogger: Annotation<CoreLogger>,
    userPrompt: Annotation<string>,
    generatedDocstrings: Annotation<string>,
    formattedDocstrings: Annotation<string>,
    provider: Annotation<ChatGptViewProvider>,
    chatModel: Annotation<IChatModel>,
    updateResponse: Annotation<(message: string) => void>,
});

/**
 * The `DocstringsResponseGenerator` class uses a StateGraph to manage the docstrings generation
 * and formatting processes. It interacts with an AI model to generate docstrings based on the
 * provided code prompt and then formats the output.
 */
export class DocstringsResponseGenerator {
    private logger: CoreLogger;

    /**
     * Constructor for the `DocstringsResponseGenerator` class.
     * Initializes a new instance of the generator with the provided view provider and chat model.
     *
     * @param provider - An instance of `ChatGptViewProvider` for accessing view-related settings.
     * @param chatModel - An instance of `IChatModel` for interacting with the AI model.
     */
    constructor(private provider: ChatGptViewProvider, private chatModel: IChatModel) {
        this.logger = CoreLogger.getInstance({ loggerName: "DocstringsGenerator" });
    }

    private createGraph() {
        const graph = new StateGraph(MyGraphState)
            .addNode("generateDocstringsNode", this.generateDocstringsNode)
            .addNode("formatDocstringsNode", this.formatDocstringsNode)
            .addEdge(START, "generateDocstringsNode")
            .addEdge("generateDocstringsNode", "formatDocstringsNode");
        const app = graph.compile();
        return app;
    }

    /**
     * Generates and formats docstrings for the entire file based on the provided code prompt.
     *
     * @param prompt - The input code prompt for generating the docstrings.
     * @param updateResponse - Callback to update the response as it's being generated.
     * @returns A promise that resolves when the docstrings generation and formatting are complete.
     */
    async generate(prompt: string, updateResponse: (message: string) => void): Promise<string> {
        try {
            this.logger.info("Starting docstrings generation...");

            const inputs = {
                generateDocstringsLogger: CoreLogger.getInstance({ loggerName: "GenerateDocstringsNode" }),
                formatDocstringsLogger: CoreLogger.getInstance({ loggerName: "FormatDocstringsNode" }),
                userPrompt: prompt,
                provider: this.provider,
                chatModel: this.chatModel,
                updateResponse: updateResponse,
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
     * @param state - The current state of the graph containing necessary information for docstring generation.
     * @returns An object containing the generated docstrings.
     */
    async generateDocstringsNode(state: typeof MyGraphState.State) {
        const { provider, generateDocstringsLogger, userPrompt, chatModel, updateResponse } = state;

        generateDocstringsLogger.info("Generating docstrings with prompt:", userPrompt);

        try {
            // Send the prompt to the model and get the response
            const chunks = [];
            const result = await chatModel.streamText({
                system: provider.modelManager.modelConfig.systemPrompt,
                prompt: userPrompt,
                maxTokens: provider.modelManager.modelConfig.maxTokens,
                topP: provider.modelManager.modelConfig.topP,
                temperature: provider.modelManager.modelConfig.temperature,
                abortSignal: provider.abortController ? provider.abortController.signal : undefined,
            });

            // Process the streamed response
            for await (const textPart of result.textStream) {
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
     * @returns An object containing the formatted docstrings.
     */
    async formatDocstringsNode(state: typeof MyGraphState.State) {
        const { formatDocstringsLogger, generatedDocstrings } = state;

        formatDocstringsLogger.info("Formatting docstrings...");

        try {
            let trimmedDocstrings = generatedDocstrings.trim();
            let lines = trimmedDocstrings.split(/\r?\n/);

            // Remove surrounding backticks or code fences
            if (lines[0].trim().startsWith('```')) lines.shift();
            if (lines[lines.length - 1].trim().startsWith('```')) lines.pop();

            const formattedDocstrings = lines.join('\n').trim();

            formatDocstringsLogger.info("Docstrings formatted successfully.");

            // Update the state with the formatted docstrings
            return { formattedDocstrings: formattedDocstrings };
        } catch (error) {
            formatDocstringsLogger.error("Error formatting docstrings:", error);
            throw error;
        }
    }
}