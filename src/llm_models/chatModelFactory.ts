// src/models/ChatModelFactory.ts
import { ChatGptViewProvider } from '../chatgptViewProvider';
import { AnthropicChatModel } from './anthropicChatModel';
import { GeminiChatModel } from './geminiChatModel';
import { IChatModel } from './IChatModel';
import { OpenAIChatModel } from './openAIChatModel';

export class ChatModelFactory {
    static createChatModel(provider: ChatGptViewProvider): IChatModel {
        const modelType = provider.modelManager.model; // Get the model type from the provider's model manager

        switch (modelType) {
            case 'openai':
                return new OpenAIChatModel(provider);
            case 'gemini':
                return new GeminiChatModel(provider);
            case 'anthropic':
                return new AnthropicChatModel(provider);
            default:
                throw new Error(`Unsupported model type: ${modelType}`);
        }
    }
}
