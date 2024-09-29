// src/requests/SendMessageRequest.ts

import { RequestData } from 'mediatr-ts';
import { IChatGPTMessage } from '../interfaces/IChatGPTMessage'; // Adjust the import path as needed

export class SendMessageRequest extends RequestData<void> {
    constructor(public message: IChatGPTMessage) {
        super();
    }
}
