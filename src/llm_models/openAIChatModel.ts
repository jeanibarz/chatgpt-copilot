// src/models/OpenAIChatModel.ts
import { ChatGptViewProvider } from '../chatgptViewProvider';
import { IChatModel } from './IChatModel';
import { chatGpt } from './openai';

export class OpenAIChatModel implements IChatModel {
    constructor(private provider: ChatGptViewProvider) { }

    async sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void> {
        await chatGpt(this.provider, prompt, updateResponse, additionalContext);
    }
}
