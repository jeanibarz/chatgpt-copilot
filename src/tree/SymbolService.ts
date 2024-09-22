// src/services/SymbolService.ts

import * as vscode from 'vscode';
import { CoreLogger } from '../logging/CoreLogger';


export class SymbolService {
    private logger = CoreLogger.getInstance();
    private symbolCache: Map<string, vscode.DocumentSymbol[]> = new Map();

    /**
     * Checks if a file has symbols.
     * @param filePath - The file path.
     * @returns True if the file has symbols; otherwise, false.
     */
    async hasFileSymbols(filePath: string): Promise<boolean> {
        const symbols = await this.getFileSymbols(filePath);
        return symbols ? symbols.length > 0 : false;
    }

    /**
     * Retrieves symbols for a file.
     * @param filePath - The file path.
     * @returns An array of DocumentSymbol or undefined.
     */
    async getFileSymbols(filePath: string): Promise<vscode.DocumentSymbol[] | undefined> {
        if (this.symbolCache.has(filePath)) {
            return this.symbolCache.get(filePath);
        }

        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                uri
            );

            if (symbols) {
                this.symbolCache.set(filePath, symbols);
                return symbols;
            }
        } catch (error) {
            this.logger.error(`Error retrieving symbols for "${filePath}": ${error instanceof Error ? error.message : String(error)}`);
        }

        return undefined;
    }

    /**
     * Flattens nested symbols into a flat array.
     * @param symbols - The nested DocumentSymbols.
     * @returns A flat array of DocumentSymbols.
     */
    flattenSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
        const flat: vscode.DocumentSymbol[] = [];

        const traverse = (symbolArray: vscode.DocumentSymbol[]) => {
            for (const symbol of symbolArray) {
                flat.push(symbol);
                if (symbol.children && symbol.children.length > 0) {
                    traverse(symbol.children);
                }
            }
        };

        traverse(symbols);
        return flat;
    }

    /**
     * Clears the symbol cache.
     */
    clearSymbolCache(): void {
        this.symbolCache.clear();
    }

    /**
     * Retrieves the symbols of a file node and adds a 'symbol path' for each symbol.
     * 
     * @param fullPath - The full path of the file to retrieve symbols from.
     * @returns A promise that resolves to an array of `vscode.DocumentSymbol` objects with their full paths.
     */
    async getFileSymbolsWithPath(fullPath: string): Promise<{ symbolPath: string, symbol: vscode.DocumentSymbol; }[]> {
        try {
            const document = await vscode.workspace.openTextDocument(fullPath);
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            );

            if (!symbols || symbols.length === 0) {
                return [];
            }

            const flatSymbols = this.flattenSymbols(symbols);
            return flatSymbols.map(symbol => ({
                symbolPath: this.getSymbolPath(symbol, ''),
                symbol: symbol
            }));
        } catch (error) {
            this.logger.error(`Error retrieving symbols for file: ${fullPath}`, { error });
            return [];
        }
    }

    /**
     * Gets the path of a symbol within the file (e.g., `ClassA::MethodB::VariableC`).
     * 
     * @param symbol - The current symbol to generate the path for.
     * @param parentPath - The parent path (for recursive calls).
     * @returns The full symbol path.
     */
    private getSymbolPath(symbol: vscode.DocumentSymbol, parentPath: string): string {
        const currentPath = parentPath ? `${parentPath}::${symbol.name}` : symbol.name;

        if (symbol.children && symbol.children.length > 0) {
            return symbol.children.map(child => this.getSymbolPath(child, currentPath)).join('::');
        }

        return currentPath;
    }
}
