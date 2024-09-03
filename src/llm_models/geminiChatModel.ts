// src/models/GeminiChatModel.ts
import { ChatGptViewProvider } from '../chatgptViewProvider';
import { chatCompletion } from './gemini';
import { IChatModel } from './IChatModel';

export class GeminiChatModel implements IChatModel {
    constructor(private provider: ChatGptViewProvider) { }

    async sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void> {
        await chatCompletion(this.provider, prompt, updateResponse, additionalContext);
    }
}