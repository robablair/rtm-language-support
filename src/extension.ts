// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DocumentSymbolProvider } from './DocumentSymbolProvider';
import { WorkspaceSymbolProvider } from './WorkspaceSymbolProvider';
import { DefinitionProvider } from './DefinitionProvider';

const selector = { language: 'rtm', scheme: 'file' };

const docSymbolProvider = new DocumentSymbolProvider();
const workspaceSymbolProvider = new WorkspaceSymbolProvider(docSymbolProvider);
const definitionProvider = new DefinitionProvider(docSymbolProvider);

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

	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, docSymbolProvider));

	context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(workspaceSymbolProvider));

	context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, definitionProvider));
}