import { ChatGptViewProvider } from '../view/ChatGptViewProvider';
import { chatCompletion } from './Anthropic';
import { IChatModel } from './IChatModel';

export class AnthropicChatModel implements IChatModel {
    constructor(private provider: ChatGptViewProvider) { }

    async sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void> {
        await chatCompletion(this.provider, prompt, updateResponse, additionalContext);
    }
}