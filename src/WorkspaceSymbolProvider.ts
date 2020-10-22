import * as vscode from 'vscode';
import { DocumentItem, WorkspaceSymbolService } from './WorkspaceSymbolService';

export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider<vscode.SymbolInformation> {

    private _workspaceSymbolContainer: WorkspaceSymbolService

    constructor(workspaceSymbolContainer: WorkspaceSymbolService) {
        this._workspaceSymbolContainer = workspaceSymbolContainer;
    }

    async provideWorkspaceSymbols(query: string) {
        const allDocSymbols = await this._workspaceSymbolContainer.getSymbols();
        const allSymbolInfo = allDocSymbols.flatMap(x => x.toSymbolInformation());
        return allSymbolInfo;
    }

    private toSymbolInformation(docUri: vscode.Uri, symbol: vscode.DocumentSymbol, parentSymbol?: vscode.DocumentSymbol) {
        const loc = new vscode.Location(docUri, symbol.range);
        const container = parentSymbol?.name ?? '';
        return new vscode.SymbolInformation(symbol.name, symbol.kind, container, loc);
    }
}