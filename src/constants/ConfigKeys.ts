// src/contants/ConfigKeys.ts

export const ExtensionConfigPrefix = 'chatgpt';

export enum ConfigKeys {
    ApiKey = 'chatgpt-gpt3-apiKey',
    PromptPrefix = 'promptPrefix',
    JsonCredentialsPath = 'gpt3.jsonCredentialsPath',
    MermaidOutputFolder = 'mermaidOutputFolder',
    SessionToken = 'chatgpt-session-token',
    ClearanceToken = 'chatgpt-clearance-token',
    CustomModel = 'gpt3.customModel',
    UserAgent = 'chatgpt-user-agent',
    AdhocPrompt = 'chatgpt-adhoc-prompt',
    Organization = 'gpt3.organization',
    MaxTokens = 'gpt3.maxTokens',
    Temperature = 'gpt3.temperature',
    TopP = 'gpt3.top_p',
    SystemPrompt = 'chatgpt.systemPrompt',
    GenerateCodeEnabled = 'gpt3.generateCode-enabled',
    Gpt3Model = 'gpt3.model',
    AutoScroll = 'response.autoScroll',
    ShowNotification = 'response.showNotification',
    Model = 'gpt3.model',
    ModelSource = 'gpt3.modelSource',
    ApiBaseUrl = 'gpt3.apiBaseUrl',
    FileInclusionRegex = 'fileInclusionRegex',
    FileExclusionRegex = 'fileExclusionRegex',
    DefaultSystemPromptForFreeQuestion = 'defaultSystemPromptForFreeQuestion',
    ConversationHistoryEnabled = 'conversationHistoryEnabled',
}