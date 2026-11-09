'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DELETED_DOCUMENT_IDS_STORAGE_KEY,
  DOCUMENT_DELETED_EVENT,
  getDeletedDocumentIds,
} from '@/lib/deleted-documents';
import type { ChatMessage, ChatResponse } from '../../types/chat';

type UseChatOptions = Readonly<{
  initialConversationId?: string | null;
  initialMessages?: ChatMessage[];
}>;

const REQUEST_TIMEOUT_MS = 45_000;

export function useChat({
  initialConversationId = null,
  initialMessages = [],
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    function removeDeletedDocumentSources(deletedDocumentIds: Set<string>) {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.sources
            ? {
                ...message,
                sources: message.sources.filter(
                  (source) => !deletedDocumentIds.has(source.documentId),
                ),
              }
            : message,
        ),
      );
    }

    function handleDocumentDeleted(event: Event) {
      removeDeletedDocumentSources(
        new Set([(event as CustomEvent<string>).detail]),
      );
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === DELETED_DOCUMENT_IDS_STORAGE_KEY) {
        removeDeletedDocumentSources(getDeletedDocumentIds());
      }
    }

    removeDeletedDocumentSources(getDeletedDocumentIds());
    window.addEventListener(DOCUMENT_DELETED_EVENT, handleDocumentDeleted);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(DOCUMENT_DELETED_EVENT, handleDocumentDeleted);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  async function sendMessage() {
    const content = input.trim();

    if (!content || isSubmitting) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);

    setInput('');
    setError(null);
    setIsSubmitting(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          ...(conversationId ? { conversationId } : {}),
        }),
        signal: controller.signal,
      });

      const result = (await response.json()) as ChatResponse;

      if (!response.ok || !result.success) {
        const message = result.success
          ? 'Unable to answer the question.'
          : result.message;

        throw new Error(message);
      }

      if (!conversationId) {
        window.history.replaceState(null, '', `/chat/${result.conversationId}`);
      }

      setConversationId(result.conversationId);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
    } catch (requestError) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== userMessage.id),
      );

      setInput(content);

      setError(
        requestError instanceof DOMException &&
          requestError.name === 'AbortError'
          ? 'The request took too long. Please try again.'
          : requestError instanceof Error
            ? requestError.message
            : 'Unable to send the message.',
      );
    } finally {
      window.clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsSubmitting(false);
    }
  }

  function startNewChat() {
    abortControllerRef.current?.abort();
    window.history.pushState(null, '', '/chat');
    setConversationId(null);
    setMessages([]);
    setInput('');
    setError(null);
    setIsSubmitting(false);
  }

  return {
    messages,
    input,
    error,
    isSubmitting,
    setInput,
    sendMessage,
    startNewChat,
  };
}
