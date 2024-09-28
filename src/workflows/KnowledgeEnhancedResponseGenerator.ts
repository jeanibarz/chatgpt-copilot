/**
 * src/workflows/KnowledgeEnhancedResponseGenerator.ts
 * 
 * This module provides the `KnowledgeEnhancedResponseGenerator` class, which is responsible 
 * for generating responses to user queries by leveraging context from relevant files and 
 * previously stored messages. It utilizes a state graph to manage the flow of operations 
 * necessary for selecting relevant files, retrieving their contents, and generating 
 * responses based on AI model interactions.
 * 
 * Key Features:
 * - Manages the selection of relevant files based on user questions.
 * - Retrieves contents from selected files to provide context for responses.
 * - Generates responses using an AI model while keeping track of conversation history.
 * - Assesses whether additional files should be included to improve response quality.
 */

import { Annotation, START, StateGraph } from "@langchain/langgraph";
import { CoreMessage, generateObject } from 'ai';
import { z } from 'zod';
import { defaultSystemPromptForContextSelection, defaultUserPromptForContextSelection } from "../config/Configuration";
import { IChatModel, IFileDocstring, ISelectedFile, RenderMethod } from "../interfaces";
import { CoreLogger } from "../logging/CoreLogger";
import { PromptFormatter } from "../PromptFormatter";
import { ChatGptViewProvider } from "../view/ChatGptViewProvider";

// Configuration for maximum retries
const MAX_RETRIES = 0; // This can be made configurable

/**
 * Define the state annotations for the StateGraph.
 */
const MyGraphState = Annotation.Root({
    routeLogger: Annotation<CoreLogger>(),
    selectRelevantFilesLogger: Annotation<CoreLogger>,
    generateAnswerNodeLogger: Annotation<CoreLogger>,
    retrieveFileContentLogger: Annotation<CoreLogger>,
    assessResponseNodeLogger: Annotation<CoreLogger>,
    retryCount: Annotation<number>,
    shouldReroute: Annotation<boolean>,
    hasContextFiles: Annotation<boolean>(),
    availableFiles: Annotation<string[]>(),
    previousMessages: Annotation<CoreMessage[]>,
    userQuestion: Annotation<string>,
    docstrings: Annotation<IFileDocstring[]>,
    selectedFiles: Annotation<ISelectedFile[]>,
    retrievedContents: Annotation<string>,
    retrievedFilePaths: Annotation<Set<string>>,
    answer: Annotation<string>,
    provider: Annotation<ChatGptViewProvider>,
    chatModel: Annotation<IChatModel>,
    updateResponse: Annotation<(message: string) => void>,
});

/**
 * The KnowledgeEnhancedResponseGenerator class is responsible for generating responses 
 * to user queries by leveraging context from relevant files and previously stored messages. 
 * It manages the selection of files, retrieves their contents, and interacts with an AI model 
 * to generate coherent answers.
 * 
 * Key Features:
 * - Manages the selection of relevant files based on user questions.
 * - Retrieves contents from selected files to provide context for responses.
 * - Generates responses using an AI model while keeping track of conversation history.
 * - Assesses whether additional files should be included to improve response quality.
 */
export class KnowledgeEnhancedResponseGenerator {
    private logger = CoreLogger.getInstance();

    /**
     * Constructor for the `KnowledgeEnhancedResponseGenerator` class.
     * Initializes a new instance with the specified provider and chat model.
     * 
     * @param provider - An instance of `ChatGptViewProvider` for accessing view-related settings.
     * @param chatModel - An instance of `IChatModel` representing the AI model for generating responses.
     */
    constructor(private provider: ChatGptViewProvider, private chatModel: IChatModel) { }

    /**
     * Creates a state graph for managing the various nodes involved in generating a response.
     * This graph defines the flow of operations including selecting relevant files and retrieving 
     * their contents.
     * 
     * @returns A compiled state graph instance.
     */
    private createGraph() {
        // Create a new state graph with the MessagesAnnotation
        const graph = new StateGraph(MyGraphState)
            .addNode("selectRelevantFiles", this.selectRelevantFilesNode)
            .addNode("retrieveFileContentsNode", this.retrieveFileContentsNode)
            .addNode("handleInput", this.generateAnswerNode)
            .addNode("displayUsedFilesNode", this.displayUsedFilesNode)
            .addConditionalEdges(START, this.determineInitialRouteNode, {
                handleInput: "handleInput",
                selectRelevantFiles: "selectRelevantFiles",
            })
            .addEdge("selectRelevantFiles", "retrieveFileContentsNode")
            .addEdge("retrieveFileContentsNode", "handleInput")
            .addEdge("handleInput", "displayUsedFilesNode");

        // Compile the graph
        const app = graph.compile();
        return app;
    }

