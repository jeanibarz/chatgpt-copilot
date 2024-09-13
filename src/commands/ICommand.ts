import { ChatGptViewProvider, CommandType } from '../view/ChatGptViewProvider';

export interface ICommand {
  type: CommandType;
  execute(data: any, provider: ChatGptViewProvider): Promise<void>;
}
