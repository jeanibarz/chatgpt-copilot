import * as fs from "fs";
import * as vscode from "vscode";
import { LogLevel, Logger } from "./logger";

export class WebviewManager {
  private webviewView?: vscode.WebviewView;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Sets up the webview with HTML content and webview options.
   * @param webviewView - The webview view to be set up.
   */
  public initializeWebView(webviewView: vscode.WebviewView, extensionUri: vscode.Uri, nonce: string) {
    this.webviewView = webviewView;
    this.logger.log(LogLevel.Info, "Webview set");
    this.webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri],
    };

    try {
      this.webviewView.webview.html = this.generateWebviewHtml(extensionUri, nonce);
      this.logger.log(LogLevel.Info, "Webview HTML set");
    } catch (error) {
      this.logger.log(LogLevel.Error, `Failed to generate webview HTML: ${error.message}`);
      throw error; // Rethrow to inform caller
    }
  }

  /**
   * Sends a message to the webview and handles cases where the webview is not focused.
   * @param message - The message to be sent to the webview.
   */
  public sendMessage(message: any) {
    if (this.webviewView) {
      this.webviewView.webview.postMessage(message);
    } else {
      this.logger.log(LogLevel.Error, "Failed to send message: Webview is not set");
    }
  }

  /**
   * Retrieves the HTML content for the webview based on the specified configuration.
   * @param webview - The webview for which the HTML content is generated.
   * @returns A string that contains the HTML content for the webview.
   */
  private generateWebviewHtml(extensionUri: vscode.Uri, nonce: string): string {
    if (!this.webviewView) {
      throw new Error("Cannot generate HTML without a valid webview.");
    }

    const webviewHtmlPath = vscode.Uri.joinPath(extensionUri, "media", "webview.html");
    let html = fs.readFileSync(webviewHtmlPath.fsPath, "utf8");

    const resourceUris = this.generateResourceUris(extensionUri);
    html = this.replacePlaceholders(html, resourceUris, nonce);
    return html;
  }

  private generateResourceUris(extensionUri: vscode.Uri) {
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