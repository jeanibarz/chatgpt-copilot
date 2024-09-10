// File: src/commands/ICommand.ts

import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';

export interface ICommand {
  type: CommandType;
  execute(data: any, provider: ChatGptViewProvider): Promise<void>;
}
