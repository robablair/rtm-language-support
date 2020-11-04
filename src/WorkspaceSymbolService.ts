import * as vscode from 'vscode';
import { DocumentSymbolInfo, DocumentSymbolKind as RtmSymbol } from './DocumentSymbolInfo';

type SymbolMatch = {
    begin: RegExp,
    kind: RtmSymbol,
    children: SymbolMatch[],
    endRegex: RegExp | null,
    maxChildren: number | null,
    nameGroup: number
}

type SymbolMatchResult = {
    symbol: SymbolMatch,
    result: RegExpExecArray
}

const codeStringValue: SymbolMatch = {
    begin: /(?<=\^)\w+(?=\^)/,
    kind: RtmSymbol.CodeStringValue,
    children: [],
    endRegex: null,
    maxChildren: null,
    nameGroup: 0
}

const codeStringEditMask: SymbolMatch = {
    begin: /(?<=\s)C(?=\^)/,
    kind: RtmSymbol.EditMask,
    children: [codeStringValue],
    endRegex: /\^{2}/,
    maxChildren: null,
    nameGroup: 0
}

const alphanumericEditMask: SymbolMatch = {
    begin: /(?<=\s)[AX]\d+\b/,
    kind: RtmSymbol.EditMask,
    children: [],
    endRegex: null,
    maxChildren: null,
    nameGroup: 0
}

const numericEditMask: SymbolMatch = {
    begin: /(?<=\s)([NUSFZ][BLP\-]*\d+(?:\.\d+)?)\b/,
    kind: RtmSymbol.EditMask,
    children: [],
    endRegex: null,
    maxChildren: null,
    nameGroup: 0
}

const variable: SymbolMatch = {
    begin: /^\s*([A-Z](?:\.?\w)*)(?=\s+\w)/,
    kind: RtmSymbol.Variable,
    children: [alphanumericEditMask, numericEditMask, codeStringEditMask],
    endRegex: null,
    maxChildren: 1,
    nameGroup: 1
}

const dataArea: SymbolMatch = {
    begin: /^\$DATA\b/,
    kind: RtmSymbol.Data,
    children: [variable],
    endRegex: /^\$[a-zA-Z]+\b/,
    maxChildren: null,
    nameGroup: 0
}

