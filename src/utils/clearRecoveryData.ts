// Utility to completely clear all session recovery data and prevent notifications

export const clearAllRecoveryData = () => {
  try {
    // Get all localStorage keys
    const keys = Object.keys(localStorage);
    
    // Remove all session recovery data
    keys.forEach(key => {
      if (key.startsWith('session_recovery_')) {
        localStorage.removeItem(key);
      }
      if (key.startsWith('recovery_disabled_')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('All session recovery data cleared');
  } catch (error) {
    console.error('Failed to clear recovery data:', error);
  }
};

// Function to disable recovery for a specific session
export const disableRecoveryForSession = (sessionId: string) => {
  if (!sessionId) return;
  
  try {
    localStorage.removeItem(`session_recovery_${sessionId}`);
  } catch (error) {
    console.error('Failed to disable recovery for session:', error);
  }
};

// Check if recovery is disabled for a session
export const isRecoveryDisabled = (sessionId: string): boolean => {
  // Always return true - recovery is completely disabled
  return true;
};

// Clear all recovery data immediately when this module is imported
clearAllRecoveryData();