import * as vscode from 'vscode';
import { DocumentSymbolProvider } from './DocumentSymbolProvider';

type DocFileSymbol = {
    uri: vscode.Uri,
    symbol: vscode.DocumentSymbol
}

export class DefinitionProvider implements vscode.DefinitionProvider {

    private _docSymbolProvider: DocumentSymbolProvider

    constructor(documentSymbolProvider: DocumentSymbolProvider) {
        this._docSymbolProvider = documentSymbolProvider;
    }

    async provideDefinition(doc: vscode.TextDocument, pos: vscode.Position) {
        const docSymbols: DocFileSymbol[] = [];
        const files = await vscode.workspace.findFiles('**/*.RTM');
        for await (const file of files) {
            const doc = await vscode.workspace.openTextDocument(file);
            const temp = await this._docSymbolProvider.provideDocumentSymbols(doc)
            docSymbols.push(...temp.map(x => {
                const docFile: DocFileSymbol = {
                    uri: doc.uri,
                    symbol: x
                }
                return docFile;
            }));
        }
        const wordRange = doc.getWordRangeAtPosition(pos);
        if (wordRange) {
            const symbol = docSymbols[0].symbol.children.find(x => x.name === doc.getText(wordRange));
            if (symbol) {
                return new vscode.Location(docSymbols[0].uri, symbol.selectionRange);
            }
        }
        return new vscode.Location(doc.uri, pos);
    }
}
