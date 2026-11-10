const EXPLICIT_WHOLE_DOCUMENT_PATTERN =
  /\b(?:whole|entire|full|complete)\s+(?:(?:uploaded|attached|medical|lab)\s+){0,2}(?:document|pdf|file|report)\b/i;
const ALL_PAGES_PATTERN =
  /\b(?:all|every)\s+(?:of\s+the\s+)?(?:pages?|sections?)\b|\bpage[ -]by[ -]page\b/i;
const SUMMARY_PATTERN = /\b(?:summari[sz]e|summary|overview|review)\b/i;
const SINGULAR_DOCUMENT_PATTERN =
  /\b(?:this|the|uploaded|attached|my)\s+(?:document|pdf|file|report)\b/i;

export function requestsWholeDocument(question: string) {
  return (
    EXPLICIT_WHOLE_DOCUMENT_PATTERN.test(question) ||
    ALL_PAGES_PATTERN.test(question) ||
    (SUMMARY_PATTERN.test(question) && SINGULAR_DOCUMENT_PATTERN.test(question))
  );
}