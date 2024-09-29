// src/requests/ConfigurationChangedRequest.ts

import { RequestData } from 'mediatr-ts';

export class ConfigurationChangedRequest extends RequestData<void> {
    constructor(public key: string, public newValue: any) {
        super();
    }
}
