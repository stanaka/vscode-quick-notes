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
