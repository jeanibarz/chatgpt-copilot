// File: src/chatHistoryManager.ts

import { CoreMessage } from "ai";

export class ChatHistoryManager {
    private chatHistory: CoreMessage[] = [];

    public addMessage(role: 'user' | 'assistant', content: string) {
        this.chatHistory.push({ role, content });
    }

    public clearHistory() {
        this.chatHistory = [];
    }

    public getHistory(): CoreMessage[] {
        return this.chatHistory;
    }

    public getLastMessage(): CoreMessage | undefined {
        return this.chatHistory[this.chatHistory.length - 1];
    }
}
