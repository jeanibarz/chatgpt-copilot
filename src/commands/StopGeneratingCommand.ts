// src/commands/StopGeneratingCommand.ts

import { injectable } from "inversify";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { Utility } from "../Utility";

@injectable()
export class StopGeneratingCommand implements ICommand {
  public readonly type = ChatGPTCommandType.StopGenerating;

  constructor() { }

  public async execute(data: any): Promise<void> {
    Utility.stopGenerationRequest();
  }
}
