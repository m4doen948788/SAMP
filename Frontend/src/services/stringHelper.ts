const ABBREVIATIONS = new Set([
  'SKP', 'FGD', 'IPB', 'RPJMD', 'RKPD', 'RPJMN', 'DAU', 'BAPPERIDA', 'BAPPEDA', 
  'TBC', 'PNS', 'PPPK', 'BA', 'DAP', 'PIP', 'SG', 'KAB', 'RKA', 'APBD', 'OPD', 
  'DPA', 'SIPD', 'LKPJ', 'LPPD', 'KUA', 'PPAS', 'WP', 'SWP', 'SK', 'ASN', 
  'PLT', 'PJ', 'DPD', 'DPRD', 'DPR', 'UPTD', 'BOS', 'PPA'
]);

export const formatFilename = (name: string | null | undefined): string => {
  if (!name) return '';
  
  const extIdx = name.lastIndexOf('.');
  let baseName = extIdx !== -1 ? name.substring(0, extIdx) : name;
  const ext = extIdx !== -1 ? name.substring(extIdx) : '';
  
  baseName = baseName.replace(/\s+/g, ' ').trim();
  
  const isAllUpperCase = baseName === baseName.toUpperCase();
  const words = baseName.split(' ');
  
  const formattedWords = words.map(word => {
    if (word.length === 0) return '';
    
    // Remove non-alphanumeric chars for abbreviation matching check
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
    const upperWord = cleanWord.toUpperCase();
    
    // 1. Check official abbreviations dictionary
    if (ABBREVIATIONS.has(upperWord)) {
      return word.toUpperCase();
    }
    
    // 2. Check if the word contains no vowels (consonant only) like TBC, FGD, WP, SWP, etc.
    const hasVowels = /[aeiouyAEIOUY]/i.test(cleanWord);
    const isOnlyAlphabetic = /^[a-zA-Z]+$/.test(cleanWord);
    if (isOnlyAlphabetic && !hasVowels && cleanWord.length >= 2) {
      return word.toUpperCase();
    }
    
    // 3. Mode A (Mixed Case): If input is not all caps, preserve user's intentionally capitalized words of 2-5 chars
    if (!isAllUpperCase) {
      const isOriginallyAllCaps = word === word.toUpperCase();
      if (isOriginallyAllCaps && word.length >= 2 && word.length <= 5) {
        return word;
      }
    }
    
    // 4. Default: Title Case (Capitalize first letter, lowercase the rest)
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return formattedWords.filter(Boolean).join(' ') + ext.toLowerCase();
};
