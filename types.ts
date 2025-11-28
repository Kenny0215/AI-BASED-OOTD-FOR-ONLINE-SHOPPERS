export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Add RecommendationItem interface for style advisor.
export interface RecommendationItem {
  itemName: string;
  styleCategory: string;
  description: string;
}

export interface VirtualTryOnParams {
  personImage: string;
  garmentImage: string;
  width: number;
  height: number;
}
