// src/handlers/ConfigurationChangedHandler.ts

import { inject, injectable } from 'inversify';
import { requestHandler, RequestHandler } from 'mediatr-ts';
import TYPES from "../inversify.types";
import { ConfigurationChangedRequest } from '../requests/ConfigurationChangedRequest';
import { ConfigurationManager } from '../services/ConfigurationManager';

@injectable()
@requestHandler(ConfigurationChangedRequest)
export class ConfigurationChangedHandler implements RequestHandler<ConfigurationChangedRequest, void> {
    constructor(
        @inject(TYPES.ConfigurationManager) private configurationManager: ConfigurationManager
    ) { }

    async handle(request: ConfigurationChangedRequest): Promise<void> {
        // Assuming ConfigurationManager has a method to handle specific key-value changes
        this.configurationManager.loadConfiguration();

        // If needed, you can log or perform additional actions based on the key or newValue
        console.log(`Configuration key '${request.key}' changed to:`, request.newValue);
    }
}
