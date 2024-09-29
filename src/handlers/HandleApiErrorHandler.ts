// src/handlers/HandleApiErrorHandler.ts

import { inject, injectable } from 'inversify';
import { requestHandler, RequestHandler } from 'mediatr-ts';
import { ErrorHandler } from '../errors/ErrorHandler';
import TYPES from '../inversify.types';
import { HandleApiErrorRequest } from '../requests/HandleApiErrorRequest';

@injectable()
@requestHandler(HandleApiErrorRequest)
export class HandleApiErrorHandler implements RequestHandler<HandleApiErrorRequest, void> {
    constructor(
        @inject(TYPES.ErrorHandler) private errorHandler: ErrorHandler
    ) { }

    async handle(request: HandleApiErrorRequest): Promise<void> {
        try {
            // Forward the request parameters to the error handler
            this.errorHandler.handleApiError(
                request.error,
                request.options,
                request.sendMessage,
            );
        } catch (err) {
            console.error('Error handling API error:', err);  // Log any unexpected errors during the handling
        }
    }
}
