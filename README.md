# Quick Notes

## Install

Install dependencies and compile the code.

```
npm install
npm run compile
```

Install vsce if not installed yet.

```
npm install -g @vscode/vsce
```

if you installed vsce before, you might need to execute `npm uninstall -g vsce`.

## Packaging

```
vsce package
```

## Release

GitHub action workflow builds a package and puts it in Releases when a new tag is added.

```
git tag -a v0.0.x -m 'v0.0.x'
git push --tags
```

## How to use

### Note list on the sidebar

Notes are displayed in reverse chronological order by last modified time on the sidebar of Visual Studio Code, with the newest listed first. Each note should use Markdown format. If the first line (excluding the frontmatter) is a header, the header is displayed, followed by the content.

"New Note" is a header of a note and "Hello, World!!" is a content of the note.

![Quick Note - sidebar](https://github.com/user-attachments/assets/43f81e34-830f-495f-b8fd-a2c19701ed75)

### Create a new note

You can create a new note by pressing a button or invoking "Quick Note: Create a new note" command.
Each note can include metadata as [frontmatter](https://gohugo.io/content-management/front-matter/) at the top of the note. Quick Note automatically updates the "updated" field when a note is saved. This behavior can be modified in the settings.

![Quick Note - Create A New Note](https://github.com/user-attachments/assets/6a604382-484d-4f06-a3f0-1512981d6016)

### Open a note from the note list

You can open a note by clicking on a line in the note list on the sidebar.

![Quick Note - Open A Note](https://github.com/user-attachments/assets/075ffa9c-0ed8-4bb9-bd7b-96c70b96b263)

### Refresh the note list

You can refresh the note list manually, as it does not update automatically when a note is saved.

![Quick Note - Refresh The List](https://github.com/user-attachments/assets/3756e3be-cd06-4b05-b888-8f08ada9a53d)

### Filter the note list

You can filter the note list, and clearing the filter will display all notes on the sidebar.

![Quick Note - Filter The List](https://github.com/user-attachments/assets/6a2ec96f-238c-416d-ae73-4bb46e8f3d01)

### Settings

- Base Directory. Default: "~/Documents/QuickNotes"
- Template file for a new note. Default: "~/Documents/QuickNotes/template.md"

If the template file doesn't exist, the following template is used.

```
---
created: {{date:YYYY-MM-DDTHH:mm:ssZ}}
updated: {{date:YYYY-MM-DDTHH:mm:ssZ}}
tags:
---
# {{date:YYYY-MM-DD-HHmm}}

[{{date:YYYY-MM-DD HH:mm}}]
```

- Path pattern for a new note. Quick Note uses moment.js to format. Default: 'YYYY/MM/YYYY-MM-DD-HHmmss[.md]'
- A flag to update last modified property on save. Default: false.
- Property shows last modified date and time. This property will be updated when the file is saved. Default: "updated"
- Date time format of last modified property. Default: "YYYY-MM-DDTHH:mm:ssZ"

# Known issues

## Workaround to use ripgrep v14
Quick notes depends on `@vscode/ripgrep` to search notes and filter them. Currently ripgrep v13 used but this version has a bug in a sorting logic (https://github.com/BurntSushi/ripgrep/issues/2243) and it's fixed in v14. Upgrading ripgrep to v14 is in a backlog (https://github.com/microsoft/ripgrep-prebuilt/issues/38). Before it's shipped, you can replace ripgrep binary manually as a workaround.

# Appendix

- <a href="https://www.flaticon.com/free-icons/document" title="document icons">Document icons created by Freepik - Flaticon</a>
