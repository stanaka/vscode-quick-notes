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

    // Count unchecked and checked checkboxes in the file contents
    const uncheckedCount = (fileContents.match(/\[ \]/g) || []).length
    const checkedCount = (fileContents.match(/\[x\]/g) || []).length
    const todoCount = `${checkedCount}/${uncheckedCount + checkedCount}`

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
    const todoCountProperty = vscode.workspace
        .getConfiguration('quickNotes')
        .get('todoCountProperty', 'todoCount')

    const re = new RegExp('^' + modifiedProperty + ':.+$', 'gm')
    let updatedMatter = properties.matter.replace(
        re,
        modifiedProperty + ': ' + moment().format(dateFormat)
    )

    // Update todoCount property in front matter only if there are checkboxes
    const totalCount = uncheckedCount + checkedCount
    if (totalCount > 0) {
        const todoCountRe = new RegExp('^' + todoCountProperty + ':.+$', 'gm')
        if (todoCountRe.test(updatedMatter)) {
            // Replace existing todoCount property
            updatedMatter = updatedMatter.replace(
                todoCountRe,
                todoCountProperty + ': ' + todoCount
            )
        } else {
            // Add todoCount property if it doesn't exist
            if (!updatedMatter.endsWith('\n')) {
                updatedMatter += '\n'
            }
            updatedMatter += todoCountProperty + ': ' + todoCount
        }
    }

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
