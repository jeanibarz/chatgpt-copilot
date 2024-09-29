// src/handlers/SendMessageHandler.ts

/**
 * This module handles the sending of messages within a VS Code extension. 
 * It defines the `SendMessageHandler` class, which is responsible for 
 * processing `SendMessageRequest` instances and utilizing the `WebviewManager` 
 * to send messages to the user interface.
 * 
 * Key Features:
 * - Processes send message requests.
 * - Integrates with the WebviewManager to facilitate message delivery.
 */

import { inject, injectable } from 'inversify';
import { requestHandler, RequestHandler } from 'mediatr-ts';
import TYPES from "../inversify.types";
import { SendMessageRequest } from '../requests/SendMessageRequest';
import { WebviewManager } from '../view/WebviewManager';

@injectable()
@requestHandler(SendMessageRequest)
export class SendMessageHandler implements RequestHandler<SendMessageRequest, void> {
    /**
     * Constructor for the `SendMessageHandler` class.
     * Initializes a new instance of the SendMessageHandler with the specified 
     * WebviewManager for message handling.
     * 
     * @param webviewManager - An instance of `WebviewManager` used to send messages.
     */
    constructor(
        @inject(TYPES.WebviewManager) private webviewManager: WebviewManager
    ) { }

    /**
     * Handles the incoming send message request.
     * This method retrieves the message from the request and uses the 
     * WebviewManager to send it to the UI.
     * 
     * @param request - An instance of `SendMessageRequest` containing the message to be sent.
     * @returns A promise that resolves when the message has been sent.
     */
    async handle(request: SendMessageRequest): Promise<void> {
        this.webviewManager.sendMessage(request.message);
    }
}