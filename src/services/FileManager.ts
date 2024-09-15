import * as fs from 'fs';
import * as path from 'path';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

/**
 * A utility class for managing file system operations, including file search and content retrieval.
 * 
 * The `FileManager` class provides methods to navigate directories, read file contents,
 * count lines in files, and find files based on specified inclusion and exclusion patterns.
 * It logs relevant information and errors encountered during these operations.
 * 
 * Key Features:
 * - Recursively walks through directories to gather file paths.
 * - Reads the content of files and counts lines.
 * - Finds files matching specific patterns while logging progress and errors.
 */
export class FileManager {
    private logger: ChatGptViewProvider['logger'];

    /**
     * Creates an instance of `FileManager`.
     * 
     * @param logger - An instance of `ChatGptViewProvider.logger` for logging events.
     */
    constructor(logger: ChatGptViewProvider['logger']) {
        this.logger = logger;
    }

    /**
     * Walks through a directory recursively and returns a list of file paths.
     * Logs any errors encountered during the traversal.
     * 
     * @param dir - Directory path to start from.
     * @returns Array of file paths found in the directory.
     */
    public walk(dir: string): string[] {
        let fileList: string[] = [];
        try {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    fileList = fileList.concat(this.walk(fullPath));
                } else {
                    fileList.push(fullPath);
                }
            }
        } catch (error) {
            this.logger.error(`Error while walking through directory: ${dir}`, { error });
        }

        return fileList;
    }

    /**
     * Retrieves the content of a file.
     * 
     * @param filePath - Path of the file.
     * @returns Content of the file as a string.
     */
    public readFileContent(filePath: string): string {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
            this.logger.error(`Error reading file: ${filePath}`, { error });
            return '';
        }
    }

    /**
     * Asynchronously retrieves the content of a file along with the line count.
     * 
     * @param file - Path of the file.
     * @returns A promise that resolves to an object containing the file content and line count.
     */
    public async readFileContentWithLineCount(file: string): Promise<{ content: string; lineCount: number }> {
        const content = await fs.promises.readFile(file, 'utf-8');
        const lineCount = content.split('\n').length;
        return { content, lineCount };
    }

    /**
     * Asynchronously retrieves the content of multiple files.
     * 
     * @param filePaths - An array of file paths to read.
     * @returns A promise that resolves to an array of file contents.
     */
    public async getFilesContent(filePaths: string[]): Promise<string[]> {
        const contents: string[] = [];

        for (const filePath of filePaths) {
            try {
                const content = await fs.promises.readFile(filePath, 'utf-8');
                contents.push(content);
            } catch (error) {
                this.logger.error(`Error reading file: ${filePath}`, { error });
                contents.push(''); // Push an empty string if there's an error reading the file
            }
        }

        return contents;
    }

    /**
     * Counts the number of lines in the specified file.
     * 
     * @param filePath - Path of the file to count lines in.
     * @returns Number of lines in the file.
     */
    public static getLineCount(filePath: string): number {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return fileContent.split('\n').length;
    }

    /**
     * Finds files that match the inclusion/exclusion patterns.
     * Logs detailed information about the files being processed and handles errors gracefully.
     * 
     * @param explicitFiles - Array of files and directories to search within.
     * @param inclusionPattern - Regex pattern for inclusion.
     * @param exclusionPattern - Optional regex pattern for exclusion.
     * @returns Array of file paths that match the criteria.
     */
    public findMatchingFiles(
        explicitFiles: string[], 
        inclusionPattern: RegExp, 
        exclusionPattern?: RegExp
    ): string[] {
        let matchedFiles: string[] = [];

        this.logger.info("Starting to find matching files.");
        this.logger.info("Explicit files and folders", { explicitFiles });

        if (explicitFiles.length === 0) {
            this.logger.info('No files or folders are explicitly added to the ChatGPT context.');
            return [];
        }

        for (const filePath of explicitFiles) {
            try {
                const stat = fs.statSync(filePath);
                this.logger.info(`Processing ${stat.isDirectory() ? 'directory' : 'file'}: ${filePath}`);

                let files = stat.isDirectory() ? this.walk(filePath) : [filePath];

                // Filter files by inclusion and exclusion patterns
                files = files.filter(file => {
                    const isIncluded = inclusionPattern.test(file);
                    const isExcluded = exclusionPattern ? exclusionPattern.test(file) : false;
                    return isIncluded && !isExcluded;
                });

                matchedFiles = matchedFiles.concat(files);

                this.logger.info(`Matched files from ${filePath}: ${files}`);
            } catch (error) {
                this.logger.warn(`Failed to process file or folder: ${filePath}, error: ${error.message}`);
                // Continue processing other files/folders even if one fails
            }
        }

        this.logger.info("Final matched files", { matchedFiles });
        return matchedFiles;
    }
}