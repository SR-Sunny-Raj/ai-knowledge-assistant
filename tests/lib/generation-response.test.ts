import { describe, expect, it } from 'vitest';
import { requireCompleteAnswer } from '@/lib/generation-response';

describe('requireCompleteAnswer', () => {
  it('accepts and trims a naturally completed answer', () => {
    expect(requireCompleteAnswer('  Complete answer.  ', 'STOP')).toBe(
      'Complete answer.',
    );
  });

  it('rejects an answer that reached the output token limit', () => {
    expect(() => requireCompleteAnswer('Partial answer', 'MAX_TOKENS')).toThrow(
      'output limit',
    );
  });

  it('rejects other abnormal finish reasons', () => {
    expect(() => requireCompleteAnswer('Blocked answer', 'SAFETY')).toThrow(
      'SAFETY',
    );
  });

  it('rejects an empty answer', () => {
    expect(() => requireCompleteAnswer('   ', 'STOP')).toThrow('empty answer');
  });
});