import { ChatGptViewProvider } from '../chatgptViewProvider';
import { IChatModel } from './IChatModel';
import { chatCompletion } from './openai';

export class OpenAIChatModel implements IChatModel {
    constructor(private provider: ChatGptViewProvider) { }

    async sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void> {
        await chatCompletion(this.provider, prompt, updateResponse, additionalContext);
    }
}
