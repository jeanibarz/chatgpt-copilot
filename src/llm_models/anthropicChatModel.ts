// src/models/AnthropicChatModel.ts
import { ChatGptViewProvider } from '../chatgptViewProvider';
import { chatCompletion } from './anthropic';
import { IChatModel } from './IChatModel';

export class AnthropicChatModel implements IChatModel {
    constructor(private provider: ChatGptViewProvider) { }

    async sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void> {
        await chatCompletion(this.provider, prompt, updateResponse, additionalContext);
    }
}