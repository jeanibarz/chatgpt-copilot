import { ChatGPTCommandType } from "./enums/ChatGPTCommandType";

export interface ICommand {
  type: ChatGPTCommandType;
  execute(data: any): Promise<void>;
}
