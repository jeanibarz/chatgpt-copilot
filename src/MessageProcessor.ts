// src/MessageProcessor.ts

import { inject, injectable } from "inversify";
import TYPES from "./inversify.types";
import { CoreLogger } from "./logging/CoreLogger";
import { ConfigurationManager } from "./services/ConfigurationManager";
import { ChatGptViewProvider } from "./view";

@injectable()
export class MessageProcessor {
    private logger: CoreLogger = CoreLogger.getInstance();

    constructor(
        @inject(TYPES.ConfigurationManager) private configurationManager: ConfigurationManager,
    ) { }

    /**
     * Processes the provided question, appending contextual information from the current project files.
     * 
     * @param question - The original question to process.
     * @param code - Optional code block associated with the question.
     * @param language - The programming language of the code, if present.
     * @returns A Promise that resolves to the processed question string.
     */
    public processQuestion(question: string, code?: string, language?: string) {
        this.logger.info("processQuestion called");

        // Format the question to send, keeping the context separate
        const formattedQuestion = code != null
            ? `${question}${language ? ` (The following code is in ${language} programming language)` : ""}: ${code}`
            : question;

        this.logger.info("returning question processed...");
        return formattedQuestion;
    }

    /**
     * Adds the user's question to the webview for display.
     *
     * @param provider - The ChatGptViewProvider.
     * @param prompt - The user's prompt.
     * @param code - Optional code associated with the prompt.
     */
    public async addQuestionToWebview(provider: ChatGptViewProvider, prompt: string, code?: string) {
        await provider.sendMessage({
            type: "addQuestion",
            value: prompt,
            code: code,
            autoScroll: this.configurationManager.autoScroll,
        });
    }
}
