/**
 * Rate Limiter Service
 * 
 * This service prevents excessive calls to AI functions by enforcing a 24-hour cooldown
 * period for each candidate for various AI generation operations.
 */

type OperationType = 'policies' | 'commentary' | 'caricature' | 'qa' | 'whyVote' | 'regenerate-all';

interface RateLimitEntry {
  candidateId: number;
  operation: OperationType;
  timestamp: number;
}

class RateLimiterService {
  private static instance: RateLimiterService;
  private operations: RateLimitEntry[] = [];
  
  // 24 hours in milliseconds
  private readonly COOLDOWN_PERIOD = 24 * 60 * 60 * 1000;

  // Private constructor to enforce singleton pattern
  private constructor() {}

  /**
   * Get the singleton instance of the rate limiter
   */
  public static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  /**
   * Check if an operation for a candidate is allowed
   * @param candidateId The ID of the candidate
   * @param operation The type of operation
   * @param force Whether to force the operation regardless of cooldown
   * @returns Boolean indicating whether the operation is allowed
   */
  public isOperationAllowed(
    candidateId: number, 
    operation: OperationType,
    force: boolean = false
  ): boolean {
    // If force is true, always allow the operation
    if (force) {
      return true;
    }
    
    const now = Date.now();
    
    // Find the most recent operation of this type for this candidate
    const entry = this.operations.find(
      entry => entry.candidateId === candidateId && entry.operation === operation
    );
    
    // If no entry exists or the cooldown period has passed, allow the operation
    if (!entry || (now - entry.timestamp) > this.COOLDOWN_PERIOD) {
      return true;
    }
    
    // Operation is not allowed because the cooldown period has not passed
    return false;
  }

  /**
   * Record that an operation was performed
   * @param candidateId The ID of the candidate
   * @param operation The type of operation
   */
  public recordOperation(candidateId: number, operation: OperationType): void {
    // Remove any existing entry for this candidate and operation
    this.operations = this.operations.filter(
      entry => !(entry.candidateId === candidateId && entry.operation === operation)
    );
    
    // Add a new entry
    this.operations.push({
      candidateId,
      operation,
      timestamp: Date.now()
    });
  }

  /**
   * Get the time remaining before an operation can be performed again
   * @param candidateId The ID of the candidate
   * @param operation The type of operation
   * @returns Time remaining in milliseconds, or 0 if the operation is allowed
   */
  public getTimeRemaining(candidateId: number, operation: OperationType): number {
    const now = Date.now();
    
    // Find the most recent operation of this type for this candidate
    const entry = this.operations.find(
      entry => entry.candidateId === candidateId && entry.operation === operation
    );
    
    // If no entry exists or the cooldown period has passed, return 0
    if (!entry || (now - entry.timestamp) > this.COOLDOWN_PERIOD) {
      return 0;
    }
    
    // Calculate and return the time remaining
    return this.COOLDOWN_PERIOD - (now - entry.timestamp);
  }

  /**
   * Get the time remaining in a human-readable format
   * @param candidateId The ID of the candidate
   * @param operation The type of operation
   * @returns Human-readable time remaining, or null if the operation is allowed
   */
  public getTimeRemainingFormatted(candidateId: number, operation: OperationType): string | null {
    const timeRemaining = this.getTimeRemaining(candidateId, operation);
    
    if (timeRemaining <= 0) {
      return null;
    }
    
    // Convert milliseconds to hours and minutes
    const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
    
    return `${hours}h ${minutes}m`;
  }
}

export default RateLimiterService.getInstance();