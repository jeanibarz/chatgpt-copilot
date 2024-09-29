// src/requests/ShowSideBySideComparisonRequest.ts

import { RequestData } from 'mediatr-ts';

export class ShowSideBySideComparisonRequest extends RequestData<void> {
    constructor(public originalFilePath: string, public generatedDocstringPath: string) {
        super();
    }
}
