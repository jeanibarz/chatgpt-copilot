// rc/DocstringGenerator.ts

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

import { inject, injectable } from "inversify";
import TYPES from './inversify.types';
import { CoreLogger } from './logging/CoreLogger';
import { ChatModelFactory } from './models/llm_models/ChatModelFactory';
import { ChatGptViewProvider } from './view/ChatGptViewProvider';

/**
 * The DocstringGenerator class is responsible for generating and formatting 
 * docstrings using an AI model. It interacts with the ChatGPT model to create 
 * meaningful and context-aware docstrings based on the provided code prompts.
 * 
 * Key Features:
 * - Generates docstrings by sending prompts to the AI model.
 * - Formats generated docstrings to remove unnecessary annotations.
 * - Integrates with a logger for event tracking and debugging.
 */
@injectable()
export class DocstringGenerator {
  private provider?: ChatGptViewProvider;

  /**
   * Constructor for the `DocstringGenerator` class.
   * Initializes a new instance with the provided logger and ChatGPT view provider.
   * 
   * @param logger - An instance of `CoreLogger` for logging events.
   * @param provider - An instance of `ChatGptViewProvider` for managing interactions with the AI model.
   */
  constructor(
    @inject(TYPES.CoreLogger) private logger: CoreLogger
  ) { }

  /**
   * Sets the `ChatGptViewProvider` instance after the generator has been initialized.
   * This allows the provider to be injected later if needed.
   * 
   * @param provider - The `ChatGptViewProvider` instance to interact with the AI model.
   */
  public setProvider(provider: ChatGptViewProvider): void {
    this.provider = provider;
  }

  /**
   * Generates docstrings by interacting with the AI model.
   * This method sends a prompt to the AI model and waits for the generated 
   * docstring response, which is then formatted for clarity.
   * 
   * @param prompt - The input code prompt for generating docstrings.
   * @returns A promise that resolves with the generated docstring.
   */
  public async generateDocstring(prompt: string): Promise<string> {
    if (!this.provider) {
      throw new Error("ChatGptViewProvider is not set.");
    }

    this.logger.info("Generating docstring...");

    // Prepare the AI model (e.g., OpenAI)
    const chatModel = await ChatModelFactory.createChatModel(this.provider);

    let response = '';
    const updateResponse = (message: string) => {
      response += message;
    };

    // Send the prompt to the model and get the response
    const formattedDocstrings = await chatModel.generate(prompt, '', updateResponse, 'basicDocstringGenerator');
    return formattedDocstrings!;
  }
}