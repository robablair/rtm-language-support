import * as vscode from 'vscode';

type SymbolRegex = {
	regex: RegExp,
	nameIndex: number,
	detail: string,
	symbolKind: vscode.SymbolKind
}

const procMatch: SymbolRegex = {
	regex: /^([A-Z](?:\.?\w)*)\s+PROC(\(.*\))?/gm,
	nameIndex: 1,
	detail: "Proc: {1}{2}",
	symbolKind: vscode.SymbolKind.Function
}

const overlayMatch: SymbolRegex = {
	regex: /^\$ENTRY\s+([A-Z](?:\.?\w)*)\b[\s\S]*?\$PROG(\([\s\S]*?\))/gm,
	nameIndex: 1,
	detail: "Overlay: {1}{2}",
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

  private getLineAndColumn(lines: string[], position: number) {
		let length = 0;
		let lineNo = 0;
		for (lineNo; lineNo < lines.length; lineNo++) {
			const line = lines[lineNo];
			length += line.length;
			if (length > position)
					break;
		}
		const column = position - (length - lines[lineNo].length);
		return new vscode.Position(lineNo, column)
	}

	private parseDetail(detail: string, values: RegExpExecArray) {
		var regexp = new RegExp(/\{(\d+)\}/);
		let res;
		while ((res = regexp.exec(detail)) != null) {
			const match = <RegExpExecArray>res;
			if (match !== null) {
				const value = +match[1];
				detail = detail.replace("{"+ match[1] +"}", values[value]);
			}
		}
		return detail;
	}

	private _parseText(text: string): vscode.DocumentSymbol[] {
		const r: vscode.DocumentSymbol[] = [];
		const lines = text.split(/\r\n|\r|\n/);
		symbolMatches.forEach(m => {
			var regexp = new RegExp(m.regex);
			let res;
			while ((res = regexp.exec(text)) != null) {
				const match = <RegExpExecArray>res;
				if (match !== null) {
					const fullMatch = match[0];
					const fullMatchStart = regexp.lastIndex - fullMatch.length;
					const name = match[m.nameIndex];
					const nameStart = text.indexOf(name, fullMatchStart);
					const detail = this.parseDetail(m.detail, match);
					let pos = this.getLineAndColumn(lines, fullMatchStart);
					const range = new vscode.Range(pos, new vscode.Position(pos.line, pos.character + fullMatch.length));
					pos = this.getLineAndColumn(lines, nameStart);
					const selectionRange = new vscode.Range(pos, new vscode.Position(pos.line, pos.character + name.length));
					r.push({
							name: match[m.nameIndex],
							children: [],
							detail: detail,
							kind: m.symbolKind,
							range: range,
							selectionRange: selectionRange
					});
				}
			}
		});
		return r;
	}


			/*const lines = text.split(/\r\n|\r|\n/);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			symbolMatches.forEach(m => {
				const match = m.regex.exec(line);
				if (match !== null) {
                    const fullMatch = match[0];
                    const fullMatchStart = line.indexOf(fullMatch);
										const name = match[m.nameIndex];
										const detail = match.slice(1).join(" ");
                    const nameStart = line.indexOf(name);
                    const range = new vscode.Range(new vscode.Position(i, fullMatchStart), new vscode.Position(i, fullMatchStart + fullMatch.length));
                    const selectionRange = new vscode.Range(new vscode.Position(i, nameStart), new vscode.Position(i, nameStart + name.length));
					r.push({
                        name: match[m.nameIndex],
                        children: [],
                        detail: detail,
                        kind: m.symbolKind,
                        range: range,
                        selectionRange: selectionRange
					});
				}
			});
		}*/

}