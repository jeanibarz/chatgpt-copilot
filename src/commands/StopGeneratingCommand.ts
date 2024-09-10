import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';
import { ICommand } from './ICommand';

export class StopGeneratingCommand implements ICommand {
  public type = CommandType.StopGenerating;

  public async execute(data: any, provider: ChatGptViewProvider) {
    // If there is an ongoing process, abort it
    if (provider.abortController) {
      provider.abortController.abort(); // Abort the ongoing request
    }
    provider.inProgress = false;

    // Send a message to the webview indicating generation has stopped
    provider.sendMessage({ type: "showInProgress", inProgress: provider.inProgress });

    // Finalize the response and update the webview
    const responseInMarkdown = !provider.modelManager.isCodexModel;
    provider.sendMessage({
      type: "addResponse",
      value: provider.response,
      done: true,
      id: provider.currentMessageId,
      autoScroll: provider.configurationManager.autoScroll,
      responseInMarkdown,
    });

    provider.logger.info("Stopped generating");
  }
}
