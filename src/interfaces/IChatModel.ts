import { CoreTool, GenerateObjectResult, StreamTextResult } from 'ai';
import { GenerateObjectCallOptions, StreamTextCallOptions, WorkflowType } from "../types/coreTypes";

export interface IChatModel {
    /**
     * Sends a message to the chat model with additional context and updates the response.
     * 
     * @param prompt - The message prompt to be sent to the chat model.
     * @param additionalContext - Any additional context information to enhance the response.
     * @param updateResponse - A callback function that receives the model's response as it is generated.
     * @returns A promise that resolves when the message has been sent and processed.
     */
    // sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void>;

    /**
     * Generates an object based on the provided parameters, using the internal model.
     */
    /**
     * @returns
     * A result object that contains the generated object, the finish reason, the token usage, and additional information.
     */
    generate(prompt: string, additionalContext: string, updateResponse: (message: string) => void, workflowType: WorkflowType): Promise<string | undefined>;

    generateObject<OBJECT>(options: GenerateObjectCallOptions<OBJECT>): Promise<GenerateObjectResult<OBJECT>>;

    streamText<TOOLS extends Record<string, CoreTool>>(options: StreamTextCallOptions<TOOLS>): Promise<StreamTextResult<TOOLS>>;
}