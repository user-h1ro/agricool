// src/pages/MarketPlace/util.ts
export const buildTheme = (category: string) => {
  const themes: any = {
    leafy: { 
      emoji: '🥬', 
      bg: '#f0fdf4', 
      avatarBg: '#86efac', 
      avatarColor: '#166534' 
    },
    fruit_veg: { 
      emoji: '🍅', 
      bg: '#fefce8', 
      avatarBg: '#fde047', 
      avatarColor: '#854d0e' 
    },
    rootcrops: { 
      emoji: '🥕', 
      bg: '#fef3c7', 
      avatarBg: '#fbbf24', 
      avatarColor: '#92400e' 
    },
    fruits: { 
      emoji: '🍎', 
      bg: '#fce7f3', 
      avatarBg: '#f472b6', 
      avatarColor: '#831843' 
    },
    herbs: { 
      emoji: '🌿', 
      bg: '#ecfdf5', 
      avatarBg: '#34d399', 
      avatarColor: '#064e3b' 
    },
  };

  return themes[category] || themes.leafy;
};