const proc: SymbolMatch = {
    begin: /^([A-Z](?:\.?\w)*)\s+PROC(?=\(.*\))?/,
    kind: RtmSymbol.Proc,
    children: [],
    endRegex: /\b(?!<")ENDPROC\b/,
    maxChildren: null,
    nameGroup: 1
}

const include: SymbolMatch = {
    begin: /\$INCLUDE\s+((\w+|\*)\([A-Z](\.?\w)*\))/,
    kind: RtmSymbol.Include,
    children: [],
    endRegex: null,
    maxChildren: null,
    nameGroup: 1
}

const prog: SymbolMatch = {
    begin: /^(\$PROG)(?:\(.*\))?/,
    kind: RtmSymbol.Prog,
    children: [],
    endRegex: new RegExp(proc.begin.source + '|' + include.begin.source),
    maxChildren: null,
    nameGroup: 1
}

const overlay: SymbolMatch = {
    begin: /([A-Z](?:\.?\w)*)\b/,
    kind: RtmSymbol.Overlay,
    children: [],
    endRegex: null,
    maxChildren: null,
    nameGroup: 0
}

const ext: SymbolMatch = {
    begin: /^\$EXT\b/,
    kind: RtmSymbol.Ext,
    children: [overlay],
    endRegex: /^\$[a-zA-Z]+\b/,
    maxChildren: null,
    nameGroup: 0
}

const entry: SymbolMatch = {
    begin: /^\$ENTRY\s+([A-Z](?:\.?\w)*)\b/,
    kind: RtmSymbol.Entry,
    children: [dataArea, ext, prog, proc, include],
    endRegex: /^\$(ENTRY|NAME)\b/,
    maxChildren: null,
    nameGroup: 1
}

const name: SymbolMatch = {
    begin: /^\$NAME\s+([A-Z](?:\.?\w)*)\b/,
    kind: RtmSymbol.Name,
    children: [proc, variable],
    endRegex: /^\$[a-zA-Z]+\b/,
    maxChildren: null,
    nameGroup: 1
}

const topLevelMatches: SymbolMatch[] = [entry, name];

export class WorkspaceSymbolService {

    private symbolCache = new Map<vscode.Uri, DocumentSymbolInfo[]>()

    constructor() {
        vscode.workspace.onDidChangeTextDocument((event) => this.symbolCache.delete(event.document.uri));
    }

    async getAllSymbols() {
        return await this.getSymbolsFromFileName('*');
    }

    async getSymbolsFromFileName(fileName: string) {
        let symbols: DocumentSymbolInfo[] = [];
        const globs = [`**/${fileName}.RTM`, `**/${fileName}.rtm`];
        const files = await Promise.all(globs.map(x => vscode.workspace.findFiles(x)));
        for (let f of files.flat())
            symbols.push(... await this.getSymbolsFromFileUri(f));
        return symbols;
    }

    async getSymbolsFromFileUri(file: vscode.Uri) {
        if (!this.symbolCache.has(file)) {
            const doc = await vscode.workspace.openTextDocument(file);
            const syms = this._parseText(file, doc.getText())
            this.symbolCache.set(file, syms);
        }
        return this.symbolCache.get(file) ?? [];
    }

    private _parseText(uri: vscode.Uri, text: string): DocumentSymbolInfo[] {
        const topLevelSymbols: DocumentSymbolInfo[] = [];
        const lines = text.split(/\r\n|\r|\n/);
        const matches: SymbolMatch[] = []; //for finding children
        const symbols: DocumentSymbolInfo[] = []; //for adding children
        for (let i = 0; i < lines.length; i++) {
            var offset = 0;
            var line = lines[i];
            line = this.ignoreComments(line);
            let nextMatch: SymbolMatchResult | null = null;
            let tryAgain: boolean;
            do {
                tryAgain = false;
                const lookFor = matches.length > 0 ? matches[matches.length - 1].children : topLevelMatches;
                let endIndex: number | undefined;
                if (matches.length > 0) {
                    let lastMatch = matches[matches.length - 1]
                    const match = lastMatch?.endRegex?.exec(line.slice(offset));
                    endIndex = match?.index;
                }
                nextMatch = null;
                for (let m of lookFor) {
                    const match = m.begin.exec(line.slice(offset));
                    if (match && (!nextMatch || nextMatch.result.index > match.index) && (!endIndex || match.index < endIndex)) {
                        nextMatch = {
                            symbol: m,
                            result: match
                        }
                    }
                }
                if (endIndex != undefined && (!nextMatch || endIndex < nextMatch.result.index)) {
                    let lastMatch: SymbolMatch | undefined = matches.pop();
                    let lastSymbol: DocumentSymbolInfo | undefined = symbols.pop();
                    if (lastSymbol)
                        lastSymbol.range = new vscode.Range(lastSymbol.range.start, new vscode.Position(i, offset));
                    lastMatch = matches[matches.length - 1];
                    lastSymbol = symbols[symbols.length - 1];
                    while (matches.length > 0 && lastMatch?.maxChildren && lastSymbol && lastSymbol.children.length >= lastMatch.maxChildren) {
                        matches.pop();
                        let sym = symbols.pop();
                        if (sym)
                            sym.range = new vscode.Range(sym.range.start, new vscode.Position(i, offset));
                        lastMatch = matches[matches.length - 1];
                        lastSymbol = symbols[symbols.length - 1];
                    }
                    tryAgain = true;
                }
                else if (nextMatch) {
                    const docSym = this._buildDocSymbol(uri, line, offset, i, nextMatch);
                    offset += nextMatch.result.index + nextMatch.result[0].length;
                    if (symbols.length > 0)
                        symbols[symbols.length - 1].children.push(docSym);
                    else
                        topLevelSymbols.push(docSym);
                    if (nextMatch.symbol.children.length > 0 || nextMatch.symbol.endRegex) {
                        matches.push(nextMatch.symbol);
                        symbols.push(docSym);
                    }
                    else if (symbols.length > 0) {
                        let lastMatch: SymbolMatch | undefined = matches[matches.length - 1];
                        let lastSymbol: DocumentSymbolInfo | undefined = symbols[symbols.length - 1];
                        while (matches.length > 0 && lastMatch?.maxChildren && lastSymbol && lastSymbol.children.length >= lastMatch.maxChildren) {
                            matches.pop();
                            let sym = symbols.pop();
                            if (sym)
                                sym.range = new vscode.Range(sym.range.start, new vscode.Position(i, offset));
                            lastMatch = matches[matches.length - 1];
                            lastSymbol = symbols[symbols.length - 1];
                            tryAgain = true;
                        }
                    }
                }
            } while (nextMatch || tryAgain)
        }
        let sym = symbols.pop();
        while (sym) {
            sym.range = new vscode.Range(sym.range.start, new vscode.Position(lines.length, lines[lines.length - 1].length));
            sym = symbols.pop();
        }
        return topLevelSymbols;
    }

    private ignoreComments(line: string): string {
        line = line.replace(/^\*.*$/, '');
        line = line.replace(/(^.*)<<.*$/, '$1');
        return line;
    }

    private _buildDocSymbol(uri: vscode.Uri, line: string, offset: number, lineNo: number, match: SymbolMatchResult, parent?: DocumentSymbolInfo): DocumentSymbolInfo {
        const remainingLine = line.slice(offset);
        const name = match.result[match.symbol.nameGroup];
        const nameStart = remainingLine.indexOf(name) + offset;
        const matchStart = remainingLine.indexOf(match.result[0]) + offset;
        const detail = match.result[0];
        const range = new vscode.Range(new vscode.Position(lineNo, matchStart), new vscode.Position(lineNo, matchStart + match.result[0].length));
        const selectionRange = new vscode.Range(new vscode.Position(lineNo, nameStart), new vscode.Position(lineNo, nameStart + name.length));
        return new DocumentSymbolInfo(uri, name, detail, match.symbol.kind, range, selectionRange, parent);
    }
}
