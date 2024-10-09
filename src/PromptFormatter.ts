// src/PromptFormatter.ts

/**
 * 
 * This module defines the `PromptFormatter` class, which is responsible for 
 * formatting various types of prompts used in interactions with AI models. 
 * It provides methods to format conversation history, docstrings, project 
 * layouts, and retrieved content, ensuring that the output is clear and 
 * structured for effective communication with the models.
 */

import { CoreMessage } from "ai";

export class PromptFormatter {
    /**
     * Formats the conversation history for the prompt.
     * 
     * @param previousMessages - The conversation history.
     * @returns The formatted conversation history as a string.
     */
    static formatConversationHistory(previousMessages: CoreMessage[]): string {
        return `${previousMessages.map(msg => `- ${msg.role}: ${msg.content}`).join('\n')}`;
    }

    /**
     * Formats the docstrings for the prompt.
     * 
     * @param docstrings - The array of docstring objects.
     * @returns The formatted docstrings as a string.
     */
    static formatDocstrings(docstrings: { filePath: string; docstring: string; }[] | null | undefined): string {
        if (!docstrings || docstrings.length === 0) {
            return '### DOCSTRINGS:\nNo docstrings available.';
        }
        return `### DOCSTRINGS:\n${docstrings.map(doc => `- **${doc.filePath}**: ${doc.docstring}`).join('\n')}`;
    }

    /**
     * Formats the project layout for the prompt.
     * 
     * @param matchedFilesAscii - The ASCII representation of matched files.
     * @returns The formatted project layout as a string.
     */
    static formatProjectLayout(matchedFilesAscii: string): string {
        return `${matchedFilesAscii}`;
    }

    /**
     * Formats the retrieved content for the prompt.
     * 
     * @param retrievedContents - The content retrieved from relevant files.
     * @returns The formatted retrieved content as a string.
     */
    static formatRetrievedContent(retrievedContents: string | null): string {
        return `### RETRIEVED CONTENT:\n${retrievedContents ? retrievedContents : "No additional context retrieved."}`;
    }

    /**
     * Formats already selected files for the prompt.
     * 
     * @param retrievedContents - The content retrieved from relevant files.
     * @returns The formatted already selected files as a string.
     */
    static formatAlreadySelectedFiles(retrievedContents: string | null): string {
        return `### RETRIEVED CONTENT:\n${retrievedContents ? retrievedContents : "No additional context retrieved."}`;
    }
}