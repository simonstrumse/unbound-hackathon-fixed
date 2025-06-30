// COMPLETELY DISABLED SILENT RECOVERY SYSTEM

interface SilentRecoveryOptions {
  sessionId: string | undefined;
  onRecover: (input: string) => void;
}

export const useSilentRecovery = ({ sessionId, onRecover }: SilentRecoveryOptions) => {
  // Completely disabled - no recovery functionality
  
  // Clear any existing recovery data to prevent issues
  if (sessionId) {
    try {
      localStorage.removeItem(`session_recovery_${sessionId}`);
    } catch (error) {
      // Ignore errors
    }
  }

  // No effects or recovery logic

  const saveInput = (input: string) => {
    // Disabled - no saving
    return;
  };

  return { saveInput };
};