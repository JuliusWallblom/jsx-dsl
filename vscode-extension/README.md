# JSX DSL - VSCode Extension

Provides syntax highlighting, snippets, and IntelliSense for JSX DSL (.jsx.dsl) files.

## Features

### Syntax Highlighting
- Full syntax highlighting for JSX DSL files
- Colored symbols for state (`@`), props (`:`), effects (`$`), memos (`%`), and events (`!`)
- JSX/HTML tag highlighting
- TypeScript type annotations support

### Code Snippets
- `@state` - Create a state variable
- `@state::` - Create a typed state variable
- `:prop` - Declare a prop
- `:prop::` - Declare a typed prop
- `$effect` - Create an effect
- `%memo` - Create a memoized value
- `!event` - Create an event handler
- `btn` - Button element
- `input` - Input element
- `each` - Each loop
- `component` - Complete component template
- `todolist` - Todo list template

### Auto-completion
- Automatic bracket closing
- Tag auto-closing
- Quote auto-pairing

### Commands
- `Compile JSX DSL to React` (Ctrl+Shift+R / Cmd+Shift+R) - Compiles current file

## Installation

### From Source
1. Copy the `vscode-extension` folder to your VS Code extensions directory:
   - Windows: `%USERPROFILE%\.vscode\extensions`
   - macOS/Linux: `~/.vscode/extensions`
2. Reload VS Code

### From VSIX (if packaged)
1. Open VS Code
2. Go to Extensions view
3. Click the "..." menu
4. Select "Install from VSIX..."
5. Choose the .vsix file

## Usage

1. Create a new file with `.jsx.dsl` extension
2. Start typing - the extension will provide syntax highlighting automatically
3. Use snippets for faster development
4. Press Ctrl+Shift+R (Cmd+Shift+R on Mac) to compile to React

## Examples

### Simple Counter
```jsx-dsl
:label
@count = 0
!click = count++
<btn @click=click>{label}: {count}</btn>
```

### TypeScript Support
```jsx-dsl
:name::string
@value::number = 42
%doubled::number = value * 2
<div>{name}: {doubled}</div>
```

## Development

To modify the extension:
1. Edit the grammar in `syntaxes/jsx-dsl.tmLanguage.json`
2. Add new snippets in `snippets/jsx-dsl.json`
3. Reload VS Code to test changes

## License

MIT