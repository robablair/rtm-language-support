// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DocumentSymbolProvider } from './DocumentSymbolProvider';

const selector = { language: 'rtm', scheme: 'file' };

const symbolProvider = new DocumentSymbolProvider();

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "helloworld-sample" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('extension.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World!');
	}));

	context.subscriptions.push(vscode.languages.registerHoverProvider(selector, {
		 async provideHover(doc, pos) {
			return new vscode.Hover("Test")
		}
	}));

	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, symbolProvider));

	context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, {
		async provideDefinition(doc, pos) {
			const symbols = await symbolProvider.provideDocumentSymbols(doc)
			const wordRange = doc.getWordRangeAtPosition(pos)
			if (wordRange) {
				const symbol = symbols.find(x => x.name === doc.getText(wordRange))
				if (symbol) {
					return new vscode.Location(doc.uri, symbol.selectionRange.start)
				}
			}
			return new vscode.Location(doc.uri, pos)
		}
	}));
}