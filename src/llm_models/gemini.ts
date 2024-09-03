// llm_models/gemini.ts

/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/naming-convention */
/**
 * @author Pengfei Ni
 *
 * @license
 * Copyright (c) 2024 - Present, Pengfei Ni
 *
 * All rights reserved. Code licensed under the ISC license
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
*/
import { ChatGptViewProvider } from "../chatgptViewProvider";
import { ModelConfig } from "../model-config";

// initGeminiModel initializes the Gemini model with the given parameters.
export async function initGeminiModel(viewProvider: ChatGptViewProvider, config: ModelConfig) {
    if (config.modelSource === "VertexAI") {
        // Lazy import for Vertex AI SDK
        const { VertexAI } = await import('@google-cloud/vertexai');

        // Initialize Vertex AI with your Cloud project and location
        const vertexAI = new VertexAI({ project: config.organization, location: "us-central1" });

        // Instantiate the model
        const generativeModel = vertexAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // Start a chat session
        const chat = generativeModel.startChat({});
        viewProvider.apiChat = chat; // Store the chat instance
    } else {
        // Lazy import for Google AI SDK
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');

        const gemini = createGoogleGenerativeAI({
            baseURL: config.apiBaseUrl,
            apiKey: config.apiKey,
        });
        const model = viewProvider.modelManager.model ? viewProvider.modelManager.model : "gemini-1.5-flash-latest";
        viewProvider.apiChat = gemini("models/" + model);
    }
}

export async function chatCompletion(
    provider: ChatGptViewProvider,
    question: string,
    updateResponse: (message: string) => void,
    additionalContext: string = "",
) {
    throw Error('Not implemented yet');
}
