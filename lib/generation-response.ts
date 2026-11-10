export function requireCompleteAnswer(
  text: string | undefined,
  finishReason: string | undefined,
) {
  if (finishReason === 'MAX_TOKENS') {
    throw new Error(
      'Gemini reached its output limit before completing the answer.',
    );
  }

  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Gemini stopped generation unexpectedly: ${finishReason}.`);
  }

  const answer = text?.trim();

  if (!answer) {
    throw new Error('Gemini returned an empty answer.');
  }

  return answer;
}
