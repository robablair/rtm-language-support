import * as vscode from 'vscode';
import { DocumentSymbolProvider } from './DocumentSymbolProvider';

export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider<vscode.SymbolInformation> {

    private _docSymbolProvider: DocumentSymbolProvider

    constructor(docSymbolProvider: DocumentSymbolProvider) {
        this._docSymbolProvider = docSymbolProvider;
    }

    async provideWorkspaceSymbols(query: string) {
        const workspaceSymbols: vscode.SymbolInformation[] = [];
        const files = await vscode.workspace.findFiles('**/*.RTM');
        for await (const file of files) {
            const doc = await vscode.workspace.openTextDocument(file);
            const docSymbols = await this._docSymbolProvider.provideDocumentSymbols(doc);
            workspaceSymbols.push(...docSymbols.map(s => new vscode.SymbolInformation(s.name, s.kind, '', new vscode.Location(doc.uri, s.selectionRange))))
        }
        return workspaceSymbols;
    }
}