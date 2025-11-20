export interface ClothingItem {
  id: number;
  name: string;
  type: 'Top' | 'Pants' | 'Shoes' | 'Accessory';
  imageUrl: string;
  description: string;
}

export type AppStep = 'capture' | 'height' | 'select' | 'measure' | 'generate' | 'customize' | 'result';

export type Page = 'home' | 'try-on' | 'contact';

export interface UserImage {
  base64: string;
  mimeType: string;
  url: string;
}

export interface SelectedOutfit {
  Top: ClothingItem | null;
  Pants: ClothingItem | null;
  Shoes: ClothingItem | null;
  Accessory: ClothingItem | null;
}

export interface SavedLook {
  id: number;
  finalImage: string; // base64 string
  originalImage: UserImage;
  selectedOutfit: SelectedOutfit;
}

export interface Measurement {
  name: string;
  value: string;
}

export interface PersonMeasurements {
  measurements: Measurement[];
  notes: string;
}

export interface GarmentFit {
  itemName: string;
  itemType: ClothingItem['type'];
  fitDescription: string;
  garmentMeasurements: Measurement[];
}

export interface FitAnalysis {
  personMeasurements: PersonMeasurements;
  clothingFit: GarmentFit[];
}

export interface SavedMeasurement {
  id: number;
  fitAnalysis: FitAnalysis;
  userImage: UserImage;
  selectedOutfit: SelectedOutfit;
}