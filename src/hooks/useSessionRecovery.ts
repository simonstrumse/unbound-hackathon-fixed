import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface SessionRecoveryData {
  sessionId: string;
  lastMessageId: string;
  timestamp: number;
  playerInput: string;
}

export const useSessionRecovery = (sessionId: string | undefined) => {
  const navigate = useNavigate();
  const lastSaveTime = useRef<number>(0);
  const saveInterval = useRef<NodeJS.Timeout>();

  // COMPLETELY DISABLED - No session recovery functionality
  // This prevents any notifications or recovery attempts

  const saveSessionState = (data: Partial<SessionRecoveryData>) => {
    // Disabled - no saving
    return;
  };

  const checkForRecovery = () => {
    // Disabled - no recovery checking
    return null;
  };

  const clearRecoveryData = () => {
    // Clear any existing data to prevent issues
    if (!sessionId) return;
    try {
      localStorage.removeItem(`session_recovery_${sessionId}`);
    } catch (error) {
      // Ignore errors
    }
  };

  const recoverSilently = () => {
    // Disabled - no silent recovery
    return null;
  };

  // Clear any existing recovery data on mount
  useEffect(() => {
    if (sessionId) {
      try {
        localStorage.removeItem(`session_recovery_${sessionId}`);
      } catch (error) {
        // Ignore errors
      }
    }
  }, [sessionId]);

  // No event listeners or intervals - completely disabled

  return {
    saveSessionState,
    checkForRecovery,
    recoverSilently,
    clearRecoveryData,
    lastSaveTime: lastSaveTime.current
  };
};