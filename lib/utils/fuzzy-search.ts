/**
 * Fuzzy Search Utility
 * Provides fuzzy string matching capabilities for search with typo tolerance
 */

/**
 * Calculate Levenshtein distance between two strings
 * Measures the minimum number of single-character edits needed to change one word into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity percentage between two strings (0-100)
 * 100 = exact match, 0 = completely different
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  if (str1.length === 0 || str2.length === 0) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.max(0, Math.min(100, similarity));
}

/**
 * Normalize text for comparison
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove special characters and extra spaces
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Check if query fuzzy matches target with given threshold
 * @param query - The search query
 * @param target - The text to match against
 * @param threshold - Minimum similarity percentage (0-100) to consider a match
 * @returns true if similarity >= threshold
 */
export function fuzzyMatch(query: string, target: string, threshold: number = 80): boolean {
  const normalizedQuery = normalizeText(query);
  const normalizedTarget = normalizeText(target);

  // Exact match after normalization
  if (normalizedTarget.includes(normalizedQuery)) {
    return true;
  }

  // Calculate similarity
  const similarity = calculateSimilarity(normalizedQuery, normalizedTarget);
  return similarity >= threshold;
}

/**
 * Find fuzzy matches for query in target text, checking both full string and individual words
 * Returns the best match score (0-100)
 */
export function findBestFuzzyMatch(query: string, target: string): number {
  const normalizedQuery = normalizeText(query);
  const normalizedTarget = normalizeText(target);

  // Check exact substring match first
  if (normalizedTarget.includes(normalizedQuery)) {
    return 100;
  }

  // Get full string similarity
  let bestScore = calculateSimilarity(normalizedQuery, normalizedTarget);

  // Also check against individual words in target
  const targetWords = normalizedTarget.split(' ');
  const queryWords = normalizedQuery.split(' ');

  // Check if all query words have good matches in target words
  for (const queryWord of queryWords) {
    if (queryWord.length === 0) continue;

    let bestWordScore = 0;
    for (const targetWord of targetWords) {
      if (targetWord.length === 0) continue;

      // Exact word match
      if (targetWord.includes(queryWord)) {
        bestWordScore = 100;
        break;
      }

      // Fuzzy word match
      const wordSimilarity = calculateSimilarity(queryWord, targetWord);
      bestWordScore = Math.max(bestWordScore, wordSimilarity);
    }

    // Average the word matches
    bestScore = Math.max(bestScore, bestWordScore);
  }

  return bestScore;
}

/**
 * Check if query matches target using multiple strategies
 * Returns object with match result and score
 */
export interface FuzzyMatchResult {
  isMatch: boolean;
  score: number;
  matchType: 'exact' | 'contains' | 'fuzzy' | 'none';
}

export function fuzzyMatchWithScore(
  query: string,
  target: string,
  threshold: number = 70
): FuzzyMatchResult {
  const normalizedQuery = normalizeText(query);
  const normalizedTarget = normalizeText(target);

  // Exact match
  if (normalizedQuery === normalizedTarget) {
    return { isMatch: true, score: 100, matchType: 'exact' };
  }

  // Contains match
  if (normalizedTarget.includes(normalizedQuery)) {
    return { isMatch: true, score: 95, matchType: 'contains' };
  }

  // Fuzzy match
  const score = findBestFuzzyMatch(query, target);
  const isMatch = score >= threshold;

  return {
    isMatch,
    score,
    matchType: isMatch ? 'fuzzy' : 'none',
  };
}

/**
 * Highlight matching portions of text (for display purposes)
 * Returns the target text with matched portions wrapped in <mark> tags
 */
export function highlightMatch(query: string, target: string): string {
  const normalizedQuery = normalizeText(query);
  const normalizedTarget = normalizeText(target);

  // Simple substring highlighting for now
  if (normalizedTarget.includes(normalizedQuery)) {
    // Find the position in the original (non-normalized) text
    const index = target.toLowerCase().indexOf(query.toLowerCase());
    if (index !== -1) {
      const before = target.substring(0, index);
      const match = target.substring(index, index + query.length);
      const after = target.substring(index + query.length);
      return `${before}<mark>${match}</mark>${after}`;
    }
  }

  return target;
}
