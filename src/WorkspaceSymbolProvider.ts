import * as vscode from "vscode";
import { DocumentSymbolProvider } from "./DocumentSymbolProvider";

export class WorkspaceSymbolProvider
  implements vscode.WorkspaceSymbolProvider<vscode.SymbolInformation> {
  
  private _docSymbolProvider: DocumentSymbolProvider;
  private _workspaceDocumentSymbols: vscode.DocumentSymbol[];
  private _workspaceSymbols: vscode.SymbolInformation[];

  constructor(docSymbolProvider: DocumentSymbolProvider) {
    this._docSymbolProvider = docSymbolProvider;
    this._workspaceDocumentSymbols = [];
    this._workspaceSymbols = [];
    vscode.workspace.onDidChangeTextDocument((event) => {
      this.update();
    });
    this.update();
  }

  private async update() {
    const workspaceDocumentSymbols: vscode.DocumentSymbol[] = [];
    const workspaceSymbols: vscode.SymbolInformation[] = [];
    const files = await vscode.workspace.findFiles("**/*.rtm");
    for await (const file of files) {
        const doc = await vscode.workspace.openTextDocument(file);
        const docSymbols = await this._docSymbolProvider.provideDocumentSymbols(doc);
        workspaceDocumentSymbols.push(...docSymbols);
        workspaceSymbols.push(
            ...docSymbols.map((s) =>
                new vscode.SymbolInformation(
                  s.name,
                  s.kind,
                  "",
                  new vscode.Location(doc.uri, s.selectionRange)
                )
            )
        );
    }
    this._workspaceDocumentSymbols = workspaceDocumentSymbols;
    this._workspaceSymbols = workspaceSymbols;
    return;  
  }

  async provideWorkspaceDocumentSymbols() {
    return this._workspaceDocumentSymbols;
  }

  async provideWorkspaceSymbols(query: string) {
    return this._workspaceSymbols;
  }
}
