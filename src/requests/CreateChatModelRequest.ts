// src/requests/CreateChatModelRequest.ts

import { RequestData } from 'mediatr-ts';
import { IChatModel } from '../interfaces/IChatModel';
import { ChatGptViewProvider } from "../view";

export class CreateChatModelRequest extends RequestData<IChatModel | null> {
    constructor(public provider: ChatGptViewProvider) {
        super();
    }
}