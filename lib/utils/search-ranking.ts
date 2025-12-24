/**
 * Search Ranking Utility
 * Provides relevance scoring and ranking for search results
 */

import { Deal } from '@/lib/firebase/collections';
import { normalizeText, findBestFuzzyMatch } from './fuzzy-search';

/**
 * Scoring weights for different match types
 */
const SCORING_WEIGHTS = {
  EXACT_TITLE: 100,
  TITLE_CONTAINS: 80,
  TITLE_FUZZY: 60,
  BRAND_EXACT: 50,
  BRAND_FUZZY: 40,
  CATEGORY_MATCH: 30,
  DESCRIPTION_CONTAINS: 20,
  DESCRIPTION_FUZZY: 10,
  RECENCY_MAX: 20,
  DISCOUNT_MAX: 15,
};

/**
 * Interface for deal with relevance score
 */
export interface ScoredDeal extends Deal {
  relevanceScore: number;
  matchDetails?: {
    titleMatch: number;
    brandMatch: number;
    categoryMatch: number;
    descriptionMatch: number;
    recencyBonus: number;
    discountBonus: number;
  };
}

/**
 * Extract discount percentage from discount string
 * Examples: "50% off", "Up to 70%", "$20 off" -> returns number or 0
 */
function extractDiscountPercentage(discountStr: string): number {
  if (!discountStr) return 0;

  // Look for percentage pattern
  const percentMatch = discountStr.match(/(\d+)%/);
  if (percentMatch) {
    return parseInt(percentMatch[1], 10);
  }

  // Look for dollar amount and try to estimate percentage
  const dollarMatch = discountStr.match(/\$(\d+)/);
  if (dollarMatch) {
    const amount = parseInt(dollarMatch[1], 10);
    // Rough estimation: $10 = 10%, $20 = 15%, $50 = 20%, etc.
    return Math.min(20, Math.floor(amount / 5));
  }

  return 0;
}

/**
 * Calculate recency bonus based on deal creation date
 * Newer deals get higher scores
 */
function calculateRecencyBonus(createdAt: Date | any): number {
  if (!createdAt) return 0;

  const now = new Date();
  const dealDate = createdAt instanceof Date ? createdAt : createdAt.toDate();
  const daysSinceCreated = (now.getTime() - dealDate.getTime()) / (1000 * 60 * 60 * 24);

  // Maximum bonus for deals less than 1 day old
  if (daysSinceCreated < 1) return SCORING_WEIGHTS.RECENCY_MAX;
  // Linear decay over 30 days
  if (daysSinceCreated < 30) {
    return SCORING_WEIGHTS.RECENCY_MAX * (1 - daysSinceCreated / 30);
  }
  // No bonus for deals older than 30 days
  return 0;
}

/**
 * Calculate discount bonus based on discount percentage
 */
function calculateDiscountBonus(discount: string): number {
  const percentage = extractDiscountPercentage(discount);
  if (percentage === 0) return 0;

  // Scale: 10% = 3 points, 50% = 15 points, 100% = 15 points (max)
  return Math.min(SCORING_WEIGHTS.DISCOUNT_MAX, (percentage / 100) * SCORING_WEIGHTS.DISCOUNT_MAX);
}

/**
 * Calculate relevance score for a single deal against search query
 */
