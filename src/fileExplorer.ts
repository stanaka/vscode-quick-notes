import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as utils from './utils'
import * as moment from 'moment'

import { rgPath } from '@vscode/ripgrep'
// import { exec } from 'child_process'
import { spawn } from 'child_process'
//import * as child_process from 'child_process'

//#region Utilities
/* eslint-disable @typescript-eslint/no-namespace, no-inner-declarations, @typescript-eslint/no-misused-promises */

namespace _ {
    function handleResult<T>(
        resolve: (result: T) => void,
        reject: (error: Error) => void,
        error: Error | null | undefined,
        result: T
    ): void {
        if (error) {
            reject(massageError(error))
        } else {
            resolve(result)
        }
    }

    function massageError(error: Error & { code?: string }): Error {
        if (error.code === 'ENOENT') {
            return vscode.FileSystemError.FileNotFound()
        }

        if (error.code === 'EISDIR') {
            return vscode.FileSystemError.FileIsADirectory()
        }

        if (error.code === 'EEXIST') {
            return vscode.FileSystemError.FileExists()
        }

        if (error.code === 'EPERM' || error.code === 'EACCESS') {
            return vscode.FileSystemError.NoPermissions()
        }

        return error
    }

    export function checkCancellation(token: vscode.CancellationToken): void {
        if (token.isCancellationRequested) {
            throw new Error('Operation cancelled')
        }
    }

    export function normalizeNFC(items: string): string
    export function normalizeNFC(items: string[]): string[]
    export function normalizeNFC(items: string | string[]): string | string[] {
        if (!items) {
            return items
        }
        if (process.platform !== 'darwin') {
            return items
        }

        if (Array.isArray(items)) {
            return items.map((item) => item.normalize('NFC'))
        }

        return items.normalize('NFC')
    }

    export function readdir(path: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            fs.readdir(path, (error, children) =>
                handleResult(resolve, reject, error, normalizeNFC(children))
            )
        })
    }

    export function stat(path: string): Promise<fs.Stats> {
        return new Promise<fs.Stats>((resolve, reject) => {
            fs.stat(path, (error, stat) =>
                handleResult(resolve, reject, error, stat)
            )
        })
    }

    export function readBeginning(path: string): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            fs.open(path, 'r', (err, fd) => {
                const buff = Buffer.alloc(1000)
                fs.read(fd, buff, 0, 1000, 0, (error, byteReads, buffer) =>
                    handleResult(resolve, reject, error, buffer)
                )
            })
        })
    }

    export function readfile(path: string): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            fs.readFile(path, (error, buffer) =>
                handleResult(resolve, reject, error, buffer)
            )
        })
    }

    export function writefile(path: string, content: Buffer): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(path, content, (error) =>
                handleResult(resolve, reject, error, void 0)
            )
        })
    }

    export function exists(path: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            fs.exists(path, (exists) =>
                handleResult(resolve, reject, null, exists)
            )
        })
    }

    export function rmrf(path: string): Promise<void> {
        return fs.promises.rm(path, { recursive: true, force: true })
    }

    export function rename(oldPath: string, newPath: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.rename(oldPath, newPath, (error) =>
                handleResult(resolve, reject, error, void 0)
            )
        })
    }

    export function unlink(path: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.unlink(path, (error) =>
                handleResult(resolve, reject, error, void 0)
            )
        })
    }
}

export class FileStat implements vscode.FileStat {
    constructor(private fsStat: fs.Stats) {}

    get type(): vscode.FileType {
        return this.fsStat.isFile()
            ? vscode.FileType.File
            : this.fsStat.isDirectory()
            ? vscode.FileType.Directory
            : this.fsStat.isSymbolicLink()
            ? vscode.FileType.SymbolicLink
            : vscode.FileType.Unknown
    }

    get isFile(): boolean | undefined {
        return this.fsStat.isFile()
    }

    get isDirectory(): boolean | undefined {
        return this.fsStat.isDirectory()
    }

    get isSymbolicLink(): boolean | undefined {
        return this.fsStat.isSymbolicLink()
    }

    get size(): number {
        return this.fsStat.size
    }

    get ctime(): number {
        return this.fsStat.ctime.getTime()
    }

    get mtime(): number {
        return this.fsStat.mtime.getTime()
    }
}

interface Entry {
    uri: vscode.Uri
    type: vscode.FileType
    description: string
}

//#endregion

