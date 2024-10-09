// src/workflows/KnowledgeEnhancedResponseGenerator.ts

/**
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
import { CoreMessage } from 'ai';
import Handlebars from 'handlebars';
import { inject, injectable } from "inversify";
import { CancellationToken, Progress } from "vscode";
import { z } from 'zod';
import { PromptType } from "../constants/PromptType";
import { IChatModel, IFileDocstring, RenderMethod } from "../interfaces";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { PromptFormatter } from "../PromptFormatter";
import { MessageRole } from "../services/ChatHistoryManager";
import { StateManager } from "../state/StateManager";
import { Utility } from "../Utility";
import { ChatGptViewProvider } from "../view/ChatGptViewProvider";

// Configuration for maximum retries
const MAX_RETRIES = 0;

/**
 * Define the state annotations for the StateGraph.
 */
const MyGraphState = Annotation.Root({
    routeLogger: Annotation<CoreLogger>(),
    selectRelevantFilesLogger: Annotation<CoreLogger>,
    generateAnswerNodeLogger: Annotation<CoreLogger>,
    retrieveFileContentLogger: Annotation<CoreLogger>,
    filterRetrievedContentsLogger: Annotation<CoreLogger>,
    scoreFilteredContentsLogger: Annotation<CoreLogger>,
    assessResponseNodeLogger: Annotation<CoreLogger>,
    retryCount: Annotation<number>,
    shouldReroute: Annotation<boolean>,
    hasContextFiles: Annotation<boolean>(),
    availableFiles: Annotation<string[]>(),
    previousMessages: Annotation<CoreMessage[]>,
    userQuestion: Annotation<string>,
    docstrings: Annotation<IFileDocstring[]>,
    selectedFiles: Annotation<Array<{ filePath: string; initialReason: string; }>>,
    retrievedFileContents: Annotation<Array<{ filePath: string; content: string; initialReason: string; }>>,
    filteredFileContents: Annotation<Array<{ filePath: string; content: string; initialReason: string; }>>,
    scoredFileContents: Annotation<Array<{ filePath: string; content: string; initialReason: string; finalReason: string; score: number; }>>,
    scoreThreshold: Annotation<number>,
    retrievedFilePaths: Annotation<Set<string>>,
    answer: Annotation<string>,
    provider: Annotation<ChatGptViewProvider>,
    chatModel: Annotation<IChatModel>,
    updateResponse: Annotation<(message: string) => void>,
    progress: Annotation<Progress<{ message?: string; increment?: number; }>>,
    token: Annotation<CancellationToken>,
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
@injectable()
export class KnowledgeEnhancedResponseGenerator {
    private logger = CoreLogger.getInstance();

    constructor(
        @inject(TYPES.IChatModel) private chatModel: IChatModel
    ) { }

    /**
     * Creates a state graph for managing the various nodes involved in generating a response.
     * This graph defines the flow of operations including selecting relevant files and retrieving 
     * their contents.
     * 
     * @returns A compiled state graph instance.
     */
    private createGraph() {
        const graph = new StateGraph(MyGraphState)
            .addNode("selectRelevantFiles", this.selectRelevantFilesNode)
            .addNode("retrieveFileContentsNode", this.retrieveFileContentsNode)
            .addNode("filterRetrievedContentsNode", this.filterRetrievedContentsNode)
            .addNode("scoreFilteredContentsNode", this.scoreFilteredContentsNode)
            .addNode("handleInput", this.generateAnswerNode)
            .addNode("displayUsedFilesNode", this.displayUsedFilesNode)
            .addConditionalEdges(START, this.determineInitialRouteNode, {
                handleInput: "handleInput",
                selectRelevantFiles: "selectRelevantFiles",
            })
            .addEdge("selectRelevantFiles", "retrieveFileContentsNode")
            .addEdge("retrieveFileContentsNode", "filterRetrievedContentsNode")
            .addEdge("filterRetrievedContentsNode", "scoreFilteredContentsNode")
            .addEdge("scoreFilteredContentsNode", "handleInput")
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
     * @param progress - Progress reporter to update the progress bar.
     * @param token - Cancellation token to handle user cancellation.
     * @returns A promise that resolves when the response generation is complete.
     */
    async generate(
        question: string,
        updateResponse: (message: string) => void,
        progress: Progress<{ message?: string; increment?: number; }>,
        token: CancellationToken,
    ): Promise<void> {
        try {
            // Retrieve the provider using the mediator service
            const provider = await Utility.getProvider();

            this.logger.info(`chatgpt.model: ${provider.modelManager.model} chatgpt.question: ${question}`);

            // Check if context files are available
            const availableFiles = await provider.contextManager.treeDataProvider.getAllFilteredFiles();
            const hasContextFiles = availableFiles.length > 0;

            // Invoke the graph with the current messages
            const inputs = {
                routeLogger: CoreLogger.getInstance({ loggerName: "KERG - Route Based on Context" }),
                selectRelevantFilesLogger: CoreLogger.getInstance({ loggerName: "KERG - Select relevant files" }),
                generateAnswerNodeLogger: CoreLogger.getInstance({ loggerName: "KERG - Generate answer" }),
                retrieveFileContentLogger: CoreLogger.getInstance({ loggerName: "KERG - Retrieve file contents" }),
                filterRetrievedContentsLogger: CoreLogger.getInstance({ loggerName: "KERG - Filter Retrieved Contents" }),
                scoreFilteredContentsLogger: CoreLogger.getInstance({ loggerName: "KERG - Score Filtered Contents" }),
                assessResponseNodeLogger: CoreLogger.getInstance({ loggerName: "KERG - Assess response" }),
                retrievedFileContents: [],
                filteredFileContents: [],
                scoreThreshold: 5,
                scoredFileContents: [],
                retrievedFilePaths: new Set(),
                previousMessages: provider.chatHistoryManager.getHistory(),
                userQuestion: question,
                provider: provider,
                chatModel: this.chatModel,
                updateResponse: updateResponse,
                retryCount: 0,
                shouldReroute: false,
                selectedFiles: [],
                hasContextFiles: hasContextFiles,
                availableFiles: availableFiles,
                progress: progress,
                token: token,
            };

            progress.report({ increment: 0, message: "Starting..." });

            await this.createGraph().invoke(inputs);
        } catch (error) {
            this.logger.logError(error, 'Error generating a response');
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
    private async generateAnswerNode(state: typeof MyGraphState.State) {
        if (state.token.isCancellationRequested) {
            throw new Error('Operation canceled by the user.');
        }
        state.progress.report({ increment: 40, message: "Generating answer..." });

        const { generateAnswerNodeLogger, previousMessages, scoredFileContents, userQuestion, provider, chatModel, updateResponse } = state;

        generateAnswerNodeLogger.info('Invoking model with messages:', previousMessages);

        try {
            // Retrieve matched files and their ASCII layout
            const projectLayout = await provider.contextManager.treeDataProvider.renderTree(RenderMethod.FullPathDetails);

            // Sort the scoredFileContents by score descending
            const sortedContents = scoredFileContents
                .sort((a, b) => b.score - a.score)
                .map(fc => fc.content)
                .join('\n');

            // Use the new prompt builder method
            const userPrompt = this.buildUserPrompt(userQuestion, projectLayout, sortedContents);
            generateAnswerNodeLogger.info(userPrompt);

            // Make a copy of the previousMessages array
            const messagesCopy = [...previousMessages];

            // Append a new message to the copied array
            messagesCopy.push({ role: "user", content: userPrompt });

            const chunks = [];

            // Create an AbortController to handle cancellation
            const abortController = new AbortController();
            state.token.onCancellationRequested(() => {
                abortController.abort();
            });

            const result = await chatModel.streamText({
                system: provider.modelManager.modelConfig.systemPrompt ?? undefined,
                messages: messagesCopy,
                maxTokens: provider.modelManager.modelConfig.maxTokens ?? undefined,
                topP: provider.modelManager.modelConfig.topP ?? undefined,
                temperature: provider.modelManager.modelConfig.temperature ?? undefined,
                abortSignal: abortController.signal,
            });

            // Process the streamed response
            for await (const textPart of result.textStream) {
                if (state.token.isCancellationRequested) {
                    throw new Error('Operation canceled by the user.');
                }
                updateResponse(textPart);
                chunks.push(textPart);
            }

            // Return the final response
            const response = chunks.join("");
            provider.response = response;

            (await Utility.getProvider()).chatHistoryManager.addMessage(MessageRole.User, userQuestion);
            (await Utility.getProvider()).chatHistoryManager.addMessage(MessageRole.Assistant, response);

            // Update previousMessages with the assistant's reply
            const updatedPreviousMessages = [
                ...previousMessages,
                { role: "user", content: userQuestion },
                { role: "assistant", content: response },
            ];


            return {
                answer: response,
                previousMessages: updatedPreviousMessages,
            };
        } catch (error) {
            generateAnswerNodeLogger.error('Model invocation error:', error);
            throw error;
        }
    }

    /**
     * Builds the user prompt based on the question, project layout, and retrieved content.
     * 
     * @param userQuestion - The user's question
     * @param projectLayout - The ASCII representation of the project layout
     * @param retrievedContent - The sorted and filtered content from relevant files
     * @returns The formatted user prompt
     */
    private buildUserPrompt(userQuestion: string, projectLayout: string, retrievedContent: string): string {
        const basePrompt = `
${userQuestion}

---

<CONTEXT>
${PromptFormatter.formatProjectLayout(projectLayout)}
`;

        if (retrievedContent) {
            return `${basePrompt}
${PromptFormatter.formatRetrievedContent(retrievedContent)}
</CONTEXT>`;
        } else {
            return `${basePrompt}
</CONTEXT>`;
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
        if (state.token.isCancellationRequested) {
            throw new Error('Operation canceled by the user.');
        }
        state.progress.report({ increment: 20, message: "Selecting relevant files..." });

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
            initialReason: z.string(),
            symbols: z.array(z.string()).optional(),
        });

        const FilesSchema = z.object({
            selectedFiles: z.array(FileSchema),
        });

        selectRelevantFilesLogger.info("Constructing schema for file selection");

        try {
            const stateManager = StateManager.getInstance();

            // Construct the prompt using the system prompt
            const systemPrompt = stateManager.getPromptStateManager().getPrompt(PromptType.SystemContextSelection);

            const projectResourcesOverview = PromptFormatter.formatProjectLayout(
                await provider.contextManager.generateProjectOverview(RenderMethod.FullPathDetails),
            );
            const conversationHistory = PromptFormatter.formatConversationHistory(previousMessages);

            // Replace the placeholders in the template with actual values
            const userPromptTemplate = stateManager.getPromptStateManager().getPrompt(PromptType.UserContextSelection);
            if (!userPromptTemplate) {
                const errorMessage = 'UserContextSelection prompt is missing';
                selectRelevantFilesLogger.error(errorMessage);
                throw new Error(errorMessage);
            }

            // Compile the Handlebars template
            const template = Handlebars.compile(userPromptTemplate);

            // Define the context for replacement
            const context = {
                userQuestion,
                projectResourcesOverview,
                conversationHistory,
            };

            // Generate the final user prompt
            const userPrompt = template(context);

            // Prepare the messages to be sent to the AI model
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ];
            selectRelevantFilesLogger.info("Messages created", { messages });

            // Call the AI model to generate the object
            const { object } = await chatModel.generateObject({
                mode: "json",
                schema: FilesSchema,
                messages: messages as CoreMessage[],
            });

            selectRelevantFilesLogger.info('File selection completion', { object });

            // Validate that selected files exist in the available files list
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
        if (state.token.isCancellationRequested) {
            throw new Error('Operation canceled by the user.');
        }
        state.progress.report({ increment: 25, message: "Retrieving file contents..." });

        const { retrieveFileContentLogger, selectedFiles, provider, retrievedFileContents, retrievedFilePaths } = state;

        try {
            if (!selectedFiles || selectedFiles.length === 0) {
                retrieveFileContentLogger.warn('No selected files to retrieve content from.');
                return { retrievedFileContents, retrievedFilePaths };
            }

            // Initialize retrievedFilePaths if undefined
            const alreadyRetrieved = retrievedFilePaths || new Set();

            // Filter out files whose contents have already been retrieved
            const newFiles = selectedFiles.filter(file => !alreadyRetrieved.has(file.filePath));

            if (newFiles.length === 0) {
                retrieveFileContentLogger.info('No new files to retrieve content from.');
                return { retrievedFileContents, retrievedFilePaths: alreadyRetrieved };
            }

            // Retrieve the file contents for new files
            const newContents = await Promise.all(
                newFiles.map(async (file) => {
                    const content = provider.fileManager.readFileContent(file.filePath);
                    return { filePath: file.filePath, content, initialReason: file.initialReason };
                })
            );

            retrieveFileContentLogger.info('Retrieved new file contents:', { newContents });

            // Accumulate the retrieved contents into the array of objects
            const updatedRetrievedContents = retrievedFileContents.concat(newContents);

            // Update the set of retrieved file paths
            newFiles.forEach(file => alreadyRetrieved.add(file.filePath));

            // Update the state with the retrieved file contents
            return {
                retrievedFileContents: updatedRetrievedContents,
                retrievedFilePaths: alreadyRetrieved,
            };
        } catch (error) {
            retrieveFileContentLogger.error('Error retrieving file contents', { error });
            throw error;
        }
    }


    /**
     * Filters out irrelevant information from the retrieved file contents using an LLM.
     * The processing occurs in parallel for each file being filtered.
     * The output of the LLM is the remaining file content after the filtering.
     * 
     * @param state - The current state containing retrieved file contents and context.
     * @returns A promise that resolves with the filtered file contents.
     */
    private async filterRetrievedContentsNode(state: typeof MyGraphState.State): Promise<{ filteredFileContents: Array<{ filePath: string; content: string; }>; }> {
        const { retrievedFileContents, chatModel, token, progress, filterRetrievedContentsLogger, provider, userQuestion } = state;

        if (token.isCancellationRequested) {
            throw new Error('Operation canceled by the user.');
        }
        progress.report({ increment: 30, message: "Filtering retrieved contents..." });

        filterRetrievedContentsLogger.info('Starting filtering of retrieved contents.');

        const systemPrompt = StateManager.getInstance().getPromptStateManager().getPrompt(PromptType.FilterContentSystemPrompt);
        const userPromptTemplate = StateManager.getInstance().getPromptStateManager().getPrompt(PromptType.FilterContentUserPrompt);
        const template = Handlebars.compile(userPromptTemplate);

        // Process each file's content in parallel
        const filteredFileContents = await Promise.all(
            retrievedFileContents.map(async (fileContent) => {
                const { filePath, content, initialReason } = fileContent;

                // Generate the dynamic user prompt by replacing the placeholders
                const userPrompt = template({ userQuestion, content });

                const messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ];

                try {
                    const abortController = new AbortController();
                    token.onCancellationRequested(() => {
                        abortController.abort();
                    });

                    const chunks = [];
                    const result = await chatModel.streamText({
                        messages: messages as CoreMessage[],
                        maxTokens: provider.modelManager.modelConfig.maxTokens ?? undefined,
                        topP: provider.modelManager.modelConfig.topP ?? undefined,
                        temperature: provider.modelManager.modelConfig.temperature ?? undefined,
                        abortSignal: abortController.signal,
                    });

                    // Process the streamed response
                    for await (const textPart of result.textStream) {
                        if (state.token.isCancellationRequested) {
                            throw new Error('Operation canceled by the user.');
                        }
                        chunks.push(textPart);
                    }

                    // Return the final response
                    const filteredContent = chunks.join("");
                    filterRetrievedContentsLogger.info(`Filtered content for file: ${filePath}`);

                    return { filePath, content: filteredContent, initialReason };

                } catch (error) {
                    filterRetrievedContentsLogger.error(`Error filtering content for file: ${filePath}`, { error });
                    // Return an empty string for content if filtering fails
                    return { filePath, content: '', initialReason };
                }
            })
        );

        filterRetrievedContentsLogger.info('Completed filtering of retrieved contents.');

        return { filteredFileContents };
    }

    /**
     * Scores the filtered file contents to prioritize the most relevant content.
     * This method uses the AI model to assign a relevance score to each filtered content.
     * Any content that receives a score below the specified threshold is automatically filtered out.
     * 
     * @param state - The current state containing filtered file contents and context.
     * @param scoreThreshold - The minimum score required to keep a file. Default is 5.
     * @returns A promise that resolves with the scored file contents.
     */
    private async scoreFilteredContentsNode(state: typeof MyGraphState.State) {
        if (state.token.isCancellationRequested) {
            throw new Error('Operation canceled by the user.');
        }
        state.progress.report({ increment: 35, message: "Scoring filtered contents..." });

        const { filteredFileContents, userQuestion, chatModel, provider, token, scoreThreshold, scoreFilteredContentsLogger } = state;

        scoreFilteredContentsLogger.info('Starting scoring of filtered contents.');

        // Define the schema for the structured output
        const ScoredFileSchema = z.object({
            filePath: z.string(),
            score: z.number(),
            finalReason: z.string(),
        });


        // Get the prompt state manager
        const promptStateManager = StateManager.getInstance().getPromptStateManager();

        const scoringSystemPrompt = promptStateManager.getPrompt(
            PromptType.ScoreFilteredContentsSystemPrompt
        );

        // Prepare messages to ask the model to score relevance
        const scoringUserPromptTemplate = promptStateManager.getPrompt(
            PromptType.ScoreFilteredContentsUserPrompt
        );

        const scoredFileContents = await Promise.all(
            filteredFileContents.map(async (fileContent) => {
                const { filePath, content, initialReason } = fileContent;

                if (!content || content.trim() === '') {
                    scoreFilteredContentsLogger.info(`Skipping empty content for file: ${filePath}`);
                    return null;
                }

                // Generate the dynamic user prompt for each file
                const scoringUserPrompt = Handlebars.compile(scoringUserPromptTemplate)({
                    userQuestion,
                    filePath,
                    content,
                });

                const messages = [
                    { role: 'system', content: scoringSystemPrompt },
                    { role: 'user', content: scoringUserPrompt },
                ];

                try {
                    scoreFilteredContentsLogger.info(`Generating score for file: ${filePath}`);
                    const { object } = await chatModel.generateObject({
                        messages: messages as CoreMessage[],
                        mode: "json",
                        schema: ScoredFileSchema,
                    });

                    // Assuming the object has the correct format with `filePath` and `score`
                    const { filePath: scoredFilePath, score, finalReason } = object;

                    scoreFilteredContentsLogger.info(`File ${scoredFilePath} received score: ${score}. Final Reason: ${finalReason}`);

                    if (score >= scoreThreshold) {
                        scoreFilteredContentsLogger.info(`File ${scoredFilePath} meets threshold (${scoreThreshold}). Including in results.`);
                        return { filePath: scoredFilePath, content, initialReason, finalReason, score };
                    } else {
                        scoreFilteredContentsLogger.info(`File ${scoredFilePath} below threshold (${scoreThreshold}). Excluding from results.`);
                        return null;
                    }
                } catch (error) {
                    scoreFilteredContentsLogger.error(`Error occurred while scoring file: ${filePath}`, { error });
                    scoreFilteredContentsLogger.info(`Excluding file ${filePath} due to scoring error.`);
                    return null;
                }
            })
        );

        // Filter out null entries
        const filteredScoredFileContents = scoredFileContents.filter(file => file !== null);

        scoreFilteredContentsLogger.info(`Scoring process completed. ${filteredScoredFileContents.length} files passed the threshold of ${scoreThreshold}.`);

        return { scoredFileContents: filteredScoredFileContents };
    }

    /**
     * Assesses the generated response to determine if additional files should be included 
     * based on the user question and the current context.
     * 
     * @param state - The current state containing context and evaluation criteria.
     * @returns A promise that resolves with an object indicating whether to reroute the flow.
     */
    async assessResponseNode(state: typeof MyGraphState.State) {
        const { assessResponseNodeLogger, previousMessages, userQuestion, provider, selectedFiles, docstrings, retryCount, chatModel, updateResponse } = state;

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
${selectedFiles.map(f => `- ${f.filePath}: ${f.initialReason}`).join('\n')}

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

            const { object } = await chatModel.generateObject({
                messages: messages as CoreMessage[],
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
 * Only files that passed the scoring threshold and were kept will be displayed.
 * 
 * @param state - The current state containing scored file contents and the update response function.
 * @returns An empty object to signify the end of the graph processing.
 */
    async displayUsedFilesNode(state: typeof MyGraphState.State) {
        if (state.token.isCancellationRequested) {
            throw new Error('Operation canceled by the user.');
        }
        state.progress.report({ increment: 10, message: "Finalizing..." });

        const { scoredFileContents, updateResponse } = state;

        if (scoredFileContents.length > 0) {
            const sourcedFilesMessage = `
<hr>
<em>The following files were used to generate the response:

${scoredFileContents.map((f, index) => `[${index + 1}] ${f.filePath}
Score: ${f.score}
Initial Thought: ${f.initialReason}
Final Thought: ${f.finalReason}`).join("\n\n")}
</em>`;

            updateResponse(sourcedFilesMessage);
        } else {
            updateResponse('\n<hr>\n<em>No specific files were used to generate the response.</em>');
        }

        return {};
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
        if (state.token.isCancellationRequested) {
            throw new Error('Operation canceled by the user.');
        }
        state.progress.report({ increment: 5, message: "Determining initial route..." });

        if (state.hasContextFiles) {
            return "selectRelevantFiles";
        } else {
            return "handleInput";
        }
    }
}