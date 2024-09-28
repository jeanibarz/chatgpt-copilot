import { IChatModel } from '../../interfaces/IChatModel';
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { chatCompletion } from './Anthropic';

export class AnthropicChatModel implements IChatModel {
    constructor(private provider: ChatGptViewProvider) { }

    async generate(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void> {
        await chatCompletion(this.provider, prompt, updateResponse, additionalContext);
    }
}