import { AwinPromotion } from "../utils/index.js";

// Extract discount text from promotion
const extractDiscount = (title: string, description: string): string => {
  const text = `${title} ${description}`;
    
  const percentMatch = text.match(/(\d+)%/i);
  if (percentMatch) return `${percentMatch[1]}% OFF`;
    
  const currencyMatches = text.match(/[£€$](\d+)|USD (\d+)/i);
  if (currencyMatches) {
    const value = currencyMatches[1] || currencyMatches[2];
    const symbol = currencyMatches[0].charAt(0).replace("U", "$");
    return `${symbol}${value} OFF`;
  }
    
  if (text.toLowerCase().includes("free shipping")) return "Free Shipping";
  return "";
}

// Extract promotional code if available
const extractCode = (promotion: AwinPromotion): string => {
  if (promotion.voucher?.code) return promotion.voucher.code;
    
  const codeRegex = /\b(?:code|coupon|voucher):?\s*["']?([A-Z0-9_\-]+)["']?/i;
  const titleMatch = promotion.title?.match(codeRegex);
  const descMatch = promotion.description?.match(codeRegex);
    
  return titleMatch?.[1] || descMatch?.[1] || "";
}

// Determine label based on promotion type
const determineLabel = (promotion: AwinPromotion): string => {
  const title = (promotion.title || "").toLowerCase();
  const description = (promotion.description || "").toLowerCase();
  const hasCode = !!extractCode(promotion);
    
  if (promotion.type?.toLowerCase() === "voucher" && hasCode) return "GetCode";
  if (title.includes("reward") || description.includes("reward") || 
        title.includes("cashback") || description.includes("cashback")) return "GetReward";
  if (title.includes("free shipping") || description.includes("free shipping")) return "GetDeals";
    
  return Math.random() < 0.5 ? "GetDeals" : "GetReward";
}

export {
  extractCode,
  extractDiscount,
  determineLabel
}