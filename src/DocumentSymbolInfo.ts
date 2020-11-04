import * as vscode from 'vscode';

export enum DocumentSymbolKind {
    Entry,
    Name,
    Include,
    Ext,
    Overlay,
    Data,
    Prog,
    Proc,
    Variable,
    EditMask,
    CodeStringValue
}

export class DocumentSymbolInfo {
    documentUri: vscode.Uri;
    name: string;
    detail: string;
    kind: DocumentSymbolKind;
    tags?: ReadonlyArray<vscode.SymbolTag>;
    range: vscode.Range;
    selectionRange: vscode.Range;
    children: DocumentSymbolInfo[] = [];
    parent: DocumentSymbolInfo | null;

    constructor(
        documentUri: vscode.Uri,
        name: string,
        detail: string,
        kind: DocumentSymbolKind,
        range: vscode.Range,
        selectionRange: vscode.Range,
        parent?: DocumentSymbolInfo) {

        this.documentUri = documentUri;
        this.name = name;
        this.detail = detail;
        this.kind = kind;
        this.range = range;
        this.selectionRange = selectionRange;
        this.parent = parent ?? null;
    }

    toDocumentSymbol() {
        let sym = new vscode.DocumentSymbol(this.name, this.detail, this.mapToKind(this.kind), this.range, this.selectionRange);
        sym.children.push(...this.children.map(x => x.toDocumentSymbol()));
        return sym;
    }

    toSymbolInformation() {
        const loc = new vscode.Location(this.documentUri, this.range);
        let sym = new vscode.SymbolInformation(this.name, this.mapToKind(this.kind), this.parent?.name ?? '', loc);
        return sym;
    }

    mapToKind(kind: DocumentSymbolKind): vscode.SymbolKind {
        switch (kind) {
            case DocumentSymbolKind.Entry:
                return vscode.SymbolKind.Class;
            case DocumentSymbolKind.Name:
                return vscode.SymbolKind.Package;
            case DocumentSymbolKind.Include:
                return vscode.SymbolKind.Package;
            case DocumentSymbolKind.Ext:
                return vscode.SymbolKind.Package;
            case DocumentSymbolKind.Overlay:
                return vscode.SymbolKind.Function;
            case DocumentSymbolKind.Data:
                return vscode.SymbolKind.Class;
            case DocumentSymbolKind.Prog:
                return vscode.SymbolKind.Function;
            case DocumentSymbolKind.Proc:
                return vscode.SymbolKind.Function;
            case DocumentSymbolKind.Variable:
                return vscode.SymbolKind.Variable;
            case DocumentSymbolKind.EditMask:
                return vscode.SymbolKind.Constant;
            case DocumentSymbolKind.CodeStringValue:
                return vscode.SymbolKind.Constant
        }
    }
}
