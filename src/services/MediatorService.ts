// src/services/MediatorService.ts

/**
 * This module provides the MediatorService class, which facilitates the
 * sending of requests through the Mediator pattern using the mediatr-ts library.
 */

import { injectable } from "inversify";
import { Mediator, RequestData } from 'mediatr-ts';

@injectable()
export class MediatorService {
    private mediator: Mediator;

    constructor() {
        this.mediator = new Mediator();
    }

    /**
     * Sends a request using the mediator and returns the response.
     * 
     * @param request - The request object that contains the data to be sent.
     * @returns A promise that resolves to the response of type TResponse.
     */
    public async send<TRequest extends RequestData<TResponse>, TResponse>(request: TRequest): Promise<TResponse> {
        return await this.mediator.send(request);
    }
}