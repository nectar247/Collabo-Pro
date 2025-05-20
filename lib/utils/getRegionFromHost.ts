export const getRegionFromHost = (host: string): string => {
    const domain = host.toLowerCase();
  
    if (domain.includes('uk.') || domain.endsWith('.co.uk')) return 'GB';
    if (domain.includes('ng.') || domain.endsWith('.ng')) return 'NG';
    if (domain.includes('us.') || domain.endsWith('.com')) return 'US';
  
    return 'GB';
};
  