export interface IDocstringService {
    generateDocstring(
        prompt: string,
        updateResponse?: (message: string) => void
    ): Promise<string>;
}
