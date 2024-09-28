import { Semaphore } from 'async-mutex';
import * as path from 'path';
import * as vscode from 'vscode';
import { RenderMethod } from "../interfaces";
import { CoreLogger } from "../logging/CoreLogger";
import { ExplicitFilesManager } from "../services";
import { Utility } from "../Utility";
import { TreeRenderer } from "./TreeRenderer";

export class FilteredTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private treeSemaphore = new Semaphore(1); // Only allow one operation (refresh or render) at a time.
    private ongoingLineCountTasks = 0; // Track how many files are still being processed

    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null> = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null> = this._onDidChangeTreeData.event;
    private logger = CoreLogger.getInstance({ "loggerName": "ChatGPT - Context Explorer" });
    private cachedFilteredFiles: string[] | null = null;

    private normalizedMatchedFiles: Set<string> = new Set();
    private normalizedMatchedFolders: Set<string> = new Set();

    // Cache for line counts
    private cachedLineCounts: Map<string, number> = new Map();
    private cachedFolderLineCounts: Map<string, number> = new Map();

    private lineCountSemaphore = new Semaphore(10); // Limit to 10 concurrent line counts

    constructor(
        private workspaceRoot: string | undefined,
        public explicitFilesManager: ExplicitFilesManager,
        private treeRenderer: TreeRenderer,
        private context: vscode.ExtensionContext,
    ) {
        this.workspaceRoot = workspaceRoot ? path.resolve(workspaceRoot) : undefined;
        if (!this.workspaceRoot) {
            this.logger.warn('Workspace root is undefined.');
        }

        // Load cached line counts from workspace state
        this.loadCachedLineCounts();

        // Initialize matched paths
        this.updateMatchedPaths();
    }

    /**
     * Initializes line counts for all filtered files.
     * This method traverses all filtered files, counts their lines, and updates folder line counts accordingly.
     */
    public async initializeLineCounts(): Promise<void> {
        if (!this.workspaceRoot) {
            return;
        }

        try {
            const allFiles = await this.getAllFilteredFiles();

            this.logger.debug(`Initializing line counts for ${allFiles.length} files.`);

            // Count lines for all files
            const fileLineCountPromises = allFiles.map(async (filePath) => {
                const count = await this.countLines(filePath);
                this.cachedLineCounts.set(filePath, count);
                return { filePath, count };
            });

            const fileLineCounts = await Promise.all(fileLineCountPromises);

            // Collect all folders
            const allFolders = await this.getAllFilteredFolders();

            // Sort folders by depth (from deepest to shallowest)
            const sortedFolders = allFolders.sort((a, b) => {
                const depthA = (a.match(/\/|\\/g) || []).length;
                const depthB = (b.match(/\/|\\/g) || []).length;
                return depthB - depthA;
            });

            // Calculate folder line counts
            for (const folderPath of sortedFolders) {
                const totalLineCount = await this.calculateFolderLineCount(folderPath);
                this.cachedFolderLineCounts.set(folderPath, totalLineCount);
            }

            // All line counts are now calculated
            this.logger.debug('All line counts initialized.');
            this._onDidChangeTreeData.fire();

        } catch (error) {
            this.logger.error('Failed to initialize line counts.', { error });
        }
    }

    private async getAllFilteredFolders(): Promise<string[]> {
        if (!this.workspaceRoot) {
            return [];
        }

        const folderSet = new Set<string>();

        // Start collecting from the root element
        await this.collectFilteredFolders(this.workspaceRoot, folderSet);

        return Array.from(folderSet);
    }

    private async collectFilteredFolders(dirPath: string, folderSet: Set<string>): Promise<void> {
        if (!this.workspaceRoot) {
            return;
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));

            for (const [entry, fileType] of entries) {
                const fullPath = path.join(dirPath, entry);

                if ((fileType & vscode.FileType.Directory) !== 0 && this.shouldBeIncluded(fullPath)) {
                    // Add folder to the set
                    folderSet.add(fullPath);

                    // Recursively collect subfolders
                    await this.collectFilteredFolders(fullPath, folderSet);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to read directory: ${dirPath}`, { error });
        }
    }

    private async calculateFolderLineCount(folderPath: string): Promise<number> {
        let totalLineCount = 0;

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(folderPath));

            for (const [entry, fileType] of entries) {
                const fullPath = path.join(folderPath, entry);

                if ((fileType & vscode.FileType.File) !== 0 && this.shouldBeIncluded(fullPath)) {
                    // Get line count from cachedLineCounts
                    const fileLineCount = this.cachedLineCounts.get(fullPath);
                    if (fileLineCount !== undefined) {
                        totalLineCount += fileLineCount;
                    }
                } else if ((fileType & vscode.FileType.Directory) !== 0 && this.shouldBeIncluded(fullPath)) {
                    // Get line count from cachedFolderLineCounts
                    const folderLineCount = this.cachedFolderLineCounts.get(fullPath);
                    if (folderLineCount !== undefined) {
                        totalLineCount += folderLineCount;
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Failed to calculate line count for folder: ${folderPath}`, { error });
        }

        return totalLineCount;
    }


    private loadCachedLineCounts(): void {
        const fileLineCounts = this.context.workspaceState.get<{ [key: string]: number; }>('filteredFileExplorer.fileLineCounts', {});
        this.cachedLineCounts = new Map(Object.entries(fileLineCounts));

        const folderLineCounts = this.context.workspaceState.get<{ [key: string]: number; }>('filteredFileExplorer.folderLineCounts', {});
        this.cachedFolderLineCounts = new Map(Object.entries(folderLineCounts));

        this.logger.debug('Loaded cached line counts from workspace state.');
    }

    private saveCachedLineCounts(): void {
        const fileLineCounts: { [key: string]: number; } = {};
        this.cachedLineCounts.forEach((count, filePath) => {
            fileLineCounts[filePath] = count;
        });
        this.context.workspaceState.update('filteredFileExplorer.fileLineCounts', fileLineCounts);

        const folderLineCounts: { [key: string]: number; } = {};
        this.cachedFolderLineCounts.forEach((count, folderPath) => {
            folderLineCounts[folderPath] = count;
        });
        this.context.workspaceState.update('filteredFileExplorer.folderLineCounts', folderLineCounts);

        this.logger.debug('Saved cached line counts to workspace state.');
    }

    private updateMatchedPaths(): void {
        const matchedFiles = this.explicitFilesManager.getExplicitFilesArray();
        const matchedFolders = this.explicitFilesManager.getExplicitFoldersArray();

        this.normalizedMatchedFiles = new Set(matchedFiles.map(f => path.normalize(f)));
        this.normalizedMatchedFolders = new Set(matchedFolders.map(f => path.normalize(f)));
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        await this.treeSemaphore.acquire();

        try {
            if (!this.workspaceRoot) {
                vscode.window.showInformationMessage('No folder or workspace opened');
                return [];
            }

            const currentPath = element ? (element.resourceUri?.fsPath ?? '') : this.workspaceRoot;

            // Check if the currentPath is a directory before reading it
            const isDirectory = (await Utility.isDirectory(currentPath));

            if (!isDirectory) {
                return [];
            }

            const entries = await this.readDirectory(currentPath);
            const filteredEntries = entries.filter(([child]) => this.shouldBeIncluded(path.join(currentPath, child)));

            const treeItems: vscode.TreeItem[] = [];

            for (const [child, fileType] of filteredEntries) {
                const fullPath = path.join(currentPath, child);
                const treeItem = this.createTreeItem(fullPath, fileType);
                treeItems.push(treeItem);

                // If it's a file and line count not yet fetched, initiate line count
                if ((fileType & vscode.FileType.File) !== 0 && !this.cachedLineCounts.has(fullPath)) {
                    this.countLines(fullPath).catch(error => {
                        this.logger.error(`Failed to count lines in file: ${fullPath}`, { error });
                    });
                }
            }

            return treeItems;
        } catch (error) {
            this.logger.error("Error during tree rendering", { error });
            return [];
        } finally {
            this.treeSemaphore.release();
        }
    }


    private async readDirectory(dirPath: string): Promise<[string, vscode.FileType][]> {
        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));
            return entries;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to read directory: ${dirPath}`);
            this.logger.error(`Failed to read directory: ${dirPath}`, { error });
            return [];
        }
    }

    private shouldBeIncluded(filePath: string): boolean {
        const normalizedFilePath = path.normalize(filePath);

        // Check if the file path is exactly in matched files
        if (this.normalizedMatchedFiles.has(normalizedFilePath)) {
            return true;
        }

        // Check if any matched file is a sub-path of the filePath
        for (const matchedFile of this.normalizedMatchedFiles) {
            const normalizedMatchedFile = matchedFile; // Already normalized
            if (
                normalizedMatchedFile.startsWith(normalizedFilePath + path.sep) ||
                normalizedMatchedFile === normalizedFilePath
            ) {
                return true;
            }
        }

        // Check if the matched folders are equal to or sub-paths of the filePath
        for (const folder of this.normalizedMatchedFolders) {
            if (
                folder.startsWith(normalizedFilePath + path.sep) ||
                folder === normalizedFilePath
            ) {
                return true;
            }
        }

        return false;
    }



    private createTreeItem(filePath: string, fileType: vscode.FileType): vscode.TreeItem {
        const label = path.basename(filePath);
        const uri = vscode.Uri.file(filePath);

        let collapsibleState: vscode.TreeItemCollapsibleState;

        if (fileType === vscode.FileType.Directory) {
            collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        } else {
            collapsibleState = vscode.TreeItemCollapsibleState.None;
        }

        const treeItem = new vscode.TreeItem(label, collapsibleState);
        treeItem.resourceUri = uri;
        treeItem.contextValue = collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ? 'folder' : 'file';
        treeItem.tooltip = filePath;

        const normalizedFilePath = path.normalize(filePath);

        if (fileType === vscode.FileType.File) {
            const lineCount = this.cachedLineCounts.get(normalizedFilePath);

            if (lineCount !== undefined) {
                treeItem.description = `${lineCount} lines`;
            } else {
                treeItem.description = 'Counting lines...';
            }
        } else if (fileType === vscode.FileType.Directory) {
            const folderLineCount = this.cachedFolderLineCounts.get(normalizedFilePath);
            if (folderLineCount !== undefined) {
                treeItem.description = `${folderLineCount} lines`;
            } else {
                treeItem.description = 'Calculating lines...';
            }
        }

        return treeItem;
    }

    /**
     * Counts the number of lines in the given file.
     * @param filePath - The path of the file to count lines.
     * @returns The number of lines in the file.
     */
    private async countLines(filePath: string): Promise<number> {
        await this.lineCountSemaphore.acquire();
        try {
            const fileUri = vscode.Uri.file(filePath);
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const contentString = Buffer.from(fileContent).toString('utf8');
            const lines = contentString.split(/\r?\n/).length;
            return lines;
        } catch (error) {
            this.logger.error(`Failed to read file for line count: ${filePath}`, { error });
            return 0;
        } finally {
            this.lineCountSemaphore.release();
        }
    }

    /**
     * Updates the line counts of all ancestor folders when a file's line count is fetched.
     * @param filePath - The path of the file.
     * @param lineCount - The number of lines in the file.
     */
    private updateFolderLineCounts(filePath: string, lineCount: number): void {
        if (!this.workspaceRoot) {
            this.logger.warn(`Cannot update folder line counts as workspaceRoot is undefined for file: ${filePath}`);
            return;
        }

        let currentDir = path.dirname(filePath);
        while (currentDir.startsWith(this.workspaceRoot)) {
            const normalizedDir = path.normalize(currentDir);
            const currentCount = this.cachedFolderLineCounts.get(normalizedDir) || 0;
            this.cachedFolderLineCounts.set(normalizedDir, currentCount + lineCount);
            this.logger.debug(`Updated folder: ${normalizedDir} with +${lineCount} lines. Total: ${this.cachedFolderLineCounts.get(normalizedDir)}`);
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) break; // Reached the root
            currentDir = parentDir;
        }
    }

    /**
     * Subtracts the line counts from all ancestor folders when a file is removed.
     * @param filePath - The path of the file.
     * @param lineCount - The number of lines in the file.
     */
    private subtractFolderLineCounts(filePath: string, lineCount: number): void {
        if (!this.workspaceRoot) {
            this.logger.warn(`Cannot subtract folder line counts as workspaceRoot is undefined for file: ${filePath}`);
            return;
        }

        let currentDir = path.dirname(filePath);
        while (currentDir.startsWith(this.workspaceRoot)) {
            const normalizedDir = path.normalize(currentDir);
            const currentCount = this.cachedFolderLineCounts.get(normalizedDir) || 0;
            this.cachedFolderLineCounts.set(normalizedDir, currentCount - lineCount);
            this.logger.debug(`Subtracted ${lineCount} lines from folder: ${normalizedDir}. New Total: ${this.cachedFolderLineCounts.get(normalizedDir)}`);
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) break; // Reached the root
            currentDir = parentDir;
        }
    }

    /**
     * Retrieves all files that match the filtered view, using caching.
     * @returns An array of file paths that match the filter.
     */
    public async getAllFilteredFiles(): Promise<string[]> {
        // Return cached results if available
        if (this.cachedFilteredFiles !== null) {
            return this.cachedFilteredFiles;
        }

        // Return if workspaceRoot is not defined
        if (!this.workspaceRoot) {
            return [];
        }

        // Otherwise, calculate the filtered files
        const result: string[] = [];
        await this.collectFilteredFiles(this.workspaceRoot, result);

        // Cache the result for future use
        this.cachedFilteredFiles = result;
        return result;
    }


    /**
     * Helper method to recursively collect files that pass the filter.
     * @param dirPath - The current directory to scan.
     * @param result - The array to store matching files.
     */
    private async collectFilteredFiles(dirPath: string, result: string[]): Promise<void> {
        if (!this.workspaceRoot) {
            this.logger.warn(`Cannot collect filtered files as workspaceRoot is undefined for directory: ${dirPath}`);
            return;
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));

            for (const [entry, fileType] of entries) {
                const fullPath = path.join(dirPath, entry);

                if ((fileType & vscode.FileType.Directory) !== 0) {
                    // It's a directory
                    if (this.shouldBeIncluded(fullPath)) {
                        // Recursively collect files from subdirectories
                        await this.collectFilteredFiles(fullPath, result);
                    }
                } else if ((fileType & vscode.FileType.File) !== 0 && this.shouldBeIncluded(fullPath)) {
                    // It's a file
                    result.push(fullPath);
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to read directory: ${dirPath}`);
            this.logger.error(`Failed to read directory: ${dirPath}`, { error });
        }
    }

    async refresh(): Promise<void> {
        this.logger.debug('Refresh initiated.');
        await this.treeSemaphore.acquire();

        try {
            this.invalidateCache();
            this.updateMatchedPaths();
            await Promise.all([
                this.getAllFilteredFiles(),
                this.initializeLineCounts()
            ]);
            this.saveCachedLineCounts();
            this._onDidChangeTreeData.fire();
            this.logger.debug('Refresh completed successfully.');
        } catch (error) {
            this.logger.error("Error during tree refresh", { error });
        } finally {
            this.treeSemaphore.release(); // Release the semaphore after refreshing
        }
    }

    /**
     * Invalidates the cached filtered files, forcing a recalculation next time they are requested.
     */
    private invalidateCache(): void {
        this.cachedFilteredFiles = null;
        this.cachedLineCounts.clear();
        this.cachedFolderLineCounts.clear();
    }

    /**
     * Renders the tree in the specified format.
     * @param format - The render format.
     * @returns A string representing the tree.
    */
    public async renderTree(format: RenderMethod): Promise<string> {
        await this.treeSemaphore.acquire();

        try {
            if (this.ongoingLineCountTasks > 0) {
                await this.waitForLineCountsToFinish();
            }

            return this.treeRenderer.renderTree(format, this);
        } catch (error) {
            this.logger.error(`Error rendering tree: ${error instanceof Error ? error.message : String(error)}`);
            return '';
        } finally {
            this.treeSemaphore.release();
        }
    }

    /**
     * Wait until all line counting tasks have completed.
     */
    private async waitForLineCountsToFinish(): Promise<void> {
        while (this.ongoingLineCountTasks > 0) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
        }
    }
}
