import { describe, expect, it } from 'vitest';
import { requestsWholeDocument } from '@/lib/retrieval-scope';

describe('requestsWholeDocument', () => {
  it.each([
    'Analyze the entire lab report',
    'Read the full uploaded PDF',
    'Summarize all pages',
    'Give me a page-by-page review',
    'Give me a summary of the report',
  ])('recognizes broad document requests: %s', (question) => {
    expect(requestsWholeDocument(question)).toBe(true);
  });

  it.each([
    'What is the hemoglobin value?',
    'Explain the result on page 2',
    'Which report mentions glucose?',
    'Find the complete blood count value',
  ])('keeps focused questions on vector retrieval: %s', (question) => {
    expect(requestsWholeDocument(question)).toBe(false);
  });
});