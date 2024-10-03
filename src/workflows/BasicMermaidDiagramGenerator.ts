import { Annotation, START, StateGraph } from "@langchain/langgraph";
import { inject, injectable } from "inversify";
import { IChatModel } from "../interfaces";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { Utility } from "../Utility";
import { ChatGptViewProvider } from "../view";

/**
 * Define the state annotations for the StateGraph.
 */
const MyGraphState = Annotation.Root({
    generateMermaidDiagramLogger: Annotation<CoreLogger>,
    formatMermaidDiagramLogger: Annotation<CoreLogger>,
    userPrompt: Annotation<string>,
    generatedMermaidDiagram: Annotation<string>,
    formattedMermaidDiagram: Annotation<string>,
    provider: Annotation<ChatGptViewProvider>,
    chatModel: Annotation<IChatModel>,
    updateResponse: Annotation<(message: string) => void>,
});

@injectable()
export class MermaidDiagramResponseGenerator {
    private logger = CoreLogger.getInstance({ loggerName: "MermaidDiagramGenerator" });

    constructor(
        @inject(TYPES.IChatModel) private chatModel: IChatModel
    ) { }

    private createGraph() {
        const graph = new StateGraph(MyGraphState)
            .addNode("generateMermaidDiagramNode", this.generateMermaidDiagramNode)
            .addNode("formatMermaidDiagramNode", this.formatMermaidDiagramNode)
            .addEdge(START, "generateMermaidDiagramNode")
            .addEdge("generateMermaidDiagramNode", "formatMermaidDiagramNode");
        const app = graph.compile();
        return app;
    }

    /**
     * Generates and formats Mermaid diagrams for the entire file based on the provided code prompt.
     *
     * @param prompt - The input code prompt for generating the Mermaid diagram.
     * @param updateResponse - Callback to update the response as it's being generated.
     * @returns A promise that resolves when the Mermaid diagram generation and formatting are complete.
     */
    async generate(prompt: string, updateResponse: (message: string) => void): Promise<string> {
        try {
            // Retrieve the provider using the mediator service
            const provider = await Utility.getProvider();

            this.logger.info("Starting Mermaid diagram generation...");

            const inputs = {
                generateMermaidDiagramLogger: CoreLogger.getInstance({ loggerName: "GenerateMermaidDiagramNode" }),
                formatMermaidDiagramLogger: CoreLogger.getInstance({ loggerName: "FormatMermaidDiagramNode" }),
                userPrompt: prompt,
                provider: provider,
                chatModel: this.chatModel,
                updateResponse: updateResponse,
            };

            const state = await this.createGraph().invoke(inputs);

            // Return the formatted diagram
            return state.formattedMermaidDiagram;
        } catch (error) {
            this.logger.error("Error during Mermaid diagram generation:", error);
            throw error;
        }
    }

    /**
     * Node responsible for generating the Mermaid diagram using the AI model.
     * 
     * @param state - The current state of the graph containing necessary information for Mermaid diagram generation.
     * @returns An object containing the generated diagram.
     */
    private async generateMermaidDiagramNode(state: typeof MyGraphState.State) {
        const { provider, generateMermaidDiagramLogger, userPrompt, chatModel, updateResponse } = state;

        generateMermaidDiagramLogger.info("Generating Mermaid diagram with prompt:", userPrompt);

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

            generateMermaidDiagramLogger.info("Mermaid Diagram generated successfully.");

            // Update the state with the generated diagram
            return { generatedMermaidDiagram: response };
        } catch (error) {
            generateMermaidDiagramLogger.error("Error generating Mermaid diagram:", error);
            throw error;
        }
    }

    /**
     * Node responsible for formatting the generated Mermaid diagram.
     * 
     * @param state - The current state of the graph containing the generated Mermaid diagram.
     * @returns An object containing the formatted diagram.
     */
    private async formatMermaidDiagramNode(state: typeof MyGraphState.State) {
        const { formatMermaidDiagramLogger, generatedMermaidDiagram } = state;

        formatMermaidDiagramLogger.info("Formatting Mermaid diagram...");

        try {
            let trimmedMermaidDiagram = generatedMermaidDiagram.trim();
            let lines = trimmedMermaidDiagram.split(/\r?\n/);

            // Remove surrounding backticks or code fences
            if (lines[0].trim().startsWith('```')) lines.shift();
            if (lines[lines.length - 1].trim().startsWith('```')) lines.pop();

            const formattedDiagram = lines.join('\n').trim();

            // Wrap the formatted diagram in a Mermaid code block
            let finalFormattedDiagram = formattedDiagram;
            if (!formattedDiagram.startsWith("```mermaid")) {
                finalFormattedDiagram = `\`\`\`mermaid\n${formattedDiagram}\n\`\`\``;
            }

            formatMermaidDiagramLogger.info("Mermaid Diagram formatted successfully.");

            // Update the state with the formatted diagram
            return { formattedMermaidDiagram: finalFormattedDiagram };
        } catch (error) {
            formatMermaidDiagramLogger.error("Error formatting Mermaid diagram:", error);
            throw error;
        }
    }
}
