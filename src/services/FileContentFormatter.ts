// src/services/FileContentFormatter.ts

/**
 * This module is responsible for formatting the content of files and symbols 
 * for integration into prompts. It structures the content in a readable 
 * manner for better presentation in the ChatGPT interface.
 * 
 * Key Features:
 * - Formats entire file content with appropriate headings and structure.
 * - Formats specific method/function content with clear path references.
 */
export class FileContentFormatter {
    /**
     * Formats the content of an entire file for display.
     * 
     * @param filePath - The full path of the file.
     * @param content - The content of the file to format.
     * @returns A formatted string representing the file content.
     */
    public formatFileContent(filePath: string, content: string): string {
        return `#### Path: ${filePath}\n\n` +
            '```' + this.getLanguageTag(filePath) + '\n' +
            `${content}\n` +
            '```\n\n';
    }

    /**
     * Formats the content of a specific method/function for display.
     * 
     * @param filePath - The full path of the file containing the method.
     * @param methodName - The name of the method to format.
     * @param content - The content of the method to format.
     * @param docstring - The docstring of the method, if any.
     * @returns A formatted string representing the method content.
     */
    public formatMethodContent(filePath: string, methodName: string, content: string, docstring: string | null): string {
        let formattedContent = `#### Path: ${filePath} -> ${methodName}\n\n`;
        if (docstring) {
            formattedContent += `**Docstring:**\n\n` +
                '```' + this.getLanguageTag(filePath) + '\n' +
                `${docstring}\n` +
                '```\n\n';
        }
        formattedContent += '```' + this.getLanguageTag(filePath) + '\n' +
            `${content}\n` +
            '```\n\n';
        return formattedContent;
    }

    /**
     * Determines the language tag based on the file extension.
     * 
     * @param fileName - The name of the file.
     * @returns The appropriate language tag for syntax highlighting.
     */
    private getLanguageTag(fileName: string): string {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'ts':
            case 'tsx':
                return 'typescript';
            case 'js':
            case 'jsx':
                return 'javascript';
            case 'py':
                return 'python';
            default:
                return '';
        }
    }
}