// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DocumentSymbolProvider } from './DocumentSymbolProvider';
import { WorkspaceSymbolProvider } from './WorkspaceSymbolProvider';
import { DefinitionProvider } from './DefinitionProvider';
import { WorkspaceSymbolService } from './WorkspaceSymbolService';
import { SymbolLocator } from './SymbolLocator';

const selector = { language: 'rtm', scheme: 'file' };

const symbolContainer = new WorkspaceSymbolService();
const symbolLocator = new SymbolLocator(symbolContainer)
const docSymbolProvider = new DocumentSymbolProvider(symbolContainer);
const workspaceSymbolProvider = new WorkspaceSymbolProvider(symbolContainer);
const definitionProvider = new DefinitionProvider(symbolLocator);

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('extension.getSymbols', () => {
		vscode.window.showInformationMessage('Hello World!');
		const doc = vscode.window.activeTextEditor?.document;
		if (doc) {
			docSymbolProvider.provideDocumentSymbols(doc).
				then(x => console.log(JSON.stringify(x)))
		}
	}));

	context.subscriptions.push(vscode.languages.registerHoverProvider(selector, {
		async provideHover(doc, pos) {
			const wordRange = doc.getWordRangeAtPosition(pos);
			if (wordRange) {
				let def = await symbolLocator.locateSymbol(doc, pos);
				if (def) {
					return new vscode.Hover(def.detail);
				}
			}
			return null;
		}
	}));

	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, docSymbolProvider));

	context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(workspaceSymbolProvider));

	context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, definitionProvider));
}