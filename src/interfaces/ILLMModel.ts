export interface ILLMModel {
    initModel: (viewProvider: any, config: any) => Promise<any>;
    chatCompletion: (
        provider: any,
        question: string,
        updateResponse: (message: string) => void,
        additionalContext?: string
    ) => Promise<void>;
}