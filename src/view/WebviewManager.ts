// src/view/WebviewManager.ts

/**
 * 
 * This module provides a management system for webviews within a VS Code extension.
 * It handles the initialization and configuration of webviews, including setting up 
 * HTML content and managing communication between the webview and the extension.
 * 
 * The `WebviewManager` class is responsible for creating and managing webviews, 
 * providing methods to initialize them with specific content, send messages to 
 * the webview, and generate the necessary HTML and resources for display.
 * 
 * Key Features:
 * - Initializes webviews with customizable HTML content.
 * - Supports message sending to the webview.
 * - Generates resource URIs for scripts and stylesheets.
 * - Handles detailed error logging related to webview operations.
 */

import * as fs from "fs";
import { inject, injectable } from "inversify";
import * as path from "path";
import * as vscode from "vscode";
import { WebviewMessageHandler } from ".";
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { StateManager } from "../state/StateManager";
import { Utility } from "../Utility";

/**
 * The `WebviewManager` class manages the setup and communication of webviews 
 * within the extension. It provides methods for initializing webviews and 
 * sending messages to them.
 */
@injectable()
export class WebviewManager {
  private logger = CoreLogger.getInstance(); // Logger instance for logging events
  private webviewView?: vscode.WebviewView; // The webview view instance
  private messageHandler: WebviewMessageHandler;

  constructor(
    @inject(TYPES.WebviewMessageHandler) messageHandler: WebviewMessageHandler,
  ) {
    this.messageHandler = messageHandler;
    this.logger.info("WebviewManager initialized");
  }

  /**
   * Sets up the webview with HTML content and webview options.
   * 
   * @param webviewView - The webview view to be set up.
   * @param nonce - A nonce value for security purposes.
   * @throws Will throw an error if the HTML generation fails.
   */
  public initializeWebView(
    webviewView: vscode.WebviewView,
    nonce: string
  ) {
    const stateManager = StateManager.getInstance();
    const extensionContext = stateManager.getExtensionContext();

    this.webviewView = webviewView;
    this.logger.info("Webview instance set successfully");
    this.webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionContext.extensionUri],
    };
    this.logger.debug("Webview options configured", { enableScripts: true, localResourceRoots: extensionContext.extensionUri.toString() });

    try {
      this.webviewView.webview.html = this.generateWebviewHtml(nonce);
      this.logger.info("Webview HTML content generated and set successfully");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to generate webview HTML: ${error.message}`, { stack: error.stack });
      } else {
        this.logger.error(`Failed to generate webview HTML: Unexpected error type`, { error: String(error) });
      }
      throw error;
    }
  }

  public setupWebview(webviewView: vscode.WebviewView) {
    this.webviewView = webviewView;
    const nonce = Utility.getRandomId();
    this.logger.debug("Setting up webview", { nonce });
    this.initializeWebView(webviewView, nonce);
    this.messageHandler.handleMessages(webviewView);
    this.logger.info("Webview setup completed successfully");
  }

  /** 
   * Sends a message to the webview and handles cases where the webview is not focused.
   * 
   * @param message - The message to be sent to the webview.
   */
  public sendMessage(message: any) {
    if (this.webviewView) {
      this.webviewView.webview.postMessage(message);
      this.logger.debug("Message sent to webview", { messageType: message.type });
    } else {
      this.logger.error("Failed to send message: Webview is not set", { message });
    }
  }

  /**
   * Generates the HTML content for the webview.
   * 
   * @param nonce - A nonce value for security purposes.
   * @returns The generated HTML content for the webview.
   * @throws Will throw an error if the webview is not set.
   */
  private generateWebviewHtml(nonce: string): string {
    if (!this.webviewView) {
      const error = new Error("Cannot generate HTML without a valid webview.");
      this.logger.error(error.message);
      throw error;
    }

    const stateManager = StateManager.getInstance();
    const extensionContext = stateManager.getExtensionContext();

    const webviewHtmlPath = vscode.Uri.file(path.join(extensionContext.extensionUri.fsPath, "media", "webview.html"));
    this.logger.debug("Reading webview HTML template", { path: webviewHtmlPath.fsPath });
    let html = fs.readFileSync(webviewHtmlPath.fsPath, "utf8");

    const resourceUris = this.generateResourceUris();
    html = this.replacePlaceholders(html, resourceUris, nonce);
    this.logger.info("Webview HTML content generated successfully");
    return html;
  }

  /**
   * Generates URIs for various resources used in the webview.
   * 
   * @returns An object containing URIs for scripts and stylesheets.
   */
  private generateResourceUris() {
    const extensionUri = StateManager.getInstance().getExtensionContext().extensionUri;
    const webview = this.webviewView!.webview;
    const uris = {
      scriptUri: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionUri.fsPath, "media", "main.js")),
      ),
      stylesMainUri: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionUri.fsPath, "media", "main.css")),
      ),
      vendorHighlightCss: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionUri.fsPath, "media", "vendor", "highlight.min.css")),
      ),
      vendorJqueryUICss: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionUri.fsPath, "media", "vendor", "jquery-ui.css")),
      ),
      vendorHighlightJs: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionUri.fsPath, "media", "vendor", "highlight.min.js")),
      ),
      vendorJqueryUIMinJs: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionUri.fsPath, "media", "vendor", "jquery-ui.min.js")),
      ),
      vendorJqueryJs: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionUri.fsPath, "media", "vendor", "jquery-3.5.1.min.js")),
      ),
      vendorMarkedJs: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionUri.fsPath, "media", "vendor", "marked.min.js")),
      ),
      vendorTailwindJs: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionUri.fsPath, "media", "vendor", "tailwindcss.3.2.4.min.js")),
      ),
      vendorTurndownJs: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionUri.fsPath, "media", "vendor", "turndown.js")),
      ),
    };
    this.logger.debug("Resource URIs generated", { uris: Object.keys(uris) });
    return uris;
  }

  /**
   * Replaces placeholders in the HTML with actual resource URIs and nonce values.
   * 
   * @param html - The HTML content with placeholders.
   * @param resourceUris - An object containing resource URIs.
   * @param nonce - A nonce value for security purposes.
   * @returns The HTML content with placeholders replaced.
   */
  private replacePlaceholders(html: string, resourceUris: any, nonce: string): string {
    const replacedHtml = html
      .replace("${stylesMainUri}", resourceUris.stylesMainUri.toString())
      .replace("${vendorHighlightCss}", resourceUris.vendorHighlightCss?.toString())
      .replace("${vendorJqueryUICss}", resourceUris.vendorJqueryUICss?.toString())
      .replace("${vendorHighlightJs}", resourceUris.vendorHighlightJs?.toString())
      .replace("${vendorMarkedJs}", resourceUris.vendorMarkedJs?.toString())
      .replace("${vendorTailwindJs}", resourceUris.vendorTailwindJs?.toString())
      .replace("${vendorTurndownJs}", resourceUris.vendorTurndownJs?.toString())
      .replace("${vendorJqueryJs}", resourceUris.vendorJqueryJs?.toString())
      .replace("${vendorJqueryUIMinJs}", resourceUris.vendorJqueryUIMinJs?.toString())
      .replace("${scriptUri}", resourceUris.scriptUri?.toString())
      .replace(/\${nonce}/g, nonce);

    this.logger.debug("Placeholders replaced in HTML content");
    return replacedHtml;
  }
}