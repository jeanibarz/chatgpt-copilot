import { BaseHandler } from "./base/baseHandler";
import { ChatGptViewProvider, CommandType } from "./chatgptViewProvider";
import { ICommand } from "./command";
import { ILogger } from "./interfaces/ILogger";

class AddFreeTextQuestionCommand implements ICommand {
    type: CommandType = CommandType.AddFreeTextQuestion;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleAddFreeTextQuestion(data.value);
    }
}

class EditCodeCommand implements ICommand {
    type: CommandType = CommandType.EditCode;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleEditCode(data.value);
    }
}

class OpenNewCommand implements ICommand {
    type: CommandType = CommandType.OpenNew;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleOpenNew(data.value || '', data.language || '');
    }
}

class ClearConversationCommand implements ICommand {
    type: CommandType = CommandType.ClearConversation;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleClearConversation();
    }
}

class ClearBrowserCommand implements ICommand {
    type: CommandType = CommandType.ClearBrowser;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleClearBrowser();
    }
}

class ClearGpt3Command implements ICommand {
    type: CommandType = CommandType.ClearGpt3;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleClearGpt3();
    }
}
class LoginCommand implements ICommand {
    type: CommandType = CommandType.Login;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleLogin();
    }
}

class OpenSettingsCommand implements ICommand {
    type: CommandType = CommandType.OpenSettings;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleOpenSettings();
    }
}

class OpenSettingsPromptCommand implements ICommand {
    type: CommandType = CommandType.OpenSettingsPrompt;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleOpenSettingsPrompt();
    }
}

class ListConversationsCommand implements ICommand {
    type: CommandType = CommandType.ListConversations;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleListConversations();
    }
}

class ShowConversationCommand implements ICommand {
    type: CommandType = CommandType.ShowConversation;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleShowConversation();
    }
}

class StopGeneratingCommand implements ICommand {
    type: CommandType = CommandType.StopGenerating;
    value: any;
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleStopGenerating();
    }
}

export class CommandHandler extends BaseHandler<ICommand> {
    private commandMap: Map<CommandType, ICommand>;
    private provider?: ChatGptViewProvider;

    constructor(logger: ILogger, provider: ChatGptViewProvider) {
        super(logger);
        this.provider = provider;
        this.commandMap = new Map();
        this.registerCommands();
    }

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

    public setProvider(provider: ChatGptViewProvider) {
        this.provider = provider;
    }

    private registerCommand(commandType: CommandType, command: ICommand) {
        this.commandMap.set(commandType, command);
    }

    public async executeCommand(commandType: CommandType, data: any) {
        const command = this.commandMap.get(commandType);
        if (command) {
            await command.execute(data, this.provider);
        } else {
            console.warn(`No handler found for command type: ${commandType}`);
        }
    }

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
