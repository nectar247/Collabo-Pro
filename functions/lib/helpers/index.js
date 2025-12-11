// Extract discount text from promotion
const extractDiscount = (title, description) => {
    const text = `${title} ${description}`;
    const percentMatch = text.match(/(\d+)%/i);
    if (percentMatch)
        return `${percentMatch[1]}% OFF`;
    const currencyMatches = text.match(/[£€$](\d+)|USD (\d+)/i);
    if (currencyMatches) {
        const value = currencyMatches[1] || currencyMatches[2];
        const symbol = currencyMatches[0].charAt(0).replace("U", "$");
        return `${symbol}${value} OFF`;
    }
    if (text.toLowerCase().includes("free shipping"))
        return "Free Shipping";
    return "";
};
// Extract promotional code if available
const extractCode = (promotion) => {
    var _a, _b, _c;
    if ((_a = promotion.voucher) === null || _a === void 0 ? void 0 : _a.code)
        return promotion.voucher.code;
    const codeRegex = /\b(?:code|coupon|voucher):?\s*["']?([A-Z0-9_\-]+)["']?/i;
    const titleMatch = (_b = promotion.title) === null || _b === void 0 ? void 0 : _b.match(codeRegex);
    const descMatch = (_c = promotion.description) === null || _c === void 0 ? void 0 : _c.match(codeRegex);
    return (titleMatch === null || titleMatch === void 0 ? void 0 : titleMatch[1]) || (descMatch === null || descMatch === void 0 ? void 0 : descMatch[1]) || "";
};
// Determine label based on promotion type
const determineLabel = (promotion) => {
    var _a;
    const title = (promotion.title || "").toLowerCase();
    const description = (promotion.description || "").toLowerCase();
    const hasCode = !!extractCode(promotion);
    if (((_a = promotion.type) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "voucher" && hasCode)
        return "GetCode";
    if (title.includes("reward") || description.includes("reward") ||
        title.includes("cashback") || description.includes("cashback"))
        return "GetReward";
    if (title.includes("free shipping") || description.includes("free shipping"))
        return "GetDeals";
    return Math.random() < 0.5 ? "GetDeals" : "GetReward";
};
export { extractCode, extractDiscount, determineLabel };
//# sourceMappingURL=index.js.map