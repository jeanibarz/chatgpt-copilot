// src/requests/AddChatHistoryMessageRequest.ts

import { RequestData } from 'mediatr-ts';
import { MessageRole } from '../services/ChatHistoryManager';

export class AddChatHistoryMessageRequest extends RequestData<void> {
    constructor(public role: MessageRole, public message: string) {
        super();
    }
}
