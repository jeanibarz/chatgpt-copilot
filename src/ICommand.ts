/**
 * This module defines the ICommand interface for command execution 
 * within a VS Code extension. It outlines the structure of commands 
 * that can be executed, including the command type and the associated 
 * value, as well as the method for executing the command with the 
 * necessary parameters.
 */

import { ChatGPTCommandType } from "./interfaces/enums/ChatGPTCommandType";
import { ChatGptViewProvider } from "./view/ChatGptViewProvider";

/**
 * The ICommand interface represents a command that can be executed 
 * within the application. It defines the properties and methods 
 * required for command execution, ensuring a consistent structure 
 * for all commands.
 */
export interface ICommand {
    type: ChatGPTCommandType; // The type of command being executed
    value: any; // The value associated with the command
    /**
     * Executes the command with the provided data and view provider.
     * 
     * @param data - The data required for executing the command.
     * @param provider - An instance of `ChatGptViewProvider` for accessing 
     *                   workspace-related settings during execution.
     * @returns A promise that resolves when the command execution is complete.
     */
    execute(data: any, provider: ChatGptViewProvider): Promise<void>;
}