export const parsePlaceholderToSlot = (displayName: string): string => {
  if (!displayName) return '';
  const cleanName = displayName.trim();

  const groupMatch = cleanName.match(/Group\s+([A-L])\s+(Winner|2nd Place|1st Place)/i);
  if (groupMatch) {
    const letter = groupMatch[1].toUpperCase();
    const type = groupMatch[2].toLowerCase();
    const pos = (type === 'winner' || type === '1st place') ? '1' : '2';
    return `${pos}${letter}`;
  }

  const thirdMatch = cleanName.match(/Third Place Group\s+([A-L/]+)/i);
  if (thirdMatch) {
    const groups = thirdMatch[1].replace(/\//g, '').toUpperCase();
    return `3rd(${groups})`;
  }

  return '';
};
