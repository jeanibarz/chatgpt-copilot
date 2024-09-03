// src/models/IChatModel.ts
export interface IChatModel {
    sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void>;
}