    /**
     * Generates a response to the user's question by invoking the state graph with the current 
     * messages and context. It logs the interaction and handles any errors that may arise.
     * 
     * @param question - The user's question to be answered.
     * @param updateResponse - A callback function to update the response in the UI.
     * @returns A promise that resolves when the response generation is complete.
     */
    async generate(question: string, updateResponse: (message: string) => void): Promise<void> {
        try {
            this.logger.info(`chatgpt.model: ${this.provider.modelManager.model} chatgpt.question: ${question}`);

            // Check if context files are available
            const availableFiles = await this.provider.contextManager.treeDataProvider.getAllFilteredFiles();
            const hasContextFiles = availableFiles.length > 0;

            // Invoke the graph with the current messages
            const inputs = {
                routeLogger: CoreLogger.getInstance({ loggerName: "Route Based on Context" }),
                selectRelevantFilesLogger: CoreLogger.getInstance({ loggerName: "Context / Select relevant files" }),
                generateAnswerNodeLogger: CoreLogger.getInstance({ loggerName: "GenerateAnswerNode" }),
                retrieveFileContentLogger: CoreLogger.getInstance({ loggerName: "Context / Retrieve file contents" }),
                assessResponseNodeLogger: CoreLogger.getInstance({ loggerName: "Context / Retrieve file contents" }),
                retrievedContents: "",
                retrievedFilePaths: new Set(),
                previousMessages: this.provider.chatHistoryManager.getHistory(),
                userQuestion: question,
                provider: this.provider,
                chatModel: this.chatModel,
                updateResponse: updateResponse,
                retryCount: 0,
                shouldReroute: false,
                selectedFiles: [],
                hasContextFiles: hasContextFiles,
                availableFiles: availableFiles,
            };
            await this.createGraph().invoke(inputs);
        } catch (error) {
            this.logger.info(`chatgpt.model: ${this.provider.modelManager.model} response: ${error}, stack: ${error.stack}`);
            throw error;
        }
    }

    /**
     * Generates an answer based on the user's question and the retrieved context. This method 
     * interacts with the AI model and processes the streamed response to provide a coherent 
     * answer.
     * 
     * @param state - The current state containing necessary context and information.
     * @returns A promise that resolves with the generated answer and updated previous messages.
     */
    async generateAnswerNode(state: typeof MyGraphState.State) {
        const { generateAnswerNodeLogger, previousMessages, retrievedContents, userQuestion, provider, chatModel, updateResponse } = state;

        generateAnswerNodeLogger.info('Invoking model with messages:', previousMessages);

        try {
            // Retrieve matched files and their ASCII layout
            const matchedFilesAscii = await provider.contextManager.treeDataProvider.renderTree(RenderMethod.FullPathDetails);

            // Use the utility function to create a formatted user prompt
            let userPrompt = undefined;
            if (retrievedContents) {
                userPrompt = `
${PromptFormatter.formatProjectLayout(matchedFilesAscii)}

${PromptFormatter.formatRetrievedContent(retrievedContents)}

${PromptFormatter.formatConversationHistory(previousMessages)}

### USER QUESTION: ${userQuestion}`;
            } else {
                userPrompt = `
${PromptFormatter.formatProjectLayout(matchedFilesAscii)}

${PromptFormatter.formatConversationHistory(previousMessages)}

### USER QUESTION: ${userQuestion}`;
            }
            generateAnswerNodeLogger.info(userPrompt);

            // Make a copy of the previousMessages array
            const messagesCopy = [...previousMessages]; // or previousMessages.slice()

            // Append a new message to the copied array
            messagesCopy.push({ role: "user", content: userPrompt });

            const chunks = [];
            const result = await chatModel.streamText({
                system: provider.modelManager.modelConfig.systemPrompt,
                messages: messagesCopy,
                maxTokens: provider.modelManager.modelConfig.maxTokens,
                topP: provider.modelManager.modelConfig.topP,
                temperature: provider.modelManager.modelConfig.temperature,
                abortSignal: provider.abortController ? provider.abortController.signal : undefined,
            });

            // Process the streamed response
            for await (const textPart of result.textStream) {
                updateResponse(textPart);
                chunks.push(textPart);
            }

            // Return the final response
            const response = chunks.join("");
            provider.response = response;

            // Update previousMessages with the assistant's reply
            const updatedPreviousMessages = [
                ...previousMessages,
                { role: "user", content: userQuestion },
                { role: "assistant", content: response },
            ];

            return {
                answer: response,
                previousMessages: updatedPreviousMessages, // Update the state
            };
        } catch (error) {
            generateAnswerNodeLogger.error('Model invocation error:', error);
            throw error;
        }
    }

