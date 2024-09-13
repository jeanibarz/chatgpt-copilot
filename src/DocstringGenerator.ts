import { CoreLogger } from './CoreLogger';
import { ChatModelFactory } from './llm_models/ChatModelFactory';
import { IChatModel } from './llm_models/IChatModel';
import { ChatGptViewProvider } from './view/ChatGptViewProvider';

/**
 * This module provides functionality for generating and formatting docstrings 
 * using an AI model within a VS Code extension. The `DocstringGenerator` class 
 * interacts with the AI model to create docstrings based on input code prompts.
 * 
 * Key Features:
 * - Generates docstrings by sending prompts to the AI model.
 * - Formats generated docstrings to remove unnecessary annotations.
 * - Saves the formatted docstrings to temporary files for easy access.
 */

export class DocstringGenerator {
  private logger: CoreLogger; // Logger instance for logging events
  private provider: ChatGptViewProvider; // View provider for ChatGPT interactions

  /**
   * Constructor for the `DocstringGenerator` class.
   * Initializes a new instance with the provided logger and ChatGPT view provider.
   * 
   * @param logger - An instance of `CoreLogger` for logging events.
   * @param provider - An instance of `ChatGptViewProvider` for managing interactions with the AI model.
   */
  constructor(logger: CoreLogger, provider: ChatGptViewProvider) {
    this.logger = logger;
    this.provider = provider;
  }

  /**
   * Generates docstrings by interacting with the AI model.
   * 
   * @param prompt - The input code prompt for generating docstrings.
   * @returns A promise that resolves with the generated docstring.
   */
  public async generateDocstring(prompt: string): Promise<string> {
    this.logger.info("Generating docstring...");

    // Prepare the AI model (e.g., OpenAI)
    const chatModel = await this.createChatModel();

    let response = '';
    const updateResponse = (message: string) => {
      response += message;
    };

    // Send the prompt to the model and get the response
    await chatModel.sendMessage(prompt, '', updateResponse); // Use the required 3 arguments

    // Format and return the docstring content
    return this.formatDocstring(response);
  }

  /**
   * Creates and returns the chat model for AI interaction.
   * 
   * @returns A promise that resolves to an instance of `IChatModel`.
   * @throws Will throw an error if the model preparation fails or the model configuration is incomplete.
   */
  private async createChatModel(): Promise<IChatModel> {
    // Call prepareModelForConversation to initialize model configuration
    const modelPrepared = await this.provider.modelManager.prepareModelForConversation(false, this.logger, this.provider);

    if (!modelPrepared) {
      this.logger.error('Failed to prepare model for conversation.');
      throw new Error('Model preparation failed');
    }

    const modelConfig = this.provider.modelManager.modelConfig;

    if (!modelConfig || !modelConfig.apiBaseUrl) {
      this.logger.error("Model configuration is missing or incomplete.");
      throw new Error("Model configuration is missing or incomplete.");
    }

    // Proceed to create the chat model with the prepared configuration
    return await ChatModelFactory.createChatModel(this.provider, modelConfig);
  }

  /**
   * Formats the generated docstring by removing unnecessary block annotations.
   * 
   * @param docstring - The raw generated docstring.
   * @returns The formatted docstring.
   */
  private formatDocstring(docstring: string): string {
    let trimmedDocstring = docstring.trim();
    let lines = trimmedDocstring.split(/\r?\n/);

    // Remove surrounding backticks
    if (lines[0].trim().startsWith('```')) lines.shift();
    if (lines[lines.length - 1].trim().startsWith('```')) lines.pop();

    return lines.join('\n').trim();
  }
}