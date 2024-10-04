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
 * - Handles error logging related to webview operations.
 */

import * as fs from "fs";
import { inject, injectable } from "inversify";
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
    this.logger.info("Webview set");
    this.webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionContext.extensionUri],
    };

    try {
      this.webviewView.webview.html = this.generateWebviewHtml(nonce);
      this.logger.info("Webview HTML set");
    } catch (error) {
      // Type guard to check if error is an instance of Error
      if (error instanceof Error) {
        this.logger.error(`Failed to generate webview HTML: ${error.message}`);
      } else {
        this.logger.error(`Failed to generate webview HTML: ${String(error)}`);
      }
      throw error;
    }
  }

  public setupWebview(webviewView: vscode.WebviewView) {
    this.webviewView = webviewView;
    this.initializeWebView(webviewView, Utility.getRandomId());
    this.messageHandler.handleMessages(webviewView);
    // TODO: find a way to provide viewProvider or remove it from required args
  }

  /** 
   * Sends a message to the webview and handles cases where the webview is not focused.
   * 
   * @param message - The message to be sent to the webview.
   */
  public sendMessage(message: any) {
    if (this.webviewView) {
      this.webviewView.webview.postMessage(message);
    } else {
      this.logger.error("Failed to send message: Webview is not set");
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
      throw new Error("Cannot generate HTML without a valid webview.");
    }

    const stateManager = StateManager.getInstance();
    const extensionContext = stateManager.getExtensionContext();

    const webviewHtmlPath = vscode.Uri.joinPath(extensionContext.extensionUri, "media", "webview.html");
    let html = fs.readFileSync(webviewHtmlPath.fsPath, "utf8");

    const resourceUris = this.generateResourceUris();
    html = this.replacePlaceholders(html, resourceUris, nonce);
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
    return {
      scriptUri: webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, "media", "main.js"),
      ),
      stylesMainUri: webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, "media", "main.css"),
      ),
      vendorHighlightCss: webview.asWebviewUri(
        vscode.Uri.joinPath(
          extensionUri,
          "media",
          "vendor",
          "highlight.min.css",
        ),
      ),
      vendorJqueryUICss: webview.asWebviewUri(
        vscode.Uri.joinPath(
          extensionUri,
          "media",
          "vendor",
          "hjquery-ui.css",
        ),
      ),
      vendorHighlightJs: webview.asWebviewUri(
        vscode.Uri.joinPath(
          extensionUri,
          "media",
          "vendor",
          "highlight.min.js",
        ),
      ),
      vendorJqueryUIMinJs: webview.asWebviewUri(
        vscode.Uri.joinPath(
          extensionUri,
          "media",
          "vendor",
          "jquery-ui.min.js",
        ),
      ),
      vendorJqueryJs: webview.asWebviewUri(
        vscode.Uri.joinPath(
          extensionUri,
          "media",
          "vendor",
          "jquery-3.5.1.min.js",
        ),
      ),
      vendorMarkedJs: webview.asWebviewUri(
        vscode.Uri.joinPath(
          extensionUri,
          "media",
          "vendor",
          "marked.min.js",
        ),
      ),
      vendorTailwindJs: webview.asWebviewUri(
        vscode.Uri.joinPath(
          extensionUri,
          "media",
          "vendor",
          "tailwindcss.3.2.4.min.js",
        ),
      ),
      vendorTurndownJs: webview.asWebviewUri(
        vscode.Uri.joinPath(
          extensionUri,
          "media",
          "vendor",
          "turndown.js",
        ),
      ),
    };
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
    return html
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
  }
}