export class FileSystemProvider
    implements vscode.TreeDataProvider<Entry>, vscode.FileSystemProvider
{
    private _onDidChangeTreeData: vscode.EventEmitter<undefined> =
        new vscode.EventEmitter<undefined>()
    readonly onDidChangeTreeData: vscode.Event<undefined> =
        this._onDidChangeTreeData.event

    private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]>

    public filter = ''

    constructor() {
        this._onDidChangeFile = new vscode.EventEmitter<
            vscode.FileChangeEvent[]
        >()
    }

    get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
        return this._onDidChangeFile.event
    }

    refresh(): void {
        console.log('aaa')

        this._onDidChangeTreeData.fire(undefined)
    }

    watch(
        uri: vscode.Uri,
        options: { recursive: boolean; excludes: string[] }
    ): vscode.Disposable {
        const watcher = fs.watch(
            uri.fsPath,
            { recursive: options.recursive },
            async (event: string, filename: string | Buffer | null) => {
                if (!filename) {
                    // filename was not provided.
                    console.log('filename was not provided.')
                    return
                }
                const filepath = path.join(
                    uri.fsPath,
                    _.normalizeNFC(filename.toString())
                )

                // TODO support excludes (using minimatch library?)

                this._onDidChangeFile.fire([
                    {
                        type:
                            event === 'change'
                                ? vscode.FileChangeType.Changed
                                : (await _.exists(filepath))
                                ? vscode.FileChangeType.Created
                                : vscode.FileChangeType.Deleted,
                        uri: uri.with({ path: filepath }),
                    } as vscode.FileChangeEvent,
                ])
            }
        )

        return { dispose: () => watcher.close() }
    }

    stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        return this._stat(uri.fsPath)
    }

    async _stat(path: string): Promise<vscode.FileStat> {
        return new FileStat(await _.stat(path))
    }

    // this readDirectory function returns empty array regardless the uri.
    readDirectory():
        | [string, vscode.FileType][]
        | Thenable<[string, vscode.FileType][]> {
        const result: [string, vscode.FileType][] = []
        return Promise.resolve(result)
    }

    async createDirectory(uri: vscode.Uri): Promise<void> {
        await fs.promises.mkdir(uri.fsPath, { recursive: true })
    }

    readBeginning(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        return _.readBeginning(uri.fsPath)
    }

    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        return _.readfile(uri.fsPath)
    }

    writeFile(
        uri: vscode.Uri,
        content: Uint8Array,
        options: { create: boolean; overwrite: boolean }
    ): void | Thenable<void> {
        return this._writeFile(uri, content, options)
    }

    async _writeFile(
        uri: vscode.Uri,
        content: Uint8Array,
        options: { create: boolean; overwrite: boolean }
    ): Promise<void> {
        const exists = await _.exists(uri.fsPath)
        if (!exists) {
            if (!options.create) {
                throw vscode.FileSystemError.FileNotFound()
            }

            await fs.promises.mkdir(path.dirname(uri.fsPath), {
                recursive: true,
            })
        } else {
            if (!options.overwrite) {
                throw vscode.FileSystemError.FileExists()
            }
        }

        return _.writefile(uri.fsPath, content as Buffer)
    }

    async delete(
        uri: vscode.Uri,
        options: { recursive: boolean }
    ): Promise<void> {
        if (options.recursive) {
            await fs.promises.rm(uri.fsPath, { recursive: true, force: true })
        }

        return _.unlink(uri.fsPath)
    }

    rename(
        oldUri: vscode.Uri,
        newUri: vscode.Uri,
        options: { overwrite: boolean }
    ): void | Thenable<void> {
        return this._rename(oldUri, newUri, options)
    }

    async _rename(
        oldUri: vscode.Uri,
        newUri: vscode.Uri,
        options: { overwrite: boolean }
    ): Promise<void> {
        const exists = await _.exists(newUri.fsPath)
        if (exists) {
            if (!options.overwrite) {
                throw vscode.FileSystemError.FileExists()
            } else {
                await _.rmrf(newUri.fsPath)
            }
        }

        const parentExists = await _.exists(path.dirname(newUri.fsPath))
        if (!parentExists) {
            await fs.promises.mkdir(path.dirname(newUri.fsPath), {
                recursive: true,
            })
        }

        return _.rename(oldUri.fsPath, newUri.fsPath)
    }

    // async exec(execBuf: string[], cwd: string): Promise<string[]> {
    //     execBuf.push(cwd) // need to specify path

    //     return new Promise(function (resolve, reject) {
    //         const execString = execBuf.join(' ')
    //         child_process.exec(
    //             // child_process.spawn(
    //             execString,
    //             { cwd: cwd, timeout: 30000 },
    //             (error, stdout, stderr) => {
    //                 if (!error || (error && stderr === '')) {
    //                     resolve(stdout.split('\n'))
    //                 } else {
    //                     reject()
    //                 }
    //             }
    //         )
    //     })
    // }

    async exec(execBuf: string[], cwd: string): Promise<string[]> {
        execBuf.push(cwd) // need to specify path
        return new Promise(function (resolve, reject) {
            const childProcess = spawn(execBuf[0], execBuf.slice(1), {
                cwd: cwd,
            })
            const stdout: string[] = []
            let stderr = ''
            let count = 0
            childProcess.stdout.on('data', (data: NodeJS.ReadableStream) => {
                const lines = data.toString().split(/(\r?\n)/g)
                lines.forEach((l) => {
                    if (l !== '\n' && l !== '' && count <= 100) {
                        stdout.push(l)
                        count++
                    }
                })
                console.log('getting result: ', count)
                if (count > 100) {
                    // usually it's over 100.
                    childProcess.kill()
                    resolve(stdout)
                }
            })
            childProcess.stderr.on('data', (data: NodeJS.ReadableStream) => {
                stderr += data.toString()
            })

            childProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout)
                } else {
                    reject(new Error(stderr))
                }
            })
            childProcess.on('error', (err) => {
                reject(err)
            })
        })
    }

    // tree data provider
    async getChildren(element?: Entry): Promise<Entry[]> {
        console.log('getChildren:', element)
        //const uri = vscode.Uri.file('/Users/stanaka/Dropbox/PlainText/howm');
        const basePath = utils.getBasePath()
        if (basePath === '') {
            return []
        }
        console.log('getChildren: path: ', basePath)
        // const uri = vscode.Uri.file(basePath)

        const execBuf = [
            `${rgPath}`,
            '--files-with-matches',
            '--sortr=modified',
            '--ignore-case',
        ]
        if (this.filter === '') {
            execBuf.push('.')
        } else {
            execBuf.push(`${this.filter}`)
        }
        console.log(execBuf)
        let matches: string[] = []
        try {
            matches = await this.exec(execBuf, basePath)
            console.log('the num of matches is ', matches.length)
        } catch (e) {
            console.error(e)
        }

        const matchFiles = []
        for (let i = 0; i < matches.length; i++) {
            const name = matches[i]
            if (name !== '') {
                // console.log('name', name)
                const stat = await this._stat(name)
                const uri = vscode.Uri.file(name)
                // const contents = await this.readFile(vscode.Uri.file(name));
                const contents = await this.readBeginning(uri) // .toString('utf8', 0, 100);
                const description = contents.toString()
                // console.log(description)
                matchFiles.push([stat.mtime, uri, description])
            }
        }

        matchFiles.sort((a, b) => {
            return a[0] > b[0] ? -1 : 1
        })
        // const stat = await this._stat(path.join(uri.fsPath, child));
        return matchFiles.map((f) => ({
            uri: f[1] as vscode.Uri,
            type: vscode.FileType.File,
            description: f[2] as string,
        }))
    }

    getTreeItem(element: Entry): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            element.uri,
            element.type === vscode.FileType.Directory
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        )
        if (element.type === vscode.FileType.File) {
            treeItem.command = {
                command: 'fileExplorer.openFile',
                title: 'Open File',
                arguments: [element.uri],
            }
            const regexYAMLFrontmatter = /---\n.*?\n---\n/s
            const description = element.description
                // remove YAML frontmatter (https://pandoc.org/MANUAL.html#extension-yaml_metadata_block)
                .replace(regexYAMLFrontmatter, '')

            // use the first line as a label
            const label = description.split('\n')[0].replace(/^# ?/, '')
            // try to remove a datetime part from the label
            const label_without_date = label.replace(
                /[0-9]+-[0-9]+-[0-9]+-[0-9]+ /,
                ''
            )
            // if it's empty, then use the not-removed label
            if (label_without_date.match(/^ *$/)) {
                treeItem.label = label
            } else {
                treeItem.label = label_without_date
            }

            treeItem.tooltip = element.uri.fsPath
            const firstRowEndPos = description.indexOf('\n', 0)

            treeItem.description = description
                // remove the first line as it's used as a label
                .substring(firstRowEndPos + 1)
                .replace(/\n/g, ' ')
                .replace(/\[[0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+\]/, '')
                .replace(/ +/g, ' ')
                .replace(/^ /, '')
            // console.log(treeItem.description)
            treeItem.contextValue = 'file'
        }
        return treeItem
    }
}