    /**
     * Handles the selection of relevant files based on the user's question and the retrieved docstrings.
     * 
     * This function constructs a prompt using the system prompt and the user's question,
     * sends it to the OpenAI model, and returns the list of relevant files.
     * 
     * @param state - The current state containing docstrings and user question.
     * @returns A promise that resolves to an array of SelectedFile objects.
     */
    async selectRelevantFilesNode(state: typeof MyGraphState.State) {
        const {
            availableFiles,
            selectRelevantFilesLogger,
            previousMessages,
            userQuestion,
            provider,
            chatModel,
        } = state;

        // Define the schema for the structured output
        const FileSchema = z.object({
            filePath: z.string(),
            reason: z.string(),
            symbols: z.array(z.string()).optional(),
        });

        const FilesSchema = z.object({
            selectedFiles: z.array(FileSchema),
        });

        selectRelevantFilesLogger.info("Filesschema constructed");

        try {
            // Construct the prompt using the system prompt
            const systemPrompt = defaultSystemPromptForContextSelection;

            const projectResourcesOverview = PromptFormatter.formatProjectLayout(
                await provider.contextManager.generateProjectOverview(RenderMethod.FullPathDetails),
            );
            const conversationHistory = PromptFormatter.formatConversationHistory(previousMessages);

            // Replace the placeholders in the template with actual values
            const userPrompt = defaultUserPromptForContextSelection
                .replace('${projectResourcesOverview}', projectResourcesOverview)
                .replace('${conversationHistory}', conversationHistory)
                .replace('${userQuestion}', userQuestion);

            // Call OpenAI API to get the relevant files
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ];
            selectRelevantFilesLogger.info("Messages instantiated", { messages });

            const { object } = await chatModel.generateObject({
                mode: "json",
                schema: FilesSchema,
                messages: messages
            });

            selectRelevantFilesLogger.info('Completion done', { object });

            const validatedSelectedFiles = object.selectedFiles.filter(file =>
                availableFiles.some(availableFile => availableFile === file.filePath)
            );

            if (validatedSelectedFiles.length !== object.selectedFiles.length) {
                selectRelevantFilesLogger.warn("Some selected files do not exist and will be ignored.");
            }

            return { selectedFiles: validatedSelectedFiles };
        } catch (error: any) {
            selectRelevantFilesLogger.error('Error in selectRelevantFilesNode:', {
                message: error.message || 'Unknown error',
                stack: error.stack || 'No stack trace',
                response: error.response || 'No response data',
                code: error.code || 'No error code',
                request: error.request || 'No request data',
            });
            throw error;
        }
    }

    /**
     * Retrieves the contents of the selected files and updates the state with the retrieved data.
     * 
     * @param state - The current state containing selected files and context.
     * @returns A promise that resolves with the updated retrieved contents and file paths.
     */
    async retrieveFileContentsNode(state: typeof MyGraphState.State) {
        const { retrieveFileContentLogger, selectedFiles, provider, retrievedContents, retrievedFilePaths } = state;

        try {
            if (!selectedFiles || selectedFiles.length === 0) {
                retrieveFileContentLogger.warn('No selected files to retrieve content from.');
                return { retrievedContents, retrievedFilePaths };
            }

            // Initialize retrievedFilePaths if undefined
            const alreadyRetrieved = retrievedFilePaths || new Set();

            // Filter out files whose contents have already been retrieved
            const newFiles = selectedFiles.filter(file => !alreadyRetrieved.has(file.filePath));

            if (newFiles.length === 0) {
                retrieveFileContentLogger.info('No new files to retrieve content from.');
                return { retrievedContents, retrievedFilePaths: alreadyRetrieved };
            }

            // Map newFiles to an array of file paths
            const newFilePaths = new Set(newFiles.map(file => file.filePath));

            // Retrieve the file contents
            const newContents = await provider.contextManager.getFilesContent(newFilePaths);
            retrieveFileContentLogger.info('Retrieved new file contents:', { newContents });

            // Accumulate the retrieved contents
            const updatedRetrievedContents = retrievedContents
                ? retrievedContents + "\n" + newContents
                : newContents;

            // Update the set of retrieved file paths
            newFilePaths.forEach(filePath => alreadyRetrieved.add(filePath));

            // Update the state with the retrieved file contents
            return {
                retrievedContents: updatedRetrievedContents,
                retrievedFilePaths: alreadyRetrieved,
            };
        } catch (error) {
            retrieveFileContentLogger.error('Error retrieving file contents', { error });
            throw error;
        }
    }

    /**
     * Assesses the generated response to determine if additional files should be included 
     * based on the user question and the current context.
     * 
     * @param state - The current state containing context and evaluation criteria.
     * @returns A promise that resolves with an object indicating whether to reroute the flow.
     */
    async assessResponseNode(state: typeof MyGraphState.State) {
        const { assessResponseNodeLogger, previousMessages, userQuestion, provider, selectedFiles, docstrings, retryCount, updateResponse } = state;

        // Compute the set of file paths already included
        const alreadySelectedFilePaths = new Set(selectedFiles.map(f => f.filePath));

        // Filter out docstrings of files that are already included
        const remainingDocstrings = docstrings.filter(doc => !alreadySelectedFilePaths.has(doc.filePath));

        try {
            const userPrompt = `
### ASSESSMENT INSTRUCTION:
Based on the conversation context, the user question, the generated response, and the files already included, determine if additional files should be included to improve the response. If yes, list the additional files that should be included, along with a reason for each.

${PromptFormatter.formatConversationHistory(previousMessages)}

### USER QUESTION:
${userQuestion}

### ASSISTANT RESPONSE TO USER QUESTION:
${provider.response}

### FILES ALREADY INCLUDED:
${selectedFiles.map(f => `- ${f.filePath}: ${f.reason}`).join('\n')}

### REMAINING FILE DOCSTRINGS:
${PromptFormatter.formatDocstrings(remainingDocstrings)}

### OUTPUT FORMAT:
Provide a JSON array where each element has the following structure:
{
  "filePath": "absolute/path/to/the/file",
  "reason": "Explanation of why this file is relevant (1 to 5 lines max)."
}

If no additional files are needed, respond with an empty array.`;

            const messages = [
                { role: 'system', content: 'You are an assistant that helps determine the adequacy of responses based on context.' },
                { role: 'user', content: userPrompt }
            ];

            // Check the response
            const FileSchema = z.object({
                filePath: z.string(),
                reason: z.string(),
            });
            const FilesSchema = z.object({
                selectedFiles: z.array(FileSchema),
            });

            const { object } = await generateObject({
                model: provider.apiChat,
                messages: messages,
                mode: "json",
                schema: FilesSchema,
            });

            // Filter out files that are already in selectedFiles
            const newSelectedFiles = object.selectedFiles.filter(
                f => !selectedFiles.some(sf => sf.filePath === f.filePath)
            );
            const updatedSelectedFiles = selectedFiles.concat(newSelectedFiles);

            if (newSelectedFiles.length > 0 && retryCount < MAX_RETRIES) {
                return {
                    selectedFiles: updatedSelectedFiles,
                    shouldReroute: true,
                    retryCount: retryCount + 1,
                };
            } else {
                return { shouldReroute: false };
            }
        } catch (error) {
            assessResponseNodeLogger.error('Error in assessResponseNode:', error);
            throw error;
        }
    }

    /**
     * Displays the used files in the response and updates the UI with the relevant information.
     * 
     * @param state - The current state containing selected files and the update response function.
     * @returns An empty object to signify the end of the graph processing.
     */
    async displayUsedFilesNode(state: typeof MyGraphState.State) {
        const { selectedFiles, updateResponse } = state;

        if (selectedFiles.length > 0) {
            // Construct the message with a list of used files, including reasons
            const sourcedFilesMessage = `
<hr>
<em>The following files were used to generate the response:

${selectedFiles.map((f, index) => `[${index + 1}] ${f.filePath}: ${f.reason}`).join("\n\n")}
</em>`;

            updateResponse(sourcedFilesMessage); // Send the message to the user
        } else {
            updateResponse('\n<hr>\n<em>No specific files were used to generate the response.<em>');
        }

        return {}; // End the graph processing
    }

    /**
     * Determines the next node to be invoked in the state graph based on the current state.
     * 
     * @param state - The current state containing routing information.
     * @returns The name of the next node to invoke or "__end__" to signal the end of processing.
     */
    async determineNextNode(state: typeof MyGraphState.State) {
        if (state.shouldReroute && state.retryCount < MAX_RETRIES) {
            return "retrieveFileContentsNode";
        } else {
            return "__end__";
        }
    }

    async determineInitialRouteNode(state: typeof MyGraphState.State) {
        if (state.hasContextFiles) {
            return "selectRelevantFiles";
        } else {
            return "handleInput";
        }
    }
}