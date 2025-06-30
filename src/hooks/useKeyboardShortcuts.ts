import { useEffect } from 'react';

interface KeyboardShortcuts {
  onSendMessage?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Send message with Ctrl/Cmd + Enter
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        shortcuts.onSendMessage?.();
        return;
      }

      // Close modals with Escape
      if (event.key === 'Escape') {
        event.preventDefault();
        shortcuts.onEscape?.();
        return;
      }

      // Arrow key navigation (only when not in input fields)
      const activeElement = document.activeElement;
      const isInInput = activeElement?.tagName === 'INPUT' || 
                       activeElement?.tagName === 'TEXTAREA' || 
                       activeElement?.contentEditable === 'true';

      if (!isInInput) {
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            shortcuts.onArrowUp?.();
            break;
          case 'ArrowDown':
            event.preventDefault();
            shortcuts.onArrowDown?.();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            shortcuts.onArrowLeft?.();
            break;
          case 'ArrowRight':
            event.preventDefault();
            shortcuts.onArrowRight?.();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};