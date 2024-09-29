// src/handlers/ShowSideBySideComparisonHandler.ts

import { inject, injectable } from 'inversify';
import { requestHandler, RequestHandler } from 'mediatr-ts';
import TYPES from "../inversify.types";
import { ShowSideBySideComparisonRequest } from '../requests/ShowSideBySideComparisonRequest';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

@injectable()
@requestHandler(ShowSideBySideComparisonRequest)
export class ShowSideBySideComparisonHandler implements RequestHandler<ShowSideBySideComparisonRequest, void> {
    constructor(
        @inject(TYPES.ChatGptViewProvider) private provider: ChatGptViewProvider
    ) { }

    /**
     * Handles the request to show a side-by-side comparison of the original 
     * file and the generated docstring.
     * 
     * @param request - An instance of `ShowSideBySideComparisonRequest` 
     * containing the paths of the original file and the generated docstring.
     * @returns A promise that resolves when the comparison is shown.
     */
    async handle(request: ShowSideBySideComparisonRequest): Promise<void> {
        await this.provider.showSideBySideComparison(request.originalFilePath, request.generatedDocstringPath);
    }
}