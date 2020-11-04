import * as vscode from 'vscode';
import { WorkspaceSymbolService } from './WorkspaceSymbolService';

export class WorkspaceSymbolProvider
  implements vscode.WorkspaceSymbolProvider<vscode.SymbolInformation> {

  private workspaceSymbolContainer: WorkspaceSymbolService

  constructor(workspaceSymbolContainer: WorkspaceSymbolService) {
    this.workspaceSymbolContainer = workspaceSymbolContainer;
  }

  async provideWorkspaceSymbols(query: string) {
    const allDocSymbols = await this.workspaceSymbolContainer.getAllSymbols();
    const allSymbolInfo = allDocSymbols.flatMap(x => x.toSymbolInformation());
    return allSymbolInfo;
  }
}
