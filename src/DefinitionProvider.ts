import * as vscode from 'vscode';
import { SymbolLocator } from './SymbolLocator';

export class DefinitionProvider implements vscode.DefinitionProvider {

    private locator: SymbolLocator

    constructor(locator: SymbolLocator) {
        this.locator = locator;
    }

    async provideDefinition(doc: vscode.TextDocument, pos: vscode.Position) {
        let def = await this.locator.locateSymbol(doc, pos);
        if (def)
            return new vscode.Location(def.documentUri, def.selectionRange);
        return new vscode.Location(doc.uri, pos);
    }    
}
