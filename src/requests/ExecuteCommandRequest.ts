// src/requests/ExecuteCommandRequest.ts

import { RequestData } from 'mediatr-ts';
import { ChatGPTCommandType } from '../interfaces/enums/ChatGPTCommandType';

export class ExecuteCommandRequest extends RequestData<void> {
    constructor(public commandType: ChatGPTCommandType, public data: any) {
        super();
    }
}
