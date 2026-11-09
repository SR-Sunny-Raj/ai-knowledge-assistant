export const DELETED_DOCUMENT_IDS_STORAGE_KEY =
  'knowledge-ai:deleted-document-ids';
export const DOCUMENT_DELETED_EVENT = 'knowledge-ai:document-deleted';

const MAX_REMEMBERED_DOCUMENTS = 100;

export function getDeletedDocumentIds() {
  try {
    const storedValue = window.localStorage.getItem(
      DELETED_DOCUMENT_IDS_STORAGE_KEY,
    );
    const documentIds: unknown = storedValue ? JSON.parse(storedValue) : [];

    return new Set(
      Array.isArray(documentIds)
        ? documentIds.filter(
            (documentId): documentId is string =>
              typeof documentId === 'string',
          )
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

export function rememberDeletedDocument(documentId: string) {
  const documentIds = getDeletedDocumentIds();

  documentIds.delete(documentId);
  documentIds.add(documentId);

  try {
    window.localStorage.setItem(
      DELETED_DOCUMENT_IDS_STORAGE_KEY,
      JSON.stringify([...documentIds].slice(-MAX_REMEMBERED_DOCUMENTS)),
    );
  } catch {
    // The in-memory event still updates the current tab when storage is blocked.
  }

  window.dispatchEvent(
    new CustomEvent<string>(DOCUMENT_DELETED_EVENT, {
      detail: documentId,
    }),
  );
}
