import { ChatGptViewProvider } from '../view/ChatGptViewProvider';
import { ChatGPTCommandType } from "./enums/ChatGPTCommandType";

export interface ICommand {
  type: ChatGPTCommandType;
  execute(data: any, provider: ChatGptViewProvider): Promise<void>;
}
