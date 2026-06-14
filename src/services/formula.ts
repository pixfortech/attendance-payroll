/* ============================================================
   Safe payroll formula evaluator.

   Formulas are built from clickable chips as an ordered token list. They are
   evaluated WITHOUT eval()/Function() — a tokeniser validates every token
   against the approved variable scope, numeric literals and a fixed operator
   set, then a shunting-yard pass converts to RPN which is evaluated on a stack.

   Approved operators: + − × ÷ %  ( )   (display glyphs normalised below).
   ============================================================ */

/** Operator display glyphs shown as clickable buttons in the builder. */
export const DISPLAY_OPERATORS = ['+', '−', '×', '÷', '%', '(', ')'] as const;

const BINARY_PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,
};

/** Map display glyphs to canonical operators. */
function normalizeToken(token: string): string {
  switch (token) {
    case '×':
      return '*';
    case '÷':
      return '/';
    case '−': // U+2212 minus sign
      return '-';
    default:
      return token.trim();
  }
}

function isOperator(token: string): boolean {
  return token in BINARY_PRECEDENCE;
}

function isNumberLiteral(token: string): boolean {
  return /^\d+(\.\d+)?$/.test(token);
}

export type EvalResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/**
 * Evaluate a token list against a scope of approved variables.
 * Returns a typed result; never throws on bad input.
 */
export function evaluateFormula(tokens: string[], scope: Record<string, number>): EvalResult {
  if (tokens.length === 0) return { ok: false, error: 'Empty formula' };

  // 1. Normalise + validate every token (the only place untrusted strings enter).
  const normalised: string[] = [];
  for (const raw of tokens) {
    const t = normalizeToken(raw);
    if (isOperator(t) || t === '(' || t === ')') {
      normalised.push(t);
    } else if (isNumberLiteral(t)) {
      normalised.push(t);
    } else if (Object.prototype.hasOwnProperty.call(scope, t)) {
      normalised.push(t);
    } else {
      return { ok: false, error: `Unknown token "${raw}"` };
    }
  }

  // 2. Shunting-yard → Reverse Polish Notation.
  const output: string[] = [];
  const opStack: string[] = [];
  for (const t of normalised) {
    if (isOperator(t)) {
      while (
        opStack.length > 0 &&
        isOperator(opStack[opStack.length - 1]) &&
        BINARY_PRECEDENCE[opStack[opStack.length - 1]] >= BINARY_PRECEDENCE[t]
      ) {
        output.push(opStack.pop() as string);
      }
      opStack.push(t);
    } else if (t === '(') {
      opStack.push(t);
    } else if (t === ')') {
      while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
        output.push(opStack.pop() as string);
      }
      if (opStack.length === 0) return { ok: false, error: 'Mismatched parentheses' };
      opStack.pop(); // discard '('
    } else {
      output.push(t); // operand
    }
  }
  while (opStack.length > 0) {
    const op = opStack.pop() as string;
    if (op === '(' || op === ')') return { ok: false, error: 'Mismatched parentheses' };
    output.push(op);
  }

  // 3. Evaluate RPN.
  const stack: number[] = [];
  for (const t of output) {
    if (isOperator(t)) {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return { ok: false, error: 'Incomplete formula' };
      let r: number;
      switch (t) {
        case '+':
          r = a + b;
          break;
        case '-':
          r = a - b;
          break;
        case '*':
          r = a * b;
          break;
        case '/':
          if (b === 0) return { ok: false, error: 'Division by zero' };
          r = a / b;
          break;
        case '%':
          if (b === 0) return { ok: false, error: 'Division by zero' };
          r = a % b;
          break;
        default:
          return { ok: false, error: `Bad operator "${t}"` };
      }
      stack.push(r);
    } else {
      const value = Object.prototype.hasOwnProperty.call(scope, t)
        ? scope[t]
        : Number.parseFloat(t);
      stack.push(value);
    }
  }

  if (stack.length !== 1) return { ok: false, error: 'Incomplete formula' };
  const value = stack[0];
  if (!Number.isFinite(value)) return { ok: false, error: 'Result is not a finite number' };
  return { ok: true, value };
}

/** Pretty-print a token list for display (keeps original glyphs). */
export function formulaToString(tokens: string[]): string {
  return tokens.length ? tokens.join(' ') : '∅';
}
