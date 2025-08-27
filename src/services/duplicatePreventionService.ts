// Service to prevent duplicate operations
export class DuplicatePreventionService {
  private static operationTracker = new Map<string, number>();
  
  // Check if operation was recently performed
  static isDuplicateOperation(userId: string, operationType: 'voice_generation' | 'history_save', text?: string): boolean {
    const key = `${userId}_${operationType}_${text ? text.substring(0, 50) : ''}`;
    const now = Date.now();
    const lastOperation = this.operationTracker.get(key);
    
    // If operation was performed in last 5 seconds, it's a duplicate
    if (lastOperation && (now - lastOperation) < 5000) {
      console.log(`Duplicate ${operationType} operation prevented for user ${userId}`);
      return true;
    }
    
    // Record this operation
    this.operationTracker.set(key, now);
    
    // Clean up old entries to prevent memory leaks
    this.cleanupOldEntries();
    
    return false;
  }
  
  // Clean up entries older than 10 seconds
  private static cleanupOldEntries(): void {
    const now = Date.now();
    const cutoff = now - 10000; // 10 seconds
    
    for (const [key, timestamp] of this.operationTracker.entries()) {
      if (timestamp < cutoff) {
        this.operationTracker.delete(key);
      }
    }
  }
  
  // Force clear a specific operation (useful for retries)
  static clearOperation(userId: string, operationType: 'voice_generation' | 'history_save', text?: string): void {
    const key = `${userId}_${operationType}_${text ? text.substring(0, 50) : ''}`;
    this.operationTracker.delete(key);
  }
  
  // Clear all operations for a user (useful on logout)
  static clearUserOperations(userId: string): void {
    for (const key of this.operationTracker.keys()) {
      if (key.startsWith(userId)) {
        this.operationTracker.delete(key);
      }
    }
  }
}