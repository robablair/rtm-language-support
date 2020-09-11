import * as vscode from 'vscode';
import { WorkspaceSymbolProvider } from './WorkspaceSymbolProvider';

export class DefinitionProvider implements vscode.DefinitionProvider {

    private _workspaceSymbolProvider: WorkspaceSymbolProvider

    constructor(workspaceSymbolProvider: WorkspaceSymbolProvider) {
        this._workspaceSymbolProvider = workspaceSymbolProvider;
    }

    async provideDefinition(doc: vscode.TextDocument, pos: vscode.Position) {
        const symbols = await this._workspaceSymbolProvider.provideWorkspaceSymbols('');
        const wordRange = doc.getWordRangeAtPosition(pos);
        if (wordRange) {
            const symbol = symbols.find(x => x.name === doc.getText(wordRange));
            if (symbol) {
                return symbol.location;
            }
        }
        return new vscode.Location(doc.uri, pos);
    }
}
