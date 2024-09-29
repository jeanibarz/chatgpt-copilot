// src/inversify.types.ts

const TYPES = {
    ChatGptViewProvider: Symbol.for("ChatGptViewProvider"),
    CoreLogger: Symbol.for("CoreLogger"),
    WebviewManager: Symbol.for("WebviewManager"),
    CommandHandler: Symbol.for("CommandHandler"),
    ModelManager: Symbol.for("ModelManager"),
    ConfigurationManager: Symbol.for("ConfigurationManager"),
    ChatHistoryManager: Symbol.for("ChatHistoryManager"),
    FilteredTreeDataProvider: Symbol.for("FilteredTreeDataProvider"),
    TreeRenderer: Symbol.for("TreeRenderer"),
    EventHandler: Symbol.for("EventHandler"),
    ContextManager: Symbol.for("ContextManager"),
    ContextRetriever: Symbol.for("ContextRetriever"),
    DocstringExtractor: Symbol.for("DocstringExtractor"),
    FileManager: Symbol.for("FileManager"),
    WebviewMessageHandler: Symbol.for("WebviewMessageHandler"),
    ResponseHandler: Symbol.for("ResponseHandler"),
    ErrorHandler: Symbol.for("ErrorHandler"),
    DocstringGenerator: Symbol.for("DocstringGenerator"),
    ExplicitFilesManager: Symbol.for("ExplicitFilesManager"),
    ExtensionContext: Symbol.for("ExtensionContext"),
    SessionManager: Symbol.for("SessionManager"),
    ConversationManager: Symbol.for("ConversationManager"),
    GetChatGptViewProvider: Symbol.for("GetChatGptViewProvider"),
};

export default TYPES;
