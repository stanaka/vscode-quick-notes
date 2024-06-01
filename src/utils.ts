import * as vscode from 'vscode'
import * as path from 'path'

export function getBasePath(): string {
    const basePath = vscode.workspace
        .getConfiguration('quickNotes')
        .get('basePath', '')

    if (basePath[0] === '~') {
        if (process.env.HOME !== undefined) {
            return path.join(process.env.HOME, basePath.slice(1))
        }
    }
    return basePath
}

export function getTemplatePath(): string {
    const basePath = vscode.workspace
        .getConfiguration('quickNotes')
        .get('templatePath', '')

    if (basePath[0] === '~') {
        if (process.env.HOME !== undefined) {
            return path.join(process.env.HOME, basePath.slice(1))
        }
    }
    return basePath
}
