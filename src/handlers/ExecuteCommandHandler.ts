// src/handlers/ExecuteCommandHandler.ts

import { inject, injectable } from 'inversify';
import { requestHandler, RequestHandler } from 'mediatr-ts';
import { CommandHandler } from '../controllers/CommandHandler';
import TYPES from "../inversify.types";
import { ExecuteCommandRequest } from '../requests/ExecuteCommandRequest';

@injectable()
@requestHandler(ExecuteCommandRequest)
export class ExecuteCommandHandler implements RequestHandler<ExecuteCommandRequest, void> {
    constructor(
        @inject(TYPES.CommandHandler) private commandHandler: CommandHandler
    ) { }

    async handle(request: ExecuteCommandRequest): Promise<void> {
        // Use the CommandHandler to execute the command
        await this.commandHandler.executeCommand(request.commandType, request.data);
    }
}
