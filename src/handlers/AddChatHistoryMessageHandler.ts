// src/handlers/AddChatHistoryMessageHandler.ts

import { inject, injectable } from 'inversify';
import { requestHandler, RequestHandler } from 'mediatr-ts';
import TYPES from '../inversify.types';
import { AddChatHistoryMessageRequest } from '../requests/AddChatHistoryMessageRequest';
import { ChatHistoryManager } from '../services/ChatHistoryManager';

@injectable()
@requestHandler(AddChatHistoryMessageRequest)
export class AddChatHistoryMessageHandler implements RequestHandler<AddChatHistoryMessageRequest, void> {
    constructor(
        @inject(TYPES.ChatHistoryManager) private chatHistoryManager: ChatHistoryManager
    ) { }

    async handle(request: AddChatHistoryMessageRequest): Promise<void> {
        this.chatHistoryManager.addMessage(request.role, request.message);
    }
}
