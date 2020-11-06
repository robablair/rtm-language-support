import * as vscode from 'vscode';
import { DocumentSymbolInfo, DocumentSymbolKind } from './DocumentSymbolInfo';
import { SymbolLocator } from './SymbolLocator';
import { WorkspaceSymbolService } from "./WorkspaceSymbolService"

export class ReferenceProvider implements vscode.ReferenceProvider {
    private symbols: WorkspaceSymbolService
    private locator: SymbolLocator

    constructor(symbols: WorkspaceSymbolService, locator: SymbolLocator) {
        this.symbols = symbols;
        this.locator = locator;
    }

    async provideReferences(doc: vscode.TextDocument, pos: vscode.Position) {
        let def = await this.locator.locateSymbol(doc, pos);
        if (def?.kind == DocumentSymbolKind.Variable)
            return this.findVariableReferences(doc, def);
        return [];
    }

    private async findVariableReferences(doc: vscode.TextDocument, symbol: DocumentSymbolInfo) {
        const docSymbols = await this.symbols.getSymbolsFromFileUri(symbol.documentUri);
        if (symbol.parent?.kind == DocumentSymbolKind.Data) {
            let entry = docSymbols.find(x => x.kind == DocumentSymbolKind.Entry && x.range.contains(symbol.range));
            if (!entry)
                return [];
            return this.findReferencesInText(doc, entry.range, symbol);
        }
        return [];
    }

    private findReferencesInText(doc: vscode.TextDocument, range: vscode.Range, symbol: DocumentSymbolInfo) {
        let refLocations: vscode.Location[] = [];
        let text = doc.getText(range);
        let lines = text.split(/\r\n|\r|\n/);
        let reg = new RegExp(`${symbol.name}`, 'g');
        for (let i = 0; i < lines.length; i++) {
            let match: RegExpExecArray | null;
            do {
                match = reg.exec(lines[i]);
                if (match) {
                    let refPosStart = new vscode.Position(i + range.start.line, i == 0 ? match.index + range.start.character : match.index);
                    let refPosEnd = new vscode.Position(refPosStart.line, refPosStart.character + match[0].length);
                    let refRange = new vscode.Range(refPosStart, refPosEnd);
                    refLocations.push(new vscode.Location(doc.uri, refRange));
                }

            } while (match)
        }
        return refLocations;
    }

}
