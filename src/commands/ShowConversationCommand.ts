import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';
import { ICommand } from './ICommand';

export class ShowConversationCommand implements ICommand {
  public type = CommandType.ShowConversation;

  public async execute(data: any, provider: ChatGptViewProvider) {
    // Focus the webview if not already focused
    try {
      if (provider.webView == null) {
        // If the webview is not initialized, execute the command to focus it
        await vscode.commands.executeCommand("chatgpt-copilot.view.focus");
      } else {
        // If the webview is already available, show it
        provider.webView?.show?.(true);
      }
    } catch (error) {
      provider.logger.logError(error, "Failed to focus or show the ChatGPT view", true);
    }
  }
}