export function calculateRelevanceScore(deal: Deal, query: string): number {
  const normalizedQuery = normalizeText(query);
  let score = 0;

  const matchDetails = {
    titleMatch: 0,
    brandMatch: 0,
    categoryMatch: 0,
    descriptionMatch: 0,
    recencyBonus: 0,
    discountBonus: 0,
  };

  // 1. Title scoring (highest priority)
  const normalizedTitle = normalizeText(deal.title);
  if (normalizedTitle === normalizedQuery) {
    // Exact match
    matchDetails.titleMatch = SCORING_WEIGHTS.EXACT_TITLE;
  } else if (normalizedTitle.includes(normalizedQuery)) {
    // Contains query
    matchDetails.titleMatch = SCORING_WEIGHTS.TITLE_CONTAINS;
  } else {
    // Fuzzy match
    const titleFuzzyScore = findBestFuzzyMatch(query, deal.title);
    if (titleFuzzyScore >= 70) {
      matchDetails.titleMatch = (titleFuzzyScore / 100) * SCORING_WEIGHTS.TITLE_FUZZY;
    }
  }

  // 2. Brand scoring
  const normalizedBrand = normalizeText(deal.brand);
  if (normalizedBrand === normalizedQuery) {
    // Exact brand match
    matchDetails.brandMatch = SCORING_WEIGHTS.BRAND_EXACT;
  } else if (normalizedBrand.includes(normalizedQuery)) {
    // Brand contains query
    matchDetails.brandMatch = SCORING_WEIGHTS.BRAND_EXACT * 0.9;
  } else {
    // Fuzzy brand match
    const brandFuzzyScore = findBestFuzzyMatch(query, deal.brand);
    if (brandFuzzyScore >= 70) {
      matchDetails.brandMatch = (brandFuzzyScore / 100) * SCORING_WEIGHTS.BRAND_FUZZY;
    }
  }

  // 3. Category scoring
  const normalizedCategory = normalizeText(deal.category);
  if (normalizedCategory === normalizedQuery || normalizedCategory.includes(normalizedQuery)) {
    matchDetails.categoryMatch = SCORING_WEIGHTS.CATEGORY_MATCH;
  } else {
    const categoryFuzzyScore = findBestFuzzyMatch(query, deal.category);
    if (categoryFuzzyScore >= 70) {
      matchDetails.categoryMatch = (categoryFuzzyScore / 100) * SCORING_WEIGHTS.CATEGORY_MATCH;
    }
  }

  // 4. Description scoring (lower priority)
  if (deal.description) {
    const normalizedDescription = normalizeText(deal.description);
    if (normalizedDescription.includes(normalizedQuery)) {
      matchDetails.descriptionMatch = SCORING_WEIGHTS.DESCRIPTION_CONTAINS;
    } else {
      const descFuzzyScore = findBestFuzzyMatch(query, deal.description);
      if (descFuzzyScore >= 70) {
        matchDetails.descriptionMatch = (descFuzzyScore / 100) * SCORING_WEIGHTS.DESCRIPTION_FUZZY;
      }
    }
  }

  // 5. Recency bonus
  matchDetails.recencyBonus = calculateRecencyBonus(deal.createdAt);

  // 6. Discount quality bonus
  matchDetails.discountBonus = calculateDiscountBonus(deal.discount);

  // Sum all scores
  score =
    matchDetails.titleMatch +
    matchDetails.brandMatch +
    matchDetails.categoryMatch +
    matchDetails.descriptionMatch +
    matchDetails.recencyBonus +
    matchDetails.discountBonus;

  return score;
}

/**
 * Calculate relevance scores for all deals and attach to deal objects
 */
export function scoreDeals(deals: Deal[], query: string): ScoredDeal[] {
  return deals.map((deal) => {
    const relevanceScore = calculateRelevanceScore(deal, query);
    return {
      ...deal,
      relevanceScore,
    };
  });
}

/**
 * Sort deals by relevance score (highest first)
 */
export function sortByRelevance(deals: Deal[], query: string): ScoredDeal[] {
  const scoredDeals = scoreDeals(deals, query);
  return scoredDeals.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Filter and sort deals by relevance, only returning deals above a minimum score threshold
 */
export function filterAndRankDeals(
  deals: Deal[],
  query: string,
  minScore: number = 10
): ScoredDeal[] {
  const scoredDeals = scoreDeals(deals, query);
  return scoredDeals
    .filter((deal) => deal.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Get top N deals by relevance
 */
export function getTopDeals(deals: Deal[], query: string, limit: number = 10): ScoredDeal[] {
  const rankedDeals = sortByRelevance(deals, query);
  return rankedDeals.slice(0, limit);
}

/**
 * Normalize scores to 0-100 range for display purposes
 */
export function normalizeScores(deals: ScoredDeal[]): ScoredDeal[] {
  if (deals.length === 0) return deals;

  const maxScore = Math.max(...deals.map((d) => d.relevanceScore));
  const minScore = Math.min(...deals.map((d) => d.relevanceScore));

  if (maxScore === minScore) {
    // All scores are the same
    return deals.map((deal) => ({ ...deal, relevanceScore: 100 }));
  }

  return deals.map((deal) => ({
    ...deal,
    relevanceScore: ((deal.relevanceScore - minScore) / (maxScore - minScore)) * 100,
  }));
}

/**
 * Group deals by match quality
 */
export interface GroupedDeals {
  exact: ScoredDeal[];
  high: ScoredDeal[];
  medium: ScoredDeal[];
  low: ScoredDeal[];
}

export function groupDealsByRelevance(deals: Deal[], query: string): GroupedDeals {
  const scoredDeals = sortByRelevance(deals, query);

  return {
    exact: scoredDeals.filter((d) => d.relevanceScore >= 90),
    high: scoredDeals.filter((d) => d.relevanceScore >= 60 && d.relevanceScore < 90),
    medium: scoredDeals.filter((d) => d.relevanceScore >= 30 && d.relevanceScore < 60),
    low: scoredDeals.filter((d) => d.relevanceScore >= 10 && d.relevanceScore < 30),
  };
}
