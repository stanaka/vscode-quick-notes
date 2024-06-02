import * as vscode from 'vscode'
import * as matter from 'gray-matter'
import * as moment from 'moment'

export const handlerSaveEvent = (event: vscode.TextDocumentWillSaveEvent) => {
    if (
        !vscode.workspace
            .getConfiguration('quickNotes')
            .get('enableUpdateLastModifiedPropertyOnSave')
    ) {
        return
    }

    const document = event.document

    const fileContents = document.getText()
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
