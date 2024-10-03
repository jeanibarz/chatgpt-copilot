// src/commands/AddFreeTestQuestionCommand.ts

import { injectable } from "inversify";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { Utility } from "../Utility";

@injectable()
export class AddFreeTextQuestionCommand implements ICommand {
  public readonly type = ChatGPTCommandType.AddFreeTextQuestion;

  constructor() { }

  public async execute(data: any): Promise<void> {
    // Retrieve the provider using the mediator service
    const provider = await Utility.getProvider();

    const question = data.value;
    if (!provider.configurationManager.conversationHistoryEnabled) {
      provider.chatHistoryManager.clearHistory();
    }

    await provider.sendApiRequest(question, { command: ChatGPTCommandType.AddFreeTextQuestion });
  }
}
