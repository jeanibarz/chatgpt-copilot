/**
 * src/workflows/BasicResponseGenerator.ts
 * 
 * This module defines the BasicResponseGenerator class, which is responsible for 
 * generating responses to user questions by utilizing a state graph. It integrates 
 * with various components like chat models and logging utilities to facilitate 
 * the generation of AI-driven responses within a conversational context.
 * 
 * Key Features:
 * - Utilizes a state graph to manage the flow of data and responses.
 * - Integrates with chat models to generate answers based on user input.
 * - Provides detailed logging for tracking the response generation process.
 */

import { Annotation, START, StateGraph } from "@langchain/langgraph";
import { CoreMessage } from 'ai';
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
    generateAnswerNodeLogger: Annotation<CoreLogger>,
    previousMessages: Annotation<CoreMessage[]>,
    userQuestion: Annotation<string>,
    answer: Annotation<string>,
    provider: Annotation<ChatGptViewProvider>,
    chatModel: Annotation<IChatModel>,
    updateResponse: Annotation<(message: string) => void>,
});

/**
 * The BasicResponseGenerator class is responsible for generating responses 
 * to user questions by utilizing a state graph and interacting with chat models.
 * 
 * Key Responsibilities:
 * - Manages the creation and invocation of a state graph for response generation.
 * - Logs relevant information during the response generation process.
 * - Integrates with chat models to produce AI-generated responses based on user input.
 */
@injectable()
export class BasicResponseGenerator {
    private logger = CoreLogger.getInstance({ loggerName: "BasicResponseGenerator" });

    constructor(
        @inject(TYPES.IChatModel) private chatModel: IChatModel
    ) { }

    /**
     * Creates a new state graph for managing the response generation process.
     * 
     * This method sets up the nodes and edges of the state graph, linking the 
     * input handling with the response generation logic.
     * 
     * @returns The compiled state graph application.
     */
    private createGraph() {
        // Create a new state graph with the MessagesAnnotation
        const graph = new StateGraph(MyGraphState)
            .addNode("handleInput", this.generateAnswerNode)
            .addEdge(START, "handleInput");

        // Compile the graph
        const app = graph.compile();
        return app;
    }

    /**
     * Generates a response based on the user's question.
     * 
     * This method logs the question, invokes the state graph with the necessary 
     * context, and handles the response generation process.
     * 
     * @param question - The user's question to generate a response for.
     * @param updateResponse - A callback function to update the response as it is generated.
     * @returns A promise that resolves when the response generation is complete.
     */
    async generate(question: string, updateResponse: (message: string) => void): Promise<void> {
        try {
            // Retrieve the provider using the mediator service
            const provider = await Utility.getProvider();

            this.logger.info(`chatgpt.model: ${provider.modelManager.model} chatgpt.question: ${question}`);

            // Invoke the graph with the current messages and necessary state
            const inputs = {
                generateAnswerNodeLogger: CoreLogger.getInstance({ loggerName: "GenerateAnswerNode" }),
                previousMessages: provider.chatHistoryManager.getHistory(),
                userQuestion: question,
                provider,
                chatModel: this.chatModel,
                updateResponse: updateResponse,
            };
            await this.createGraph().invoke(inputs);
        } catch (error) {
            this.logger.logError(error, 'chatgpt.model: Error in response generation');
            throw error;
        }
    }

    /**
     * Generates a response using the provided state information.
     * 
     * This method formats the user question, invokes the chat model to generate 
     * a response, and updates the state with the new messages.
     * 
     * @param state - The current state of the graph containing necessary context for response generation.
     * @returns An object containing the generated answer and updated previous messages.
     */
    private async generateAnswerNode(state: typeof MyGraphState.State) {
        const { generateAnswerNodeLogger, previousMessages, userQuestion, provider, chatModel, updateResponse } = state;

        generateAnswerNodeLogger.info('Invoking model with messages:', previousMessages);

        try {
            // Use the utility function to create a formatted user prompt
            const userPrompt = `### USER QUESTION: ${userQuestion}`;
            generateAnswerNodeLogger.info(userPrompt);

            // Make a copy of the previousMessages array
            const messagesCopy = [...previousMessages];
            messagesCopy.push({ role: "user", content: userPrompt });

            const chunks = [];
            const result = await chatModel.streamText({
                system: provider.modelManager.modelConfig.systemPrompt,
                messages: messagesCopy,
                maxTokens: provider.modelManager.modelConfig.maxTokens,
                topP: provider.modelManager.modelConfig.topP,
                temperature: provider.modelManager.modelConfig.temperature,
                abortSignal: provider.abortController ? provider.abortController.signal : undefined,
            });

            // Process the streamed response
            for await (const textPart of result.textStream) {
                updateResponse(textPart);
                chunks.push(textPart);
            }

            // Return the final response
            const response = chunks.join("");
            provider.response = response;

            // Update previousMessages with the assistant's reply
            const updatedPreviousMessages = [
                ...previousMessages,
                { role: "user", content: userQuestion },
                { role: "assistant", content: response },
            ];

            return {
                answer: response,
                previousMessages: updatedPreviousMessages, // Update the state
            };
        } catch (error) {
            generateAnswerNodeLogger.error('Model invocation error:', error);
            throw error;
        }
    }
}
