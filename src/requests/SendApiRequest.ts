// src/requests/SendApiRequest.ts

import { RequestData } from 'mediatr-ts';
import { ApiRequestOptions } from '../interfaces';

export class SendApiRequest extends RequestData<void> {
    constructor(
        public prompt: string,
        public options: ApiRequestOptions
    ) {
        super();
    }
}
