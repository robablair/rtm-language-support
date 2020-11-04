import * as vscode from 'vscode';
import { WorkspaceSymbolService } from './WorkspaceSymbolService';

export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {	
	private _symbols: WorkspaceSymbolService;

	constructor(symbols: WorkspaceSymbolService) {
		this._symbols = symbols;
	}

	async provideDocumentSymbols(doc: vscode.TextDocument) {
		const allSymbols = await this._symbols.getSymbolsFromFileUri(doc.uri);
		const docSymbols = allSymbols.filter(x => x.documentUri.path === doc.uri.path);
		return docSymbols?.map(x => x.toDocumentSymbol()) ?? [];
	}
}