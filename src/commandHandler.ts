import { ChatGptViewProvider, CommandType } from "./chatgptViewProvider";
import { ICommand } from "./command";

class AddFreeTextQuestionCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleAddFreeTextQuestion(data.value);
    }
}

class EditCodeCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleEditCode(data.value);
    }
}

class OpenNewCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleOpenNew(data.value || '', data.language || '');
    }
}

class ClearConversationCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleClearConversation();
    }
}

class ClearBrowserCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleClearBrowser();
    }
}

class ClearGpt3Command implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleClearGpt3();
    }
}
class LoginCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleLogin();
    }
}

class OpenSettingsCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleOpenSettings();
    }
}

class OpenSettingsPromptCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleOpenSettingsPrompt();
    }
}

class ListConversationsCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleListConversations();
    }
}

class ShowConversationCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleShowConversation();
    }
}

class StopGeneratingCommand implements ICommand {
    async execute(data: any, provider: ChatGptViewProvider) {
        await provider.handleStopGenerating();
    }
}

export class CommandHandler {
    private commandMap: Map<CommandType, ICommand>;

    constructor() {
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

    private registerCommand(commandType: CommandType, command: ICommand) {
        this.commandMap.set(commandType, command);
    }

    public async executeCommand(commandType: CommandType, data: any, provider: ChatGptViewProvider) {
        const command = this.commandMap.get(commandType);
        if (command) {
            await command.execute(data, provider);
        } else {
            console.warn(`No handler found for command type: ${commandType}`);
        }
    }
}
