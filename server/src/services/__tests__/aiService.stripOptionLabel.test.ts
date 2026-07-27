/**
 * Tests for stripOptionLabel — exported from aiService.ts by Mike's fix.
 *
 * DEPENDENCY: This file will not compile/pass until Mike:
 *   1. Adds `export function stripOptionLabel(text: string): string` to aiService.ts
 *   2. Installs jest + ts-jest + @types/jest (not yet in devDependencies)
 *
 * To run once both are in place:
 *   cd server && npm test
 */

import { stripOptionLabel } from '../aiService';

// ---------------------------------------------------------------------------
// STRIPS: leading label prefixes must be removed
// ---------------------------------------------------------------------------
describe('stripOptionLabel — strips leading label', () => {
  test('a) Text  →  Text', () => {
    expect(stripOptionLabel('a) Text')).toBe('Text');
  });

  test('A) Text  →  Text (uppercase)', () => {
    expect(stripOptionLabel('A) Text')).toBe('Text');
  });

  test('b. Text  →  Text (dot variant)', () => {
    expect(stripOptionLabel('b. Text')).toBe('Text');
  });

  test('(c) Text  →  Text (parenthesised letter)', () => {
    expect(stripOptionLabel('(c) Text')).toBe('Text');
  });

  test('A. Text  →  Text (uppercase dot)', () => {
    expect(stripOptionLabel('A. Text')).toBe('Text');
  });

  test('1) Text  →  Text (numeric paren)', () => {
    expect(stripOptionLabel('1) Text')).toBe('Text');
  });

  test('1. Text  →  Text (numeric dot)', () => {
    expect(stripOptionLabel('1. Text')).toBe('Text');
  });

  test('(2) Text  →  Text (parenthesised number)', () => {
    expect(stripOptionLabel('(2) Text')).toBe('Text');
  });

  test('12) Text  →  Text (two-digit numeric)', () => {
    expect(stripOptionLabel('12) Text')).toBe('Text');
  });

  test('a- Text  →  Text (dash separator)', () => {
    expect(stripOptionLabel('a- Text')).toBe('Text');
  });

  test('a: Text  →  Text (colon separator)', () => {
    expect(stripOptionLabel('a: Text')).toBe('Text');
  });

  test('B) mixed case content preserved', () => {
    expect(stripOptionLabel('B) El Código Civil')).toBe('El Código Civil');
  });

  test('extra whitespace after label is trimmed', () => {
    expect(stripOptionLabel('a)   Texto con espacio extra')).toBe('Texto con espacio extra');
  });

  test('C.  (double space after dot) → trimmed content', () => {
    expect(stripOptionLabel('C.  Respuesta correcta')).toBe('Respuesta correcta');
  });
});

// ---------------------------------------------------------------------------
// LEAVES UNCHANGED: no label, ambiguous prefixes, edge cases
// ---------------------------------------------------------------------------
describe('stripOptionLabel — leaves unchanged', () => {
  test('plain text with no label prefix is returned verbatim', () => {
    const input = 'Superación del proceso de resolución';
    expect(stripOptionLabel(input)).toBe(input);
  });

  test('"A pesar de todo" — bare letter + space is NOT a label', () => {
    // "A " alone (no punctuation after the letter) must NOT be stripped
    const input = 'A pesar de todo';
    expect(stripOptionLabel(input)).toBe(input);
  });

  test('"B importante" — bare letter + space NOT a label', () => {
    const input = 'B importante para la prueba';
    expect(stripOptionLabel(input)).toBe(input);
  });

  test('empty-guard: solo label "c)" returns original', () => {
    // Stripping "c)" would leave empty string; must return original
    expect(stripOptionLabel('c)')).toBe('c)');
  });

  test('empty-guard: solo label "1." returns original', () => {
    expect(stripOptionLabel('1.')).toBe('1.');
  });

  test('accented inner content is fully preserved after strip', () => {
    expect(stripOptionLabel('a) Ángulo de inclinación')).toBe('Ángulo de inclinación');
  });

  test('✓ mark inside content is preserved', () => {
    expect(stripOptionLabel('b) Respuesta ✓ correcta')).toBe('Respuesta ✓ correcta');
  });

  test('empty string returns empty string', () => {
    expect(stripOptionLabel('')).toBe('');
  });

  test('whitespace-only string returns whitespace-only string', () => {
    expect(stripOptionLabel('   ')).toBe('   ');
  });

  test('"3.5 millones de euros" — decimal number is NOT a numeric label', () => {
    // "3." followed by a digit must NOT be stripped (negative lookahead (?!\d) guard)
    const input = '3.5 millones de euros';
    expect(stripOptionLabel(input)).toBe(input);
  });
});
