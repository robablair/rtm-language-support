import * as vscode from 'vscode';

export class DocumentItem {
    documentUri: vscode.Uri;
    name: string;
    detail: string;
    kind: vscode.SymbolKind;
    tags?: ReadonlyArray<vscode.SymbolTag>;
    range: vscode.Range;
    selectionRange: vscode.Range;
    children: DocumentItem[] = [];
    parent: DocumentItem | null;

    constructor(
        documentUri: vscode.Uri,
        name: string,
        detail: string,
        kind: vscode.SymbolKind,
        range: vscode.Range,
        selectionRange: vscode.Range,
        parent?: DocumentItem) {

        this.documentUri = documentUri;
        this.name = name;
        this.detail = detail;
        this.kind = kind;
        this.range = range;
        this.selectionRange = selectionRange;
        this.parent = parent ?? null;
    }

    toDocumentSymbol() {
        let sym = new vscode.DocumentSymbol(this.name, this.detail, this.kind, this.range, this.selectionRange);
        sym.children.push(...this.children.map(x => x.toDocumentSymbol()))
        return sym;
    }

    toSymbolInformation() {
        const loc = new vscode.Location(this.documentUri, this.range);
        let sym = new vscode.SymbolInformation(this.name, this.kind, this.parent?.name ?? '', loc);
        return sym;
    }
}

type SymbolMatch = {
    begin: RegExp,
    end: RegExp | null,
    kind: vscode.SymbolKind,
    children: SymbolMatch[]
}

type SymbolMatchResult = {
    symbol: SymbolMatch,
    result: RegExpExecArray
}

const codeStringValue: SymbolMatch = {
    begin: /(?<=\^)\w+(?=\^)/,
    end: /\^/,
    kind: vscode.SymbolKind.EnumMember,
    children: []
}

const codeStringEditMask: SymbolMatch = {
    begin: /(?<=\s)C(?=\^)/,
    end: /\^{2}/,
    kind: vscode.SymbolKind.Enum,
    children: [codeStringValue]
}

const alphanumericEditMask: SymbolMatch = {
    begin: /(?<=\s)[AX]\d+\b/,
    end: null,
    kind: vscode.SymbolKind.Field,
    children: []
}

const numericEditMask: SymbolMatch = {
    begin: /(?<=\s)([NUSFZ][BLP\-]*\d+(?:\.\d+)?)\b/,
    end: null,
    kind: vscode.SymbolKind.Field,
    children: []
}

const dataField: SymbolMatch = {
    begin: /(?<=\s)([A-Z](?:\.?\w)*)\b/,
    end: /$/,
    kind: vscode.SymbolKind.Field,
    children: [alphanumericEditMask, numericEditMask, codeStringEditMask]
}

const dataArea: SymbolMatch = {
    begin: /^\$DATA\b/,
    end: /^\$/,
    kind: vscode.SymbolKind.Field,
    children: [dataField]
}

const proc: SymbolMatch = {
    begin: /^([A-Z](?:\.?\w)*)\s+PROC(?=\(.*\))?/,
    end: /ENDPROC/,
    kind: vscode.SymbolKind.Function,
    children: []
}

const prog: SymbolMatch = {
    begin: /^\$PROG(?:\(.*\))?/,
    end: /\b(RETURN|QUITZUG)\b/,
    kind: vscode.SymbolKind.Function,
    children: []
}

const overlay: SymbolMatch = {
    begin: /^\$ENTRY\s+[A-Z](?:\.?\w)*/,
    end: /^\$ENTRY\s+/,
    kind: vscode.SymbolKind.Module,
    children: [dataArea, prog, proc]
}

const topLevelMatches: SymbolMatch[] = [overlay];

export class WorkspaceSymbolService {

    async getSymbols() {
        const globs = ['**/*.RTM', '**/*.rtm'];
        const files = await Promise.all(globs.map(x => vscode.workspace.findFiles(x)));
        let symbols: DocumentItem[] = [];
        for (let f of files.flat()) {
            const doc = await vscode.workspace.openTextDocument(f);
            const syms = this._parseText(f, doc.getText())
            symbols.push(...syms);
        }
        return symbols;
    }

    private _parseText(uri: vscode.Uri, text: string): DocumentItem[] {
        const topLevelSymbols: DocumentItem[] = [];
        const lines = text.split(/\r\n|\r|\n/);
        const matches: SymbolMatch[] = []; //for finding children
        const symbols: DocumentItem[] = []; //for adding children
        for (let i = 0; i < lines.length; i++) {
            var offset = 0;
            var line = lines[i];
            line = this.ignoreComments(line);
            let match: SymbolMatchResult | null;
            let endMatch: RegExpExecArray | undefined;
            do {
                endMatch = undefined;
                if (matches.length > 0) {
                    const matchSym = matches[matches.length - 1];
                    endMatch = matchSym.end?.exec(line.slice(offset)) ?? undefined;
                }
                match = this.getNextChildMatch(line, offset, matches, endMatch);
                if (match?.result) {
                    let parent: DocumentItem | undefined;
                    if (symbols.length > 0)
                        parent = symbols[symbols.length - 1];
                    const docSym = this._buildDocSymbol(uri, line, i, match, parent);
                    parent?.children.push(docSym);
                    if (match.symbol.children.length > 0) {
                        symbols.push(docSym)
                        matches.push(match.symbol);
                    }
                    offset += match.result.index + match.result[0].length;
                }
                else if (endMatch) {
                    matches.pop();
                    const sym = symbols.pop();
                    if (sym) {
                        const endPos = line.indexOf(endMatch[0]) + endMatch[0].length;
                        sym.range = new vscode.Range(sym.range.start, new vscode.Position(i, endPos));
                        if (symbols.length == 0)
                            topLevelSymbols.push(sym)
                    }
                }
            } while (match || endMatch)
        }
        const sym = symbols.pop();
        if (sym) {
            sym.range = new vscode.Range(sym.range.start, new vscode.Position(lines.length - 1, lines[lines.length - 1].length - 1));
            topLevelSymbols.push(sym);
        }
        return topLevelSymbols;
    }

    private getNextChildMatch(line: string, offset: number, symbolStack: SymbolMatch[], endIndex?: RegExpExecArray): SymbolMatchResult | null {
        const childMatches = symbolStack.length > 0 ? symbolStack[symbolStack.length - 1].children : topLevelMatches;
        let firstMatchResult: SymbolMatchResult | null = null;
        for (let child of childMatches) {
            const match = child.begin.exec(line.slice(offset));
            if (match && (!firstMatchResult || match.index < firstMatchResult.result.index)
                && (!endIndex || match.index < endIndex.index)) {
                firstMatchResult = {
                    symbol: child,
                    result: match
                };
            }
        }
        return firstMatchResult;
    }

    private ignoreComments(line: string): string {
        line = line.replace(/^\*.*$/, '');
        line = line.replace(/(^.*)<<.*$/, '$1');
        return line;
    }

    private _buildDocSymbol(uri: vscode.Uri, line: string, lineNo: number, match: SymbolMatchResult, parent?: DocumentItem): DocumentItem {
        const name = match.result[0];
        const nameStart = line.indexOf(name);
        const detail = name;
        const selectionRange = new vscode.Range(new vscode.Position(lineNo, nameStart), new vscode.Position(lineNo, nameStart + name.length));
        return new DocumentItem(uri, name, detail, match.symbol.kind, selectionRange, selectionRange, parent);
    }
}