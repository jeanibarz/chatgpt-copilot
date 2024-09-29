// src/handlers/CreateChatModelHandler.ts

import { inject, injectable } from 'inversify';
import { requestHandler, RequestHandler } from 'mediatr-ts';
import { IChatModel } from '../interfaces/IChatModel';
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { ChatModelFactory } from '../models/llm_models/ChatModelFactory';
import { CreateChatModelRequest } from '../requests/CreateChatModelRequest';

@injectable()
@requestHandler(CreateChatModelRequest)
export class CreateChatModelHandler implements RequestHandler<CreateChatModelRequest, IChatModel | null> {
    constructor(
        @inject(TYPES.CoreLogger) private logger: CoreLogger,
        @inject(TYPES.ChatModelFactory) private chatModelFactory: typeof ChatModelFactory
    ) { }

    async handle(request: CreateChatModelRequest): Promise<IChatModel | null> {
        try {
            // Use the provider passed in the request
            const model = await this.chatModelFactory.createChatModel(request.provider);
            this.logger.info('Chat model created successfully');
            return model;
        } catch (error) {
            this.logger.logError(error, "Failed to create chat model", true);
            return null;
        }
    }
}
