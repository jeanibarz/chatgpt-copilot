// src/handlers/SendApiRequestHandler.ts

import { inject, injectable } from 'inversify';
import { requestHandler, RequestHandler } from 'mediatr-ts';
import TYPES from '../inversify.types';
import { SendApiRequest } from '../requests/SendApiRequest';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

@injectable()
@requestHandler(SendApiRequest)
export class SendApiRequestHandler implements RequestHandler<SendApiRequest, void> {
    constructor(
        @inject(TYPES.ChatGptViewProvider) private provider: ChatGptViewProvider
    ) { }

    async handle(request: SendApiRequest): Promise<void> {
        await this.provider.sendApiRequest(request.prompt, request.options);
    }
}
