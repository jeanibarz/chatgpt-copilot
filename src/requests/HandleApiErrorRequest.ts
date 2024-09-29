// src/requests/HandleApiErrorRequest.ts

import { RequestData } from 'mediatr-ts';

export class HandleApiErrorRequest extends RequestData<void> {
    constructor(
        public error: any,
        public options: any,
        public sendMessage: (message: any) => void,
    ) {
        super();
    }
}
