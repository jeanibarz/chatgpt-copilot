
import { ChatGptViewProvider, CommandType } from "./chatgptViewProvider";

export interface ICommand {
    type: CommandType;
    value: any;
    execute(data: any, provider: ChatGptViewProvider): Promise<void>;
}