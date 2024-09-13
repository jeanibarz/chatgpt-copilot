import { ChatGptViewProvider } from '../view/ChatGptViewProvider';
import { chatCompletion } from './Gemini';
import { IChatModel } from './IChatModel';

export class GeminiChatModel implements IChatModel {
    constructor(private provider: ChatGptViewProvider) { }

    /**
     * Sends a message to the chat model with the given prompt and additional context.
     * 
     * @param prompt - The message prompt to send to the chat model.
     * @param additionalContext - Additional context to provide to the chat model.
     * @param updateResponse - A callback function to update the response as it is received.
     * @returns A Promise that resolves once the message has been sent.
     */
    async sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void> {
        await chatCompletion(this.provider, prompt, updateResponse, additionalContext);
    }
}