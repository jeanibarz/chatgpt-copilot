// File: src/commandHandler.ts

/**
 * This module handles command execution for the ChatGPT VS Code extension.
 * It defines various command classes that encapsulate specific actions 
 * that can be performed by the extension.
 * 
 * Key Features:
 * - Supports command registration and execution.
 * - Integrates with the ChatGptViewProvider to perform actions.
 * - Provides error handling for command execution.
 */

import { BaseHandler } from "./base/baseHandler";
import { ChatGptViewProvider, CommandType } from "./chatgptViewProvider";
import { ICommand } from "./command";
import { ILogger } from "./interfaces/ILogger";

/**
 * Command class for adding a free text question to the chat.
 */
class AddFreeTextQuestionCommand implements ICommand {
    type: CommandType = CommandType.AddFreeTextQuestion;
    value: any;

    /**
     * Executes the command to add a free text question.
     * 
     * @param data - The data containing the question to be added.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleAddFreeTextQuestion(data.value);
    }
}

/**
 * Command class for editing code in the active text editor.
 */
class EditCodeCommand implements ICommand {
    type: CommandType = CommandType.EditCode;
    value: any;

    /**
     * Executes the command to edit code.
     * 
     * @param data - The data containing the code to be inserted.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleEditCode(data.value);
    }
}

/**
 * Command class for opening a new text document.
 */
class OpenNewCommand implements ICommand {
    type: CommandType = CommandType.OpenNew;
    value: any;

    /**
     * Executes the command to open a new text document.
     * 
     * @param data - The data containing the content and language for the new document.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleOpenNew(data.value || '', data.language || '');
    }
}

/**
 * Command class for clearing the current conversation.
 */
class ClearConversationCommand implements ICommand {
    type: CommandType = CommandType.ClearConversation;
    value: any;

    /**
     * Executes the command to clear the conversation.
     * 
     * @param data - The data related to the command execution.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleClearConversation();
    }
}

/**
 * Command class for clearing the browser state.
 */
class ClearBrowserCommand implements ICommand {
    type: CommandType = CommandType.ClearBrowser;
    value: any;

    /**
     * Executes the command to clear the browser state.
     * 
     * @param data - The data related to the command execution.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleClearBrowser();
    }
}

/**
 * Command class for clearing GPT-3 related states.
 */
class ClearGpt3Command implements ICommand {
    type: CommandType = CommandType.ClearGpt3;
    value: any;

    /**
     * Executes the command to clear GPT-3 related states.
     * 
     * @param data - The data related to the command execution.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleClearGpt3();
    }
}

/**
 * Command class for logging in.
 */
class LoginCommand implements ICommand {
    type: CommandType = CommandType.Login;
    value: any;

    /**
     * Executes the command to log in.
     * 
     * @param data - The data related to the command execution.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleLogin();
    }
}

/**
 * Command class for opening settings.
 */
class OpenSettingsCommand implements ICommand {
    type: CommandType = CommandType.OpenSettings;
    value: any;

    /**
     * Executes the command to open settings.
     * 
     * @param data - The data related to the command execution.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleOpenSettings();
    }
}

/**
 * Command class for opening settings prompt.
 */
class OpenSettingsPromptCommand implements ICommand {
    type: CommandType = CommandType.OpenSettingsPrompt;
    value: any;

    /**
     * Executes the command to open settings prompt.
     * 
     * @param data - The data related to the command execution.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleOpenSettingsPrompt();
    }
}

/**
 * Command class for listing conversations.
 */
class ListConversationsCommand implements ICommand {
    type: CommandType = CommandType.ListConversations;
    value: any;

    /**
     * Executes the command to list conversations.
     * 
     * @param data - The data related to the command execution.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleListConversations();
    }
}

/**
 * Command class for showing a conversation.
 */
class ShowConversationCommand implements ICommand {
    type: CommandType = CommandType.ShowConversation;
    value: any;

    /**
     * Executes the command to show a conversation.
     * 
     * @param data - The data related to the command execution.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleShowConversation();
    }
}

/**
 * Command class for stopping the generation of a response.
 */
class StopGeneratingCommand implements ICommand {
    type: CommandType = CommandType.StopGenerating;
    value: any;

    /**
     * Executes the command to stop generating a response.
     * 
     * @param data - The data related to the command execution.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleStopGenerating();
    }
}

/**
 * The CommandHandler class is responsible for managing and executing commands.
 * It maintains a mapping of command types to command instances and handles
 * command execution logic.
 */
export class CommandHandler extends BaseHandler<ICommand> {
    private commandMap: Map<CommandType, ICommand>;
    private provider?: ChatGptViewProvider;

    /**
     * Constructor for the CommandHandler class.
     * Initializes the command handler with a logger instance and a provider.
     * 
     * @param logger - An instance of ILogger for logging events.
     * @param provider - The ChatGptViewProvider instance to interact with the chat.
     */
    constructor(logger: ILogger, provider: ChatGptViewProvider) {
        super(logger);
        this.provider = provider;
        this.commandMap = new Map();
        this.registerCommands();
    }

    /**
     * Registers all available commands.
     */
    private registerCommands() {
        this.registerCommand(CommandType.AddFreeTextQuestion, new AddFreeTextQuestionCommand());
        this.registerCommand(CommandType.EditCode, new EditCodeCommand());
        this.registerCommand(CommandType.OpenNew, new OpenNewCommand());
        this.registerCommand(CommandType.ClearConversation, new ClearConversationCommand());
        this.registerCommand(CommandType.ClearBrowser, new ClearBrowserCommand());
        this.registerCommand(CommandType.ClearGpt3, new ClearGpt3Command());
        this.registerCommand(CommandType.Login, new LoginCommand());
        this.registerCommand(CommandType.OpenSettings, new OpenSettingsCommand());
        this.registerCommand(CommandType.OpenSettingsPrompt, new OpenSettingsPromptCommand());
        this.registerCommand(CommandType.ListConversations, new ListConversationsCommand());
        this.registerCommand(CommandType.ShowConversation, new ShowConversationCommand());
        this.registerCommand(CommandType.StopGenerating, new StopGeneratingCommand());
    }

    /**
     * Sets the provider for the command handler.
     * 
     * @param provider - The ChatGptViewProvider instance to set.
     */
    public setProvider(provider: ChatGptViewProvider) {
        this.provider = provider;
    }

    /**
     * Registers a command in the command map.
     * 
     * @param commandType - The type of command to register.
     * @param command - The command instance to register.
     */
    private registerCommand(commandType: CommandType, command: ICommand) {
        this.commandMap.set(commandType, command);
    }

    /**
     * Executes a command based on its type.
     * 
     * @param commandType - The type of command to execute.
     * @param data - The data associated with the command execution.
     */
    public async executeCommand(commandType: CommandType, data: any) {
        const command = this.commandMap.get(commandType);
        if (command) {
            await command.execute(data, this.provider);
        } else {
            console.warn(`No handler found for command type: ${commandType}`);
        }
    }

    /**
     * Executes a command based on the provided ICommand data.
     * 
     * @param data - The ICommand data to execute.
     */
    public async execute(data: ICommand): Promise<void> {
        try {
            const commandType = data.type;
            const commandData = data.value;
            await this.executeCommand(commandType, commandData);
        } catch (error) {
            this.handleError(error);
        }
    }
}
