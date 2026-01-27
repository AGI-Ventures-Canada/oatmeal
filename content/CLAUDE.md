# Documentation Content Guidelines

## CodeBlock Component Usage

When using the `CodeBlock` component in MDX files, follow these rules to ensure proper formatting:

### Use Regular Strings, NOT Template Literals

MDX normalizes whitespace in template literals, which strips indentation. Always use regular strings with explicit `\n` for newlines.

```mdx
// WRONG - template literal loses indentation
<CodeBlock language="typescript" code={`if (error) {
  console.log(error)
}`}>

// CORRECT - regular string preserves indentation
<CodeBlock language="typescript" code={"if (error) {\n  console.log(error)\n}"}>
```

### String Formatting Rules

1. Use double quotes for the outer string: `code={"..."}`
2. Use `\n` for newlines
3. Use `\"` to escape quotes inside the string
4. Preserve indentation with literal spaces after `\n`

### Example with Indentation

```mdx
<CodeBlock language="typescript" code={"interface User {\n  id: string\n  name: string\n}"}>
  <CodeBlockHeader>
    <CodeBlockFilename>types.ts</CodeBlockFilename>
    <CodeBlockActions>
      <CodeBlockCopyButton />
    </CodeBlockActions>
  </CodeBlockHeader>
</CodeBlock>
```

### Line Numbers

Line numbers are shown by default. To hide them for very short snippets (1-2 lines), use `showLineNumbers={false}`:

```mdx
<CodeBlock language="typescript" showLineNumbers={false} code={"..."}>
```

### Available Components

Import these from `@/components/ai-elements/code-block`:

- `CodeBlock` - Main wrapper, requires `code` and `language` props
- `CodeBlockHeader` - Header container
- `CodeBlockFilename` - Displays filename
- `CodeBlockActions` - Container for action buttons
- `CodeBlockCopyButton` - Copy to clipboard button
