export const getCredibilityCategory = (score: number): 'high' | 'medium' | 'low' => {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
};

export const getCredibilityColorHex = (score: number): string => {
  if (score >= 0.8) return '#008080'; // teal
  if (score >= 0.5) return '#F9A825'; // amber
  return '#BA1A1A'; // error red
};
