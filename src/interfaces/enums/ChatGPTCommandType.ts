/**
 * Enum representing the different command types for the ChatGPT extension.
 */


export enum ChatGPTCommandType {
    AddFreeTextQuestion = "addFreeTextQuestion",
    EditCode = "editCode",
    OpenNew = "openNew",
    ClearConversation = "clearConversation",
    ClearBrowser = "clearBrowser",
    ClearGpt3 = "cleargpt3",
    Login = "login",
    OpenSettings = "openSettings",
    OpenSettingsPrompt = "openSettingsPrompt",
    ListConversations = "listConversations",
    ShowConversation = "showConversation",
    StopGenerating = "stopGenerating",
    GenerateDocstrings = "generateDocstrings",
    GenerateMermaidDiagram = "generateMermaidDiagram",
    GenerateMermaidDiagramsInFolder = "GenerateMermaidDiagramsInFolder",
}
