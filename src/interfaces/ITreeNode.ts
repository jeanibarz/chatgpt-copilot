import * as vscode from "vscode";
import { InclusionState } from "./enums/InclusionState";
import { NodeType } from "./enums/NodeType";

/**
 * Represents a node in the file tree structure.
 */
export interface ITreeNode {
    label: string;
    uri?: vscode.Uri;
    collapsibleState: vscode.TreeItemCollapsibleState;
    type: NodeType;
    symbolKind?: vscode.SymbolKind,
    content: InclusionState;
    path: string;
    range?: vscode.Range;
    children?: ITreeNode[];
    parent?: ITreeNode;
    isIntermediary?: boolean;
}