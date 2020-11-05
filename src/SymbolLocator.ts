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
            def = await this.findIncludedDefinition(doc, wordAtPos, docSymbols);
            if (def)
                return def;
            def = await this.findNameOfInclude(wordAtPos, docSymbols);
            if (def)
                return def;
            def = await this.findDefinitionOfOverlay(doc, wordAtPos, docSymbols);
            if (def)
                return def;
        }
        return null
    }

    private findDefinitionOfVariable(doc: vscode.TextDocument, wordRange: vscode.Range, docItems: DocumentSymbolInfo[]) {
        let entry = docItems.find(x => x.kind == DocumentSymbolKind.Entry && x.range.contains(wordRange));
        let data = entry?.children.find(x => x.kind == DocumentSymbolKind.Data);
        let def = data?.children.find(x => x.name == doc.getText(wordRange));
        return def;
    }

    private findDefinitionOfProc(doc: vscode.TextDocument, wordRange: vscode.Range, docItems: DocumentSymbolInfo[]) {
        let entry = docItems.find(x => x.kind == DocumentSymbolKind.Entry && x.range.contains(wordRange));
        let def = entry?.children.find(x => x.kind == DocumentSymbolKind.Proc && x.name == doc.getText(wordRange));
        return def;
    }

    private async findIncludedDefinition(doc: vscode.TextDocument, wordRange: vscode.Range, docItems: DocumentSymbolInfo[]) {
        let entry = docItems.find(x => x.kind == DocumentSymbolKind.Entry && x.range.contains(wordRange));
        let includes = entry?.children.filter(x => x.kind == DocumentSymbolKind.Include);
        let results = includes?.map(async x => {
            let match = /(\w+|\*)\((.*)\)/.exec(x.name);
            if (!match)
                return undefined;
            let [file, name] = [match[1], match[2]];
            let fileSymbols = (file == '*') ? docItems : await this.symbols.getSymbolsFromFileName(file);
            let nameSym = fileSymbols.find(x => x.kind == DocumentSymbolKind.Name && x.name == name);
            let def = nameSym?.children.find(x => [DocumentSymbolKind.Proc, DocumentSymbolKind.Variable].includes(x.kind) && x.name == doc.getText(wordRange));
            return def;
        });
        let def = await Promise.all(results ?? [])
        def = def.filter(x => x != undefined);
        if (!def || def.length != 1)
            return undefined;
        return def[0];
    }

    private async findNameOfInclude(wordRange: vscode.Range, docItems: DocumentSymbolInfo[]) {
        let entry = docItems.find(x => x.kind == DocumentSymbolKind.Entry && x.range.contains(wordRange));
        let include = entry?.children.find(x => x.kind == DocumentSymbolKind.Include && x.selectionRange.contains(wordRange));
        if (!include)
            return undefined
        let match = /(\w+|\*)\((.*)\)/.exec(include.name);
        if (!match)
            return undefined;
        let [file, name] = [match[1], match[2]];
        let fileSymbols = (file == '*') ? docItems : await this.symbols.getSymbolsFromFileName(file);
        let def = fileSymbols.find(x => x.kind == DocumentSymbolKind.Name && x.name == name);
        return def;
    }

    private async findDefinitionOfOverlay(doc: vscode.TextDocument, wordRange: vscode.Range, docItems: DocumentSymbolInfo[]) {
        let entry = docItems.find(x => x.kind == DocumentSymbolKind.Entry && x.range.contains(wordRange));
        let ext = entry?.children.find(x => x.kind == DocumentSymbolKind.Ext);
        let refExt = ext?.children.find(x => x.name == doc.getText(wordRange));
        let allSymbols = await this.symbols.getAllSymbols();
        let def = allSymbols.find(x => x.kind == DocumentSymbolKind.Entry && x.name == refExt?.name);
        return def;
    }
}
