import * as vscode from 'vscode'
import * as matter from 'gray-matter'
import * as moment from 'moment'
import * as utils from './utils'

export const handlerSaveEvent = (event: vscode.TextDocumentWillSaveEvent) => {
    if (
        !vscode.workspace
            .getConfiguration('quickNotes')
            .get('enableUpdateLastModifiedPropertyOnSave')
    ) {
        return
    }

    const document = event.document
    if (!utils.isUnderBasePath(document.uri.path)) {
        console.log(
            `The file: ${
                document.uri.path
            } is not under the base path ${utils.getBasePath()}`
        )
        return
    }

    const fileContents = document.getText()
    if (matter.test(fileContents) == false) {
        console.log(
            `The file: ${document.uri.path} doesn't contain front-matter`
        )
        return
    }

    const properties = matter(fileContents)

    const dateFormat = vscode.workspace
        .getConfiguration('quickNotes')
        .get('lastModifiedPropertyFormat', '')
    const modifiedProperty = vscode.workspace
        .getConfiguration('quickNotes')
        .get('lastModifiedProperty', '')

    const re = new RegExp('^' + modifiedProperty + ':.+$', 'gm')
    const updatedMatter = properties.matter.replace(
        re,
        modifiedProperty + ': ' + moment().format(dateFormat)
    )
    const updatedDoc = '---' + updatedMatter + '\n---\n' + properties.content
    //const updatedDoc = matter.stringify(properties.content, properties.data)

    const range = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(document.lineCount, 0)
    )
    const edit = new vscode.WorkspaceEdit()
    edit.replace(document.uri, range, updatedDoc)

    event.waitUntil(vscode.workspace.applyEdit(edit))
}
