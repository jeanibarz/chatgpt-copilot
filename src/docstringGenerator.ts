import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ChatGptViewProvider } from './chatgptViewProvider';
import { CoreLogger } from './coreLogger';
import { IChatModel } from './llm_models/IChatModel';
import { ChatModelFactory } from './llm_models/chatModelFactory';

/**
 * DocstringGenerator is responsible for generating and formatting docstrings.
 */
export class DocstringGenerator {
  private logger: CoreLogger;
  private provider: ChatGptViewProvider;

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

    // Save the formatted docstring to a file and return the path
    return this.saveDocstringToFile(response);
  }

  /**
   * Creates and returns the chat model for AI interaction.
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

  /**
   * Saves the generated docstring to a temporary file.
   * 
   * @param docstring - The raw generated docstring.
   * @returns The path to the temporary file where the docstring is saved.
   */
  private saveDocstringToFile(docstring: string): string {
    const tempDir = os.tmpdir();
    const tempFileName = `generated_docstring_${Date.now()}.ts`; // Adjust the file extension based on your use case
    const tempFilePath = path.join(tempDir, tempFileName);

    // Save the formatted docstring to a temp file
    fs.writeFileSync(tempFilePath, this.formatDocstring(docstring), { encoding: 'utf-8' });
    this.logger.info(`Docstring saved to ${tempFilePath}`);

    return tempFilePath;
  }
}
