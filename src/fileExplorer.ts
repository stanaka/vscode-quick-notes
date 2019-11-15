import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';
import { moveCursor } from 'readline';
import * as utils from './utils';

//#region Utilities

namespace _ {
	function handleResult<T>(resolve: (result: T) => void, reject: (error: Error) => void, error: Error | null | undefined, result: T): void {
		if (error) {
			reject(massageError(error));
		} else {
			resolve(result);
		}
	}

	function massageError(error: Error & { code?: string }): Error {
		if (error.code === 'ENOENT') {
			return vscode.FileSystemError.FileNotFound();
		}

		if (error.code === 'EISDIR') {
			return vscode.FileSystemError.FileIsADirectory();
		}

		if (error.code === 'EEXIST') {
			return vscode.FileSystemError.FileExists();
		}

		if (error.code === 'EPERM' || error.code === 'EACCESS') {
			return vscode.FileSystemError.NoPermissions();
		}

		return error;
	}

	export function checkCancellation(token: vscode.CancellationToken): void {
		if (token.isCancellationRequested) {
			throw new Error('Operation cancelled');
		}
	}

	export function normalizeNFC(items: string): string;
	export function normalizeNFC(items: string[]): string[];
	export function normalizeNFC(items: string | string[]): string | string[] {
		if (!items) { return items; }
		if (process.platform !== 'darwin') {
			return items;
		}

		if (Array.isArray(items)) {
			return items.map(item => item.normalize('NFC'));
		}

		return items.normalize('NFC');
	}

