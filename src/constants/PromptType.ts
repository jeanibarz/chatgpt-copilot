// src/constants/PromptType.ts

export enum PromptType {
    FreeQuestion = 'freeQuestionDefaultSystemPrompt',
    GenerateDocstring = 'generateUpdateDocstringsPrompt',
    UserGenerateMermaidDiagram = 'generateMermaidDiagramPrompt',
    UserContextSelection = 'contextSelectionExpertDefaultUserPrompt',
    SystemContextSelection = 'contextSelectionExpertDefaultSystemPrompt',
    FilterContentUserPrompt = "FilterContentUserPrompt",
    FilterContentSystemPrompt = "FilterContentSystemPrompt",
    ScoreFilteredContentsUserPrompt = "ScoreFilteredContentsUserPrompt",
    ScoreFilteredContentsSystemPrompt = "ScoreFilteredContentsSystemPrompt"
}