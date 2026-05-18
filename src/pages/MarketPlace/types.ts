export type CropCategory = 'leafy' | 'fruit_veg' | 'rootcrops' | 'fruits' | 'herbs';

export type CropUnit = 'kg' | 'pc' | 'bundle' | 'sack' | 'box';

export const CATEGORY_THEME = {
  leafy: { emoji: '🥬', label: 'Leafy Greens', bg: '#f0fdf4', avatarBg: '#86efac', avatarColor: '#166534' },
  fruit_veg: { emoji: '🍅', label: 'Fruit Vegetables', bg: '#fefce8', avatarBg: '#fde047', avatarColor: '#854d0e' },
  rootcrops: { emoji: '🥕', label: 'Root Crops', bg: '#fef3c7', avatarBg: '#fbbf24', avatarColor: '#92400e' },
  fruits: { emoji: '🍎', label: 'Fruits', bg: '#fce7f3', avatarBg: '#f472b6', avatarColor: '#831843' },
  herbs: { emoji: '🌿', label: 'Herbs & Spices', bg: '#ecfdf5', avatarBg: '#34d399', avatarColor: '#064e3b' },
};

export const UNIT_OPTIONS: CropUnit[] = ['kg', 'pc', 'bundle', 'sack', 'box'];

export type AddCropFormValues = {
  name: string;
  variety: string;
  quantity: string;
  price: number;
  unit: CropUnit;
  category: CropCategory;
  seller: string;
  contact: string;
  facebook: string;
  location: string;
  latitude?: number;
  longitude?: number;
};

export type Crop = {
  id?: string;
  name: string;
  variety: string;
  quantity: string;
  price: number;
  unit: CropUnit;
  category: CropCategory;
  seller: string;
  contact: string;
  facebook?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  emoji: string;
  bg: string;
  avatar_bg: string;
  avatar_color: string;
  seller_id?: string;
  created_at?: string;
};