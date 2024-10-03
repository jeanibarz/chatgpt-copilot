// src/commands/ClearConversationCommand.ts

import { inject, injectable } from "inversify";
import { ConversationManager } from "../ConversationManager";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import TYPES from "../inversify.types";

@injectable()
export class ClearConversationCommand implements ICommand {
  public readonly type = ChatGPTCommandType.ClearConversation;

  constructor(
    @inject(TYPES.ConversationManager) private conversationManager: ConversationManager,
  ) { }

  public async execute(data: any): Promise<void> {
    this.conversationManager.clearConversation();
  }
}
