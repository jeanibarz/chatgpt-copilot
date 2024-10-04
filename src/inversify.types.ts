// src/inversify.types.ts

const TYPES = {
    // View Providers
    ChatGptViewProvider: Symbol.for("ChatGptViewProvider"),

    // Managers and Controllers
    CommandHandler: Symbol.for('CommandHandler'),
    SessionManager: Symbol.for('SessionManager'),
    ConversationManager: Symbol.for('ConversationManager'),
    ResponseHandler: Symbol.for('ResponseHandler'),
    ErrorHandler: Symbol.for('ErrorHandler'),
    TreeRenderer: Symbol.for('TreeRenderer'),
    FilteredTreeDataProvider: Symbol.for('FilteredTreeDataProvider'),

    // Services
    ChatHistoryManager: Symbol.for('ChatHistoryManager'),
    ConfigurationManager: Symbol.for('ConfigurationManager'),
    ContextManager: Symbol.for('ContextManager'),
    ContextRetriever: Symbol.for('ContextRetriever'),
    FileManager: Symbol.for('FileManager'),
    ModelManager: Symbol.for('ModelManager'),
    WebviewManager: Symbol.for('WebviewManager'),
    Utility: Symbol.for('Utility'),
    ChatModelFactory: Symbol.for('ChatModelFactory'),
    OpenAIModelFactory: Symbol.for('OpenAIModelFactory'),
    MessageProcessor: Symbol.for('MessageProcessor'),
    IDocstringService: Symbol.for('IDocstringService'),
    IMermaidDiagramService: Symbol.for('IMermaidDiagramService'),

    // EventHandlers
    EventHandler: Symbol.for('EventHandler'),

    // Code Generation
    DocstringExtractor: Symbol.for('DocstringExtractor'),
    MermaidDiagramGenerator: Symbol.for('MermaidDiagramGenerator'),

    // File Management
    ExplicitFilesManager: Symbol.for('ExplicitFilesManager'),

    // Extension Context and Provider Factories
    ExtensionContext: Symbol.for('ExtensionContext'),
    GetChatGptViewProvider: Symbol.for('GetChatGptViewProvider'),
    WorkspaceRoot: Symbol.for('WorkspaceRoot'),

    // Webview Handlers
    WebviewMessageHandler: Symbol.for('WebviewMessageHandler'),

    IChatModel: Symbol.for('IChatModel'),
    OpenAIModel: Symbol.for('OpenAIModel'),
};

export default TYPES;
