// src/inversify.types.ts

const TYPES = {
    MediatorService: Symbol.for('MediatorService'),

    // View Providers
    ChatGptViewProvider: Symbol.for("ChatGptViewProvider"),

    // Handlers
    SendMessageHandler: Symbol.for('SendMessageHandler'),
    AddChatHistoryMessageHandler: Symbol.for('AddChatHistoryMessageHandler'),
    SendApiRequestHandler: Symbol.for('SendApiRequestHandler'),
    HandleApiErrorHandler: Symbol.for('HandleApiErrorHandler'),

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

    // Logging
    CoreLogger: Symbol.for('CoreLogger'),

    // EventHandlers
    EventHandler: Symbol.for('EventHandler'),

    // Code Generation
    DocstringExtractor: Symbol.for('DocstringExtractor'),
    DocstringGenerator: Symbol.for('DocstringGenerator'),
    MermaidDiagramGenerator: Symbol.for('MermaidDiagramGenerator'),

    // File Management
    ExplicitFilesManager: Symbol.for('ExplicitFilesManager'),

    // Extension Context and Provider Factories
    ExtensionContext: Symbol.for('ExtensionContext'),
    GetChatGptViewProvider: Symbol.for('GetChatGptViewProvider'),

    // Webview Handlers
    WebviewMessageHandler: Symbol.for('WebviewMessageHandler'),
};

export default TYPES;
