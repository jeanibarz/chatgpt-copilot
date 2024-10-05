import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { IChatModel } from '../IChatModel';
import { GeminiModel } from "./Gemini";

export class GeminiChatModel implements IChatModel {
    private llm_model: GeminiModel;

    constructor(private provider: ChatGptViewProvider) {
        this.llm_model = new GeminiModel();
    }

    /**
     * Sends a message to the chat model with the given prompt and additional context.
     * 
     * @param prompt - The message prompt to send to the chat model.
     * @param additionalContext - Additional context to provide to the chat model.
     * @param updateResponse - A callback function to update the response as it is received.
     * @returns A Promise that resolves once the message has been sent.
     */
    async generate(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void> {
        await this.llm_model.chatCompletion(this.provider, prompt, updateResponse, additionalContext);
    }
}