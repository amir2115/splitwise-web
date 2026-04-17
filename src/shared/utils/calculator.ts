import { digitsOnly, normalizeDigits } from '@/shared/utils/format'

type Token = number | '(' | ')' | '+' | '-' | '*' | '/'

const PRECEDENCE: Record<'+' | '-' | '*' | '/', number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
}

export function evaluateCalculatorExpression(input: string) {
  const tokens = tokenizeExpression(input)
  if (!tokens) return null
  const rpn = toReversePolish(tokens)
  if (!rpn) return null
  const result = evaluateReversePolish(rpn)
  if (result === null || !Number.isFinite(result)) return null
  const rounded = Math.round(result)
  return rounded < 0 ? null : rounded
}

export function formatCalculatorDisplayValue(input: string) {
  const normalized = normalizeExpression(input)
  if (!normalized) return '0'
  if (/^\d+$/.test(normalized)) return new Intl.NumberFormat('en-US').format(Number.parseInt(normalized, 10))
  const result = evaluateCalculatorExpression(normalized)
  return result === null ? null : new Intl.NumberFormat('en-US').format(result)
}

export function formatCalculatorExpressionInput(input: string) {
  const normalized = normalizeExpression(input)
  if (!normalized) return ''
  return normalized.replace(/\d+/g, (chunk) => new Intl.NumberFormat('en-US').format(Number.parseInt(chunk, 10)))
}

export function normalizeExpression(input: string) {
  return normalizeDigits(input).replace(/[^0-9+\-*/()]/g, '')
}

function tokenizeExpression(input: string): Token[] | null {
  const normalized = normalizeExpression(input)
  if (!normalized) return []
  const tokens: Token[] = []
  let currentNumber = ''

  for (const char of normalized) {
    if (/\d/.test(char)) {
      currentNumber += char
      continue
    }
    if (currentNumber) {
      tokens.push(Number.parseInt(currentNumber, 10))
      currentNumber = ''
    }
    if (!['+', '-', '*', '/', '(', ')'].includes(char)) return null
    tokens.push(char as Token)
  }

  if (currentNumber) tokens.push(Number.parseInt(currentNumber, 10))
  return tokens
}

function toReversePolish(tokens: Token[]) {
  const output: Token[] = []
  const stack: Token[] = []
  let expectOperand = true

  for (const token of tokens) {
    if (typeof token === 'number') {
      output.push(token)
      expectOperand = false
      continue
    }

    if (token === '(') {
      stack.push(token)
      expectOperand = true
      continue
    }

    if (token === ')') {
      while (stack.length > 0 && stack[stack.length - 1] !== '(') output.push(stack.pop() as Token)
      if (stack.pop() !== '(') return null
      expectOperand = false
      continue
    }

    if (expectOperand) return null
    while (
      stack.length > 0 &&
      stack[stack.length - 1] !== '(' &&
      PRECEDENCE[stack[stack.length - 1] as '+' | '-' | '*' | '/'] >= PRECEDENCE[token]
    ) {
      output.push(stack.pop() as Token)
    }
    stack.push(token)
    expectOperand = true
  }

  if (expectOperand && tokens.length > 0) return null
  while (stack.length > 0) {
    const token = stack.pop() as Token
    if (token === '(') return null
    output.push(token)
  }
  return output
}

function evaluateReversePolish(tokens: Token[]) {
  const stack: number[] = []
  for (const token of tokens) {
    if (typeof token === 'number') {
      stack.push(token)
      continue
    }
    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) return null
    switch (token) {
      case '+':
        stack.push(left + right)
        break
      case '-':
        stack.push(left - right)
        break
      case '*':
        stack.push(left * right)
        break
      case '/':
        if (right === 0) return null
        stack.push(left / right)
        break
    }
  }
  return stack.length === 1 ? stack[0] : null
}
