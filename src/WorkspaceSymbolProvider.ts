import * as vscode from 'vscode';
import { DocumentSymbolProvider } from './DocumentSymbolProvider';

const docSymbolProvider = new DocumentSymbolProvider();

export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider<vscode.SymbolInformation> {
    async provideWorkspaceSymbols(query: string, token: vscode.CancellationToken) {
        const workspaceSymbols: vscode.SymbolInformation[] = [];
        const docs = vscode.workspace.textDocuments;
        for await (const doc of docs) {
            const docSymbols = await docSymbolProvider.provideDocumentSymbols(doc);
            workspaceSymbols.push(...docSymbols.map(s => new vscode.SymbolInformation(s.name, s.kind, '', new vscode.Location(doc.uri, s.selectionRange))))
        }
        return workspaceSymbols;
    }
}