import { ChatGptViewProvider } from "./chatgptViewProvider";

export interface ICommand {
    execute(data: any, provider: ChatGptViewProvider): Promise<void>;
}