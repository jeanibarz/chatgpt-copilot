// // src/view/ChatGptViewProviderFactory.ts

// /**
//  * 
//  * 
//  * This module contains a factory function for creating an instance of the `ChatGptViewProvider`.
//  * It initializes all necessary dependencies, including the webview manager, model manager,
//  * configuration manager, command handler, and chat history manager.
//  * 
//  * The factory function ensures that the `ChatGptViewProvider` is properly configured
//  * before being used, promoting better organization and maintainability within the codebase.
//  * 
//  * Key Features:
//  * - Creates and initializes the `ChatGptViewProvider` with required dependencies.
//  * - Sets up the command handler to work in conjunction with the view provider.
//  */

// import { interfaces } from "inversify";
// import * as vscode from "vscode";
// import { container } from "../inversify.config";
// import TYPES from "../inversify.types";
// import { CoreLogger } from "../logging/CoreLogger";
// import {
//     ExplicitFilesManager
// } from "../services";
// import { FilteredTreeDataProvider, TreeRenderer } from "../tree";
// import { ChatGptViewProvider } from "./ChatGptViewProvider";

// /**
//  * Creates and returns an instance of `ChatGptViewProvider` with all necessary dependencies initialized.
//  * 
//  * @param context - The extension context provided by VS Code.
//  * @param workspaceRoot - The root directory of the workspace.
//  * @param logger - An instance of `CoreLogger` for logging events.
//  * @returns An instance of `ChatGptViewProvider` configured with the provided context and logger.
//  */
// export async function createChatGptViewProvider(
//     context: vscode.ExtensionContext,
//     workspaceRoot: string,
//     logger: CoreLogger,
// ): Promise<ChatGptViewProvider | undefined> {
//     try {
//         // Bind ExtensionContext
//         container.bind<vscode.ExtensionContext>(TYPES.ExtensionContext).toConstantValue(context);

//         // Bind FilteredTreeDataProvider with dynamic value
//         container.bind<FilteredTreeDataProvider>(TYPES.FilteredTreeDataProvider).toDynamicValue((ctx: interfaces.Context) => {
//             const explicitFilesManager = ctx.container.get<ExplicitFilesManager>(TYPES.ExplicitFilesManager);
//             const treeRenderer = ctx.container.get<TreeRenderer>(TYPES.TreeRenderer);
//             const extensionContext = ctx.container.get<vscode.ExtensionContext>(TYPES.ExtensionContext);
//             return new FilteredTreeDataProvider(workspaceRoot, explicitFilesManager, treeRenderer, extensionContext);
//         }).inSingletonScope();

//         // Bind ChatGptViewProvider
//         container.bind<ChatGptViewProvider>(TYPES.ChatGptViewProvider).to(ChatGptViewProvider).inSingletonScope();

//         // Resolve ChatGptViewProvider
//         logger.info("Resolving ChatGptViewProvider");
//         const provider = container.get<ChatGptViewProvider>(TYPES.ChatGptViewProvider);
//         logger.info("ChatGptViewProvider resolved");

//         // Register Tree Data Provider
//         vscode.window.registerTreeDataProvider('chatgpt-copilot.project-explorer', provider.treeDataProvider);
//         logger.info("Tree Data Provider registered");

//         return provider;
//     } catch {
//         console.log('bou');
//     }
// }