import * as vscode from 'vscode';

type SymbolMatch = {
	beginRegex: RegExp,
	endRegex: RegExp | null,
	childMatches: SymbolMatch[]
}

type SymbolMatchResult = {
	symbol: SymbolMatch,
	result: RegExpExecArray | null
}

const alphanumericEditMaskMatch: SymbolMatch = {
	beginRegex: /(?<=\s)[AX]\d+\b/,
	endRegex: null,
	childMatches: []
}

const numericEditMaskMatch: SymbolMatch = {
	beginRegex: /(?<=\s)([NUSFZ][BLP\-]*\d+(?:\.\d+)?)\b/,
	endRegex: null,
	childMatches: []
}

const dataFieldMatch: SymbolMatch = {
	beginRegex: /(?<=\s)([A-Z](?:\.?\w)*)\b/,
	endRegex: /$/,
	childMatches: [alphanumericEditMaskMatch, numericEditMaskMatch]
}

const dataAreaMatch: SymbolMatch = {
	beginRegex: /^\$DATA\b/,
	endRegex: /(?<=^\$)/,
	childMatches: [dataFieldMatch]
}

const functionMatch: SymbolMatch = {
	beginRegex: /^([A-Z](?:\.?\w)*)\s+PROC(?:\(.*\))?/,
	endRegex: /ENDPROC/,
	childMatches: []
}

const progMatch: SymbolMatch = {
	beginRegex: /^\$PROG(?:\(.*\))?/,
	endRegex: /\b(RETURN|QUITZUG)\b/,
	childMatches: []
}

const overlayMatch: SymbolMatch = {
	beginRegex: /^\$ENTRY\s+/,
	endRegex: /^\$ENTRY\s+/,
	childMatches: [dataAreaMatch, progMatch, functionMatch]
}

const topLevelMatches: SymbolMatch[] = [overlayMatch];

export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	async provideDocumentSymbols(doc: vscode.TextDocument) {
		const symbols = this._parseText(doc.getText());
		return symbols;
	}

	private _parseText(text: string): vscode.DocumentSymbol[] {
		const topLevelSymbols: vscode.DocumentSymbol[] = [];
		const lines = text.split(/\r\n|\r|\n/);
		const matchStack: SymbolMatch[] = []; //for finding children
		const symbolStack: vscode.DocumentSymbol[] = []; //for adding children
		let lookFor = topLevelMatches;
		for (let i = 0; i < lines.length; i++) {
			var offset = 0;
			var line = lines[i];
			let match: SymbolMatchResult | null;
			do {
				match = this._getNextMatch(line, offset, lookFor);
				if (matchStack.length > 0) {
					const matchSym = matchStack[matchStack.length - 1];
					if (matchSym.endRegex) {
						const endMatch = matchSym.endRegex.exec(line.slice(offset));
						if (endMatch && (!match?.result || endMatch.index <= match.result.index)) {
							matchStack.pop();
							const sym = symbolStack.pop();
							if (matchStack.length > 0) {
								lookFor = matchStack[matchStack.length - 1].childMatches;
							}
							else {
								lookFor = topLevelMatches;
								if (sym)
									topLevelSymbols.push(sym);
							}
						}
					}
				}
				if (match && match.result) {
					offset = match.result.index + match.result[0].length;
					const docSym = this._buildDocSymbol(line, i, match.result);
					if (symbolStack.length > 0)
						symbolStack[symbolStack.length - 1].children.push(docSym);
					if (match.symbol.endRegex) {
						symbolStack.push(docSym)
						matchStack.push(match.symbol);
					}
					lookFor = match.symbol.childMatches;
				}
			} while (match)
		}
		const sym = symbolStack.pop();
		if (sym)
			topLevelSymbols.push(sym);
		console.log(JSON.stringify(topLevelSymbols));
		return topLevelSymbols;
	}

	private _getNextMatch(line: string, offset: number, lookFor: SymbolMatch[]): SymbolMatchResult | null {
		const matches = lookFor.map(x => {
			const res: SymbolMatchResult = {
				symbol: x,
				result: x.beginRegex.exec(line.slice(offset))
			}
			return res;
		});
		const minIndexMatch = matches.reduce((prev: SymbolMatchResult | null, current: SymbolMatchResult | null) => {
			if (!prev?.result && !current?.result)
				return null;
			if (!current?.result)
				return prev;
			if (!prev?.result)
				return current;
			return (prev.result.index <= current.result.index) ? prev : current
		}, null);
		return minIndexMatch;
	}

	private _buildDocSymbol(line: string, lineNo: number, match: RegExpExecArray): vscode.DocumentSymbol {
		const name = match[0];
		const nameStart = line.indexOf(name);
		const range = new vscode.Range(new vscode.Position(lineNo, nameStart), new vscode.Position(lineNo, nameStart + name.length));
		return new vscode.DocumentSymbol(match[0], match[0], vscode.SymbolKind.Function, range, range)
	}
}