import { ChatGptViewProvider } from '../view/ChatGptViewProvider';
import { IChatModel } from './IChatModel';
import { chatCompletion } from './OpenAI';

export class OpenAIChatModel implements IChatModel {
    constructor(private provider: ChatGptViewProvider) { }

    async sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void> {
        await chatCompletion(this.provider, prompt, updateResponse, additionalContext);
    }
}
