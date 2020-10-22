// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DocumentSymbolProvider } from './DocumentSymbolProvider';
import { WorkspaceSymbolProvider } from './WorkspaceSymbolProvider';
import { DefinitionProvider } from './DefinitionProvider';

const selector = { language: 'rtm', scheme: 'file' };

const docSymbolProvider = new DocumentSymbolProvider();
const workspaceSymbolProvider = new WorkspaceSymbolProvider(docSymbolProvider);
const definitionProvider = new DefinitionProvider(workspaceSymbolProvider);

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "helloworld-sample" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('extension.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World!');
	}));

	context.subscriptions.push(vscode.languages.registerHoverProvider(selector, {
		async provideHover(doc, pos) {
        const symbols = await workspaceSymbolProvider.provideWorkspaceDocumentSymbols();
        const wordRange = doc.getWordRangeAtPosition(pos);
         if (wordRange) {
            const symbol = symbols.find(x => x.name === doc.getText(wordRange));
            if (symbol) {
				return new vscode.Hover(symbol.detail);
            }
        }
        return null;
		}
	}));

	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, docSymbolProvider));

	context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(workspaceSymbolProvider));

	context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, definitionProvider));
}