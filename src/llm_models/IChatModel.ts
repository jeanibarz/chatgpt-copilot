export interface IChatModel {
    sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void>;
}
