// Token types for JSX DSL
export const TOKEN_TYPES = {
  // DSL symbols
  STATE: 'STATE',           // @
  EFFECT: 'EFFECT',         // $
  MEMO: 'MEMO',             // %
  PROP: 'PROP',             // :
  EVENT: 'EVENT',           // !

  // TypeScript support
  COLON_TYPE: 'COLON_TYPE', // :: for type annotations
  QUESTION: 'QUESTION',     // ? for optional types
  PIPE: 'PIPE',             // | for union types
  AMPERSAND: 'AMPERSAND',   // & for intersection types

  // Operators
  ASSIGN: 'ASSIGN',         // =
  PLUS: 'PLUS',             // +
  MINUS: 'MINUS',           // -
  MULTIPLY: 'MULTIPLY',     // *
  SLASH: 'SLASH',           // /
  INCREMENT: 'INCREMENT',   // ++
  DECREMENT: 'DECREMENT',   // --
  PLUS_ASSIGN: 'PLUS_ASSIGN', // +=
  ARROW: 'ARROW',           // =>

  // Punctuation
  DOT: 'DOT',               // .
  COMMA: 'COMMA',           // ,
  LPAREN: 'LPAREN',         // (
  RPAREN: 'RPAREN',         // )
  LBRACE: 'LBRACE',         // {
  RBRACE: 'RBRACE',         // }
  LBRACKET: 'LBRACKET',     // [
  RBRACKET: 'RBRACKET',     // ]
  LT: 'LT',                 // <
  GT: 'GT',                 // >

  // Literals
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  IDENTIFIER: 'IDENTIFIER',

  // Control
  NEWLINE: 'NEWLINE',
  EOF: 'EOF',
};

export function tokenize(input) {
  const tokens = [];
  let position = 0;
  let line = 1;
  let column = 1;

  const peek = (offset = 0) => input[position + offset] || '';
  const advance = () => {
    const char = input[position++];
    if (char === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    return char;
  };

  const addToken = (type, value = null) => {
    tokens.push({ type, value, line, column: column - (value?.length || 1) });
  };

  while (position < input.length) {
    const char = peek();

    // Skip whitespace (but preserve newlines for statement separation)
    if (char === ' ' || char === '\t') {
      advance();
      continue;
    }

    if (char === '\n') {
      addToken(TOKEN_TYPES.NEWLINE);
      advance();
      continue;
    }

    // DSL symbols
    if (char === '@') {
      advance();
      addToken(TOKEN_TYPES.STATE);
      continue;
    }

    if (char === '$') {
      advance();
      addToken(TOKEN_TYPES.EFFECT);
      continue;
    }

    if (char === '%') {
      advance();
      addToken(TOKEN_TYPES.MEMO);
      continue;
    }

    // Type annotation :: or prop :
    if (char === ':') {
      advance();
      if (peek() === ':') {
        advance();
        addToken(TOKEN_TYPES.COLON_TYPE);
      } else {
        addToken(TOKEN_TYPES.PROP);
      }
      continue;
    }

    if (char === '!') {
      advance();
      addToken(TOKEN_TYPES.EVENT);
      continue;
    }

    // TypeScript operators
    if (char === '?') {
      advance();
      addToken(TOKEN_TYPES.QUESTION);
      continue;
    }

    if (char === '|') {
      advance();
      addToken(TOKEN_TYPES.PIPE);
      continue;
    }

    if (char === '&') {
      advance();
      addToken(TOKEN_TYPES.AMPERSAND);
      continue;
    }

    // Operators
    if (char === '+') {
      advance();
      if (peek() === '+') {
        advance();
        addToken(TOKEN_TYPES.INCREMENT);
      } else if (peek() === '=') {
        advance();
        addToken(TOKEN_TYPES.PLUS_ASSIGN);
      } else {
        addToken(TOKEN_TYPES.PLUS);
      }
      continue;
    }

    if (char === '-') {
      advance();
      if (peek() === '-') {
        advance();
        addToken(TOKEN_TYPES.DECREMENT);
      } else {
        addToken(TOKEN_TYPES.MINUS);
      }
      continue;
    }

    if (char === '=' && peek() === '>') {
      advance();
      advance();
      addToken(TOKEN_TYPES.ARROW);
      continue;
    }

    if (char === '=') {
      advance();
      addToken(TOKEN_TYPES.ASSIGN);
      continue;
    }

    if (char === '*') {
      advance();
      addToken(TOKEN_TYPES.MULTIPLY);
      continue;
    }

    if (char === '/') {
      advance();
      addToken(TOKEN_TYPES.SLASH);
      continue;
    }

    // Punctuation
    if (char === '.') {
      advance();
      addToken(TOKEN_TYPES.DOT);
      continue;
    }

    if (char === ',') {
      advance();
      addToken(TOKEN_TYPES.COMMA);
      continue;
    }

    if (char === '(') {
      advance();
      addToken(TOKEN_TYPES.LPAREN);
      continue;
    }

    if (char === ')') {
      advance();
      addToken(TOKEN_TYPES.RPAREN);
      continue;
    }

    if (char === '{') {
      advance();
      addToken(TOKEN_TYPES.LBRACE);
      continue;
    }

    if (char === '}') {
      advance();
      addToken(TOKEN_TYPES.RBRACE);
      continue;
    }

    if (char === '[') {
      advance();
      addToken(TOKEN_TYPES.LBRACKET);
      continue;
    }

    if (char === ']') {
      advance();
      addToken(TOKEN_TYPES.RBRACKET);
      continue;
    }

    if (char === '<') {
      advance();
      addToken(TOKEN_TYPES.LT);
      continue;
    }

    if (char === '>') {
      advance();
      addToken(TOKEN_TYPES.GT);
      continue;
    }

    // Strings
    if (char === '"' || char === "'") {
      const quote = char;
      advance();
      let value = '';
      while (peek() && peek() !== quote) {
        if (peek() === '\\') {
          advance();
        }
        value += advance();
      }
      advance(); // closing quote
      addToken(TOKEN_TYPES.STRING, value);
      continue;
    }

    // Numbers
    if (/\d/.test(char)) {
      let value = '';
      while (/[\d.]/.test(peek())) {
        value += advance();
      }
      addToken(TOKEN_TYPES.NUMBER, parseFloat(value));
      continue;
    }

    // Identifiers (and special keywords)
    if (/[a-zA-Z_]/.test(char)) {
      let value = char;
      advance();
      while (/[a-zA-Z0-9_]/.test(peek())) {
        value += advance();
      }
      addToken(TOKEN_TYPES.IDENTIFIER, value);
      continue;
    }

    throw new Error(`Unexpected character: ${char} at line ${line}, column ${column}`);
  }

  addToken(TOKEN_TYPES.EOF);
  return tokens;
}