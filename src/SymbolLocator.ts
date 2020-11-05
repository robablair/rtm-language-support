import * as vscode from 'vscode';
import { DocumentSymbolInfo, DocumentSymbolKind } from './DocumentSymbolInfo';
import { WorkspaceSymbolService } from "./WorkspaceSymbolService";

export class SymbolLocator {
    private symbols: WorkspaceSymbolService;

    constructor(symbols: WorkspaceSymbolService) {
        this.symbols = symbols;
    }

    async locateSymbol(doc: vscode.TextDocument, pos: vscode.Position) {
        const docSymbols = await this.symbols.getSymbolsFromFileUri(doc.uri);
        const wordAtPos = doc.getWordRangeAtPosition(pos);
        if (wordAtPos) {
            let def = this.findDefinitionOfVariable(doc, wordAtPos, docSymbols);
            if (def)
                return def;
            def = this.findDefinitionOfProc(doc, wordAtPos, docSymbols);
            if (def)
                return def;
            def = await this.findDefinitionOfIncludedVariable(doc, wordAtPos, docSymbols);
            if (def)
                return def;
            def = await this.findDefinitionOfOverlay(doc, wordAtPos, docSymbols);
            if (def)
                return def;
        }
        return null
    }

    private findDefinitionOfVariable(doc: vscode.TextDocument, wordRange: vscode.Range, docItems: DocumentSymbolInfo[]) {
        let entries = docItems.filter(x => x.kind == DocumentSymbolKind.Entry);
        let entry = entries.find(x => x.range.contains(wordRange));
        let data = entry?.children.find(x => x.kind == DocumentSymbolKind.Data);
        let def = data?.children.find(x => x.name == doc.getText(wordRange))
        return def;
    }

    private async findDefinitionOfIncludedVariable(doc: vscode.TextDocument, wordRange: vscode.Range, docItems: DocumentSymbolInfo[]) {
        let variableName = doc.getText(wordRange);
        let entries = docItems.filter(x => x.kind == DocumentSymbolKind.Entry);
        let entry = entries.find(x => x.range.contains(wordRange));
        let includes = entry?.children.filter(x => x.kind == DocumentSymbolKind.Include);
        let results = includes?.map(async x => {
            let match = /(\w+|\*)\((.*)\)/.exec(x.name);
            if (!match)
                return undefined;
            let file = match[1];
            let includedName = match[2];
            let nameSym = docItems.find(x => x.kind == DocumentSymbolKind.Name && x.name == includedName);
            let def = nameSym?.children.find(x => x.kind == DocumentSymbolKind.Variable && x.name == variableName);
            if (def)
                return def;
            let fileSymbols = await this.symbols.getSymbolsFromFileName(file);
            nameSym = fileSymbols.find(x => x.kind == DocumentSymbolKind.Name && x.name == includedName);
            def = nameSym?.children.find(x => x.kind == DocumentSymbolKind.Variable && x.name == variableName);
            return def;

        });
        let def = await Promise.all(results ?? [])
        def = def.filter(x => x != undefined);
        if (!def || def.length != 1)
            return undefined;
        return def[0];
    }

    private findDefinitionOfProc(doc: vscode.TextDocument, wordRange: vscode.Range, docItems: DocumentSymbolInfo[]) {
        let entries = docItems.filter(x => x.kind == DocumentSymbolKind.Entry);
        let entry = entries.find(x => x.range.contains(wordRange));
        let def = entry?.children.find(x => x.kind == DocumentSymbolKind.Proc && x.name == doc.getText(wordRange));
        return def;
    }

    private async findDefinitionOfOverlay(doc: vscode.TextDocument, wordRange: vscode.Range, docItems: DocumentSymbolInfo[]) {
        let entries = docItems.filter(x => x.kind == DocumentSymbolKind.Entry);
        let entry = entries.find(x => x.range.contains(wordRange));
        let ext = entry?.children.find(x => x.kind == DocumentSymbolKind.Ext);
        let refExt = ext?.children.find(x => x.name == doc.getText(wordRange));
        let allSymbols = await this.symbols.getAllSymbols();
        let def = allSymbols.find(x => x.kind == DocumentSymbolKind.Entry && x.name == refExt?.name);
        return def;
    }
}