export class FileExplorer {
    private fileExplorer: vscode.TreeView<Entry>

    readonly treeDataProvider: FileSystemProvider

    constructor() {
        const treeDataProvider = new FileSystemProvider()
        this.fileExplorer = vscode.window.createTreeView('fileExplorer', {
            treeDataProvider,
        })
        this.treeDataProvider = treeDataProvider
        vscode.commands.registerCommand(
            'fileExplorer.openFile',
            (resource: vscode.Uri) => this.openResource(resource)
        )
        vscode.commands.registerCommand(
            'fileExplorer.quickNotesCreateNewNote',
            () => this.newNote()
        )
        vscode.commands.registerCommand('fileExplorer.refreshFile', () =>
            this.treeDataProvider.refresh()
        )
        vscode.commands.registerCommand('fileExplorer.filter', async () => {
            await this.filter()
            this.treeDataProvider.refresh()
        })
    }

    private async openResource(resource: vscode.Uri): Promise<void> {
        await vscode.window.showTextDocument(resource)
    }

    private isFolderDescriptor(filepath: string): boolean {
        return filepath.charAt(filepath.length - 1) === path.sep
    }

    private async createFileOrFolder(absolutePath: string): Promise<void> {
        const directoryToFile = path.dirname(absolutePath)

        if (!fs.existsSync(absolutePath)) {
            if (this.isFolderDescriptor(absolutePath)) {
                await fs.promises.mkdir(absolutePath, { recursive: true })
            } else {
                await fs.promises.mkdir(directoryToFile, { recursive: true })
                fs.appendFileSync(absolutePath, '')
            }
        }
    }

