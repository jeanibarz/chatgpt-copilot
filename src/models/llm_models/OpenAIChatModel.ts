/**
 * This module defines the `OpenAIChatModel` class, which implements the 
 * `IChatModel` interface for interacting with OpenAI's chat completion 
 * service. It is responsible for sending messages and retrieving responses 
 * from the AI model using the provided view provider.
 * 
 * Key Features:
 * - Sends messages to the OpenAI chat model.
 * - Utilizes the `ChatGptViewProvider` for accessing necessary context 
 *   and settings.
 */

import { IChatModel } from '../../interfaces/IChatModel';
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { OpenAIModel } from './OpenAI';

/**
 * The OpenAIChatModel class implements the IChatModel interface, 
 * providing functionality to send messages to the OpenAI chat service 
 * and handle responses.
 * 
 * Key Features:
 * - Sends messages to the OpenAI chat model.
 * - Utilizes the `ChatGptViewProvider` for accessing necessary context 
 *   and settings.
 */
export class OpenAIChatModel implements IChatModel {
    private llm_model: OpenAIModel;

    /**
     * Constructor for the `OpenAIChatModel` class.
     * Initializes a new instance of the OpenAIChatModel with the 
     * specified ChatGptViewProvider.
     * 
     * @param provider - An instance of `ChatGptViewProvider` used to 
     * access the necessary context for chat interactions.
     */
    constructor(private provider: ChatGptViewProvider) {
        this.llm_model = new OpenAIModel();
    }

    /**
     * Sends a message to the OpenAI chat model and updates the response 
     * using the provided callback function.
     * 
     * @param prompt - The input message to be sent to the chat model.
     * @param additionalContext - Any additional context to provide with 
     * the message.
     * @param updateResponse - A callback function that receives the 
     * updated message from the model.
     * @returns A promise that resolves when the message has been sent 
     * and the response has been updated.
     */
    async sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void> {
        this.llm_model.initModel(this.provider, this.provider.configurationManager.modelManager.modelConfig);
        await this.llm_model.chatCompletion(this.provider, prompt, updateResponse, additionalContext);
    }
}