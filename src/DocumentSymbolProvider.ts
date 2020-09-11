import * as vscode from 'vscode';

type SymbolRegex = {
	symbolRegex: RegExp,
	groupIndex: number,
	symbolKind: vscode.SymbolKind
}

const procMatch: SymbolRegex = {
	symbolRegex: /^([A-Z](?:\.?\w)*)\s+PROC(?:\(.*\))?/,
	groupIndex: 1,
	symbolKind: vscode.SymbolKind.Function
}

const overlayMatch: SymbolRegex = {
	symbolRegex: /^\$ENTRY\s+([A-Z](?:\.?\w)*)?/,
	groupIndex: 1,
	symbolKind: vscode.SymbolKind.Function
}

const symbolMatches: SymbolRegex[] = [];
symbolMatches.push(procMatch);
symbolMatches.push(overlayMatch);

export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	async provideDocumentSymbols(doc: vscode.TextDocument) {
		const symbols = this._parseText(doc.getText());
		return symbols;
	}

	private _parseText(text: string): vscode.DocumentSymbol[] {
		const r: vscode.DocumentSymbol[] = [];
		const lines = text.split(/\r\n|\r|\n/);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			symbolMatches.forEach(m => {
				const match = m.symbolRegex.exec(line);
				if (match !== null) {
                    const fullMatch = match[0];
                    const fullMatchStart = line.indexOf(fullMatch);
                    const name = match[m.groupIndex];
                    const nameStart = line.indexOf(name);
                    const range = new vscode.Range(new vscode.Position(i, fullMatchStart), new vscode.Position(i, fullMatchStart + fullMatch.length));
                    const selectionRange = new vscode.Range(new vscode.Position(i, nameStart), new vscode.Position(i, nameStart + name.length));
					r.push({
                        name: match[m.groupIndex],
                        children: [],
                        detail: fullMatch,
                        kind: m.symbolKind,
                        range: range,
                        selectionRange: selectionRange
					});
				}
			});
		}
		return r;
	}
}