    private async getNewNoteContent(): Promise<string> {
        const templatePath = utils.getTemplatePath()

        let content = ''
        if (!fs.existsSync(templatePath)) {
            console.log("templatePath '" + templatePath + "' doesn't exist.")
        } else {
            content = (
                await fs.promises.readFile(utils.getTemplatePath())
            ).toString()
        }
        if (content == '') {
            content = '# {{date:YYYY-MM-DD HH:mm}}'
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        content = content.replaceAll(/{{date(?::([^}]+))?}}/g, (match, p1) => {
            const dateFormat = p1 != undefined ? (p1 as string) : 'YYYY-MM-DD'
            return moment().format(dateFormat)
        })

        return content
    }

    private async newNote(): Promise<void> {
        console.log('newNote')
        await this._newNote()
    }

    private async _newNote(): Promise<void> {
        console.log('_newNote')
        const basePath = utils.getBasePath()
        if (basePath === '') {
            return
        }
        console.log('_newNote: ', basePath)
        const notePathPattern =
            utils.getNotePathPattern() || 'YYYY/MM/YYYY-MM-DD-HHmmss[.md]'

        const fileName = moment().format(notePathPattern)

        const initialContents = await this.getNewNoteContent()

        const newFile = path.join(basePath, fileName)
        await this.createFileOrFolder(newFile)
        const textDocument = await vscode.workspace.openTextDocument(newFile)

        console.log('_newNote: ', textDocument)
        if (textDocument) {
            const editor = await vscode.window.showTextDocument(
                textDocument,
                vscode.ViewColumn.Active
            )
            await editor.edit((edit) => {
                edit.insert(new vscode.Position(0, 0), initialContents)
            })

            let cursor = utils.findLocationOfContent(initialContents)
            if (initialContents.startsWith('# ', cursor)) {
                cursor += 2
            }
            const newPosition = editor.document.positionAt(cursor)
            const newSelection = new vscode.Selection(newPosition, newPosition)
            editor.selection = newSelection
        }
    }

    private async filter() {
        const filter = await vscode.window.showInputBox({
            placeHolder: 'Filter string...',
        })

        //if ( !filter || this.treeDataProvider.filter === filter ) { return; };
        if (this.treeDataProvider.filter === filter) {
            return
        }

        if (filter) {
            this.treeDataProvider.filter = filter
        } else {
            this.treeDataProvider.filter = ''
        }
        //vscode.commands.executeCommand ( 'setContext', 'todo-embedded-filtered', true );
        this.treeDataProvider.refresh()
    }
}