	export function readdir(path: string): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			fs.readdir(path, (error, children) => handleResult(resolve, reject, error, normalizeNFC(children)));
		});
	}

	export function stat(path: string): Promise<fs.Stats> {
		return new Promise<fs.Stats>((resolve, reject) => {
			fs.stat(path, (error, stat) => handleResult(resolve, reject, error, stat));
		});
	}

	export function readfile(path: string): Promise<Buffer> {
		return new Promise<Buffer>((resolve, reject) => {
			fs.readFile(path, (error, buffer) => handleResult(resolve, reject, error, buffer));
		});
	}

	export function writefile(path: string, content: Buffer): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.writeFile(path, content, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function exists(path: string): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			fs.exists(path, exists => handleResult(resolve, reject, null, exists));
		});
	}

	export function rmrf(path: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			rimraf(path, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function mkdir(path: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			mkdirp(path, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function rename(oldPath: string, newPath: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.rename(oldPath, newPath, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function unlink(path: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.unlink(path, error => handleResult(resolve, reject, error, void 0));
		});
	}
}

export class FileStat implements vscode.FileStat {

	constructor(private fsStat: fs.Stats) { }

	get type(): vscode.FileType {
		return this.fsStat.isFile() ? vscode.FileType.File : this.fsStat.isDirectory() ? vscode.FileType.Directory : this.fsStat.isSymbolicLink() ? vscode.FileType.SymbolicLink : vscode.FileType.Unknown;
	}

	get isFile(): boolean | undefined {
		return this.fsStat.isFile();
	}

	get isDirectory(): boolean | undefined {
		return this.fsStat.isDirectory();
	}

	get isSymbolicLink(): boolean | undefined {
		return this.fsStat.isSymbolicLink();
	}

	get size(): number {
		return this.fsStat.size;
	}

	get ctime(): number {
		return this.fsStat.ctime.getTime();
	}

	get mtime(): number {
		return this.fsStat.mtime.getTime();
	}
}

interface Entry {
	uri: vscode.Uri;
	type: vscode.FileType;
	description: string;
}

//#endregion

export class FileSystemProvider implements vscode.TreeDataProvider<Entry>, vscode.FileSystemProvider {


	private _onDidChangeTreeData: vscode.EventEmitter<undefined> = new vscode.EventEmitter<undefined>();
	readonly onDidChangeTreeData: vscode.Event<undefined> = this._onDidChangeTreeData.event;

	private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]>;

	public filter = "";

	constructor() {
		this._onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	}

	get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
		return this._onDidChangeFile.event;
	}

	refresh(): void {
		console.log("aaa");

		this._onDidChangeTreeData.fire();
	}

	watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
		const watcher = fs.watch(uri.fsPath, { recursive: options.recursive }, async (event: string, filename: string | Buffer) => {
			const filepath = path.join(uri.fsPath, _.normalizeNFC(filename.toString()));

			// TODO support excludes (using minimatch library?)

			this._onDidChangeFile.fire([{
				type: event === 'change' ? vscode.FileChangeType.Changed : await _.exists(filepath) ? vscode.FileChangeType.Created : vscode.FileChangeType.Deleted,
				uri: uri.with({ path: filepath })
			} as vscode.FileChangeEvent]);
		});

		return { dispose: () => watcher.close() };
	}

	stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		return this._stat(uri.fsPath);
	}

	async _stat(path: string): Promise<vscode.FileStat> {
		return new FileStat(await _.stat(path));
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		return this._readDirectory(uri);
	}

	async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		console.log("_readDirectory");
		const children = await _.readdir(uri.fsPath);

		const tmp: [string, vscode.FileType, number][] = [];
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			const stat = await this._stat(path.join(uri.fsPath, child));
			//result.push([child, stat.type, stat.ctime, stat.mtime]);
			tmp.push([child, stat.type, stat.mtime]);
		}
		tmp.sort((a, b) => {
			if (a[1] === b[1]) {
				return a[2] > b[2] ? -1 : 1;
			}
			return a[1] === vscode.FileType.Directory ? -1 : 1;
		});

		const result: [string, vscode.FileType][] = [];
		for (let i = 0; i < tmp.length; i++) {
			result.push([tmp[i][0], tmp[i][1]]);
		}
		/*
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			const stat = await this._stat(path.join(uri.fsPath, child));
			//result.push([child, stat.type, stat.ctime, stat.mtime]);
			result.push([child, stat.type]);
		}
		*/
		return Promise.resolve(result);
	}

	createDirectory(uri: vscode.Uri): void | Thenable<void> {
		return _.mkdir(uri.fsPath);
	}

	readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
		return _.readfile(uri.fsPath);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
		return this._writeFile(uri, content, options);
	}

	async _writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
		const exists = await _.exists(uri.fsPath);
		if (!exists) {
			if (!options.create) {
				throw vscode.FileSystemError.FileNotFound();
			}

			await _.mkdir(path.dirname(uri.fsPath));
		} else {
			if (!options.overwrite) {
				throw vscode.FileSystemError.FileExists();
			}
		}

		return _.writefile(uri.fsPath, content as Buffer);
	}

	delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
		if (options.recursive) {
			return _.rmrf(uri.fsPath);
		}

		return _.unlink(uri.fsPath);
	}

	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
		return this._rename(oldUri, newUri, options);
	}

	async _rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): Promise<void> {
		const exists = await _.exists(newUri.fsPath);
		if (exists) {
			if (!options.overwrite) {
				throw vscode.FileSystemError.FileExists();
			} else {
				await _.rmrf(newUri.fsPath);
			}
		}

		const parentExists = await _.exists(path.dirname(newUri.fsPath));
		if (!parentExists) {
			await _.mkdir(path.dirname(newUri.fsPath));
		}

		return _.rename(oldUri.fsPath, newUri.fsPath);
	}

	// original
	readDirectory2(uri: vscode.Uri): [string, vscode.FileType, string, number, number][] | Thenable<[string, vscode.FileType, string, number, number][]> {
		return this._readDirectory2(uri);
	}

	async _readDirectory2(uri: vscode.Uri): Promise<[string, vscode.FileType, string, number, number][]> {
		const result: [string, vscode.FileType, string, number, number][] = [];
		try {
			const children = await _.readdir(uri.fsPath);

			for (let i = 0; i < children.length; i++) {
				const child = children[i];
				const stat = await this._stat(path.join(uri.fsPath, child));
				if (stat.type === vscode.FileType.Directory) {
					const res = await this._readDirectory2(vscode.Uri.file(path.join(uri.fsPath, child)));
					for (let i = 0; i < res.length; i++) {
						result.push(res[i]);
					}
				} else {
					if (child[0] !== ".") {
						const contents = await this.readFile(vscode.Uri.file(path.join(uri.fsPath, child)));
						const description = contents.toString();
						if (this.filter === "" || description.toLowerCase().indexOf(this.filter.toLowerCase()) > 0) {
							result.push([path.join(uri.fsPath, child), stat.type, description, stat.ctime, stat.mtime]);
						}
					}
				}
			}
			return Promise.resolve(result);
		} catch (err) {
			console.log(err);
			return Promise.reject(result);
		}

	}

	// tree data provider
	async getChildren(element?: Entry): Promise<Entry[]> {
		console.log("getChildren:", element);
		//const uri = vscode.Uri.file('/Users/stanaka/Dropbox/PlainText/howm');
		const basePath = utils.getBasePath();
		if (basePath === "") { return []; }
		console.log("getChildren: path: ", basePath);
		const uri = vscode.Uri.file(basePath);
		const children = await this.readDirectory2(uri);
		children.sort((a, b) => {
			if (a[1] === b[1]) {
				//return a[0].localeCompare(b[0]);
				return a[4] > b[4] ? -1 : 1;
			}
			return a[1] === vscode.FileType.Directory ? -1 : 1;
		});
		//return children.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(uri.fsPath, name)), type }));
		console.log("getChildren: end");
		return children.map(([name, type, description]) => ({ uri: vscode.Uri.file(name), type, description }));
		/*
		if (element) {
			const children = await this.readDirectory(element.uri);
			return children.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(element.uri.fsPath, name)), type }));
        }
        const uri = vscode.Uri.file('/Users/stanaka/Dropbox/PlainText/howm');
        const children = await this.readDirectory(uri);
        children.sort((a, b) => {
            if (a[1] === b[1]) {
                //return a[0].localeCompare(b[0]);
                return 0;
            }
            return a[1] === vscode.FileType.Directory ? -1 : 1;
        });
		return children.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(uri.fsPath, name)), type }));
		*/
        /*
        const workspaceFolders = vscode.workspace.workspaceFolders;
		//const workspaceFolder = vscode.workspace.workspaceFolders.filter(folder => folder.uri.scheme === 'file')[0];
        if(workspaceFolders) {
    		const workspaceFolder = workspaceFolders.filter(folder => folder.uri.scheme === 'file')[0];
    		if (workspaceFolder) {
		    	const children = await this.readDirectory(workspaceFolder.uri);
    			children.sort((a, b) => {
	    			if (a[1] === b[1]) {
		    			return a[0].localeCompare(b[0]);
			    	}
    				return a[1] === vscode.FileType.Directory ? -1 : 1;
	    		});
		    	return children.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, name)), type }));
    		}
        }
		return [];
        */
	}

	getTreeItem(element: Entry): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(element.uri, element.type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
		if (element.type === vscode.FileType.File) {
			treeItem.command = { command: 'fileExplorer.openFile', title: "Open File", arguments: [element.uri], };
			treeItem.label = element.description.split('\n')[0].replace(/^# ?/, '');
			treeItem.tooltip = element.uri.fsPath;
			const firstRowEndPos = element.description.indexOf('\n', 0);
			treeItem.description = element.description.substr(firstRowEndPos + 1)
				.replace(/\n/g, ' ')
				.replace(/\[[0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+\]/, '')
				.replace(/ +/g, ' ')
				.replace(/^ /, '');
			treeItem.contextValue = 'file';
		}
		return treeItem;
	}
}

export class FileExplorer {

	private fileExplorer: vscode.TreeView<Entry>;

	readonly treeDataProvider: FileSystemProvider;

	constructor(context: vscode.ExtensionContext) {
		const treeDataProvider = new FileSystemProvider();
		this.fileExplorer = vscode.window.createTreeView('fileExplorer', { treeDataProvider });
		this.treeDataProvider = treeDataProvider;
		vscode.commands.registerCommand('fileExplorer.openFile', (resource) => this.openResource(resource));
		vscode.commands.registerCommand('fileExplorer.quickNotesCreateNewNote', () => this.newNote());
		vscode.commands.registerCommand('fileExplorer.refreshFile', () => this.treeDataProvider.refresh());
		vscode.commands.registerCommand('fileExplorer.filter', () => {
			this.filter();
			this.treeDataProvider.refresh();
		});
	}

	private openResource(resource: vscode.Uri): void {
		vscode.window.showTextDocument(resource);
	}

	private isFolderDescriptor(filepath: string): boolean {
		return filepath.charAt(filepath.length - 1) === path.sep;
	}

	private createFileOrFolder(absolutePath: string): void {
		let directoryToFile = path.dirname(absolutePath);

		if (!fs.existsSync(absolutePath)) {
			if (this.isFolderDescriptor(absolutePath)) {
				mkdirp.sync(absolutePath);
			} else {
				mkdirp.sync(directoryToFile);
				fs.appendFileSync(absolutePath, '');
			}
		}
	}

	private newNote(): void {
		console.log("newNote");
		this._newNote();
	}

	private async _newNote(): Promise<void> {
		console.log("_newNote");
		const basePath = utils.getBasePath();
		if (basePath === "") { return; }
		console.log("_newNote: ", basePath);

		const now = new Date();
		const year = now.getFullYear();
		const month = ('0' + (now.getMonth() + 1)).slice(-2);
		const date = ('0' + now.getDate()).slice(-2);
		const hour = ('0' + now.getHours()).slice(-2);
		const min = ('0' + now.getMinutes()).slice(-2);
		const sec = ('0' + now.getSeconds()).slice(-2);

		const fileName = `${year}/${month}/${year}-${month}-${date}-${hour}${min}${sec}.md`;
		const initialContents = `# \n[${year}-${month}-${date} ${hour}:${min}]`;

		const newFile = path.join(basePath, fileName);
		this.createFileOrFolder(newFile);
		const textDocument = await vscode.workspace.openTextDocument(newFile);

		console.log("_newNote: ", textDocument);
		if (textDocument) {
			const editor = await vscode.window.showTextDocument(textDocument, vscode.ViewColumn.Active);
			await editor.edit((edit) => {
				edit.insert(new vscode.Position(0, 0), initialContents);
			});

			const position = editor.selection.active;
			var newPosition = position.with(0, 2);
			var newSelection = new vscode.Selection(newPosition, newPosition);
			editor.selection = newSelection;
		}
	}

	private async filter() {

		const filter = await vscode.window.showInputBox({ placeHolder: 'Filter string...' });

		//if ( !filter || this.treeDataProvider.filter === filter ) { return; };
		if (this.treeDataProvider.filter === filter) { return; }

		if (filter) {
			this.treeDataProvider.filter = filter;
		} else {
			this.treeDataProvider.filter = "";
		}
		//vscode.commands.executeCommand ( 'setContext', 'todo-embedded-filtered', true );
		this.treeDataProvider.refresh();
	}

}