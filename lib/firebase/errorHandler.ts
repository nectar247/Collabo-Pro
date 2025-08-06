/**
 * Firebase error handling utilities
 */

export interface FirebaseErrorHandler {
  retryCount: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Enhanced Firebase operation wrapper with retry logic and error handling
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<FirebaseErrorHandler> = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), 10000)
        )
      ]);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (isNonRetryableError(error as Error)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error(`Firebase operation failed after ${maxRetries + 1} attempts:`, error);
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError!;
}

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error: Error): boolean {
  const nonRetryableErrors = [
    'permission-denied',
    'unauthenticated', 
    'invalid-argument',
    'not-found',
    'already-exists'
  ];
  
  return nonRetryableErrors.some(code => error.message.includes(code));
}

/**
 * Handle Firebase connection errors gracefully
 */
export function handleFirebaseError(error: any): string {
  console.error('Firebase error:', error);
  
  if (error.code) {
    switch (error.code) {
      case 'unavailable':
        return 'Service temporarily unavailable. Please try again.';
      case 'timeout':
      case 'deadline-exceeded':
        return 'Connection timeout. Please check your internet connection.';
      case 'permission-denied':
        return 'Access denied. Please check your permissions.';
      case 'unauthenticated':
        return 'Please sign in to continue.';
      case 'not-found':
        return 'Requested data not found.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  
  if (error.message?.includes('timeout')) {
    return 'Connection timeout. Please check your internet connection.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}