import * as vscode from 'vscode';
import { DocumentItem, WorkspaceSymbolService } from './WorkspaceSymbolService';

export class DefinitionProvider implements vscode.DefinitionProvider {

    private _workspaceSymbolContainer: WorkspaceSymbolService

    constructor(workspaceSymbolContainer: WorkspaceSymbolService) {
        this._workspaceSymbolContainer = workspaceSymbolContainer;
    }

    async provideDefinition(doc: vscode.TextDocument, pos: vscode.Position) {
        const allSymbols = await this._workspaceSymbolContainer.getSymbols();
        const docSymbols = allSymbols.filter(x => x.documentUri.path === doc.uri.path);
        const wordAtPos = doc.getWordRangeAtPosition(pos);
        if (wordAtPos) {
            this.findDefinitionOfVariable(wordAtPos, docSymbols, allSymbols);
        }
        return new vscode.Location(doc.uri, pos);
    }

    private findDefinitionOfVariable(wordRange: vscode.Range, docItems: DocumentItem[], allDocItems: DocumentItem[]) {
        // const entries = docItems.filter(x => x.name === '$ENTRY')
        // const entry = entries.find(x => x.range)
        // const dataArea = topParent.children.find(x => x.name === '$DATA');
        // let definition = dataArea?.children.find(x => x.name === docItem.name);
        // if (definition)
        //     return definition;
        // //todo: look in includes
        return null;
    }

    private flattenDocumentSymbols(symbols: DocumentItem[]) {
        let children: DocumentItem[] = [];
        children = symbols;
        do {
            children = children.flatMap(x => x.children);
            symbols.push(...children)
        } while (children.some(x => x.children.length > 0));
        return symbols;
    }
}
