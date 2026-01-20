
export enum SentimentType {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  NEUTRAL = 'NEUTRAL',
}

export interface NewsHeadline {
  title: string;
  category: 'GOOD' | 'BAD' | 'NEUTRAL';
  snippet: string;
  source?: string;
  url?: string;
}

export interface CountrySentimentData {
  countryName: string;
  countryCode?: string; // ISO 3166-1 alpha-2
  sentimentScore: number; // -1.0 to 1.0
  sentimentLabel: SentimentType;
  stateSummary: string;
  headlines: NewsHeadline[];
  lastUpdated: number;
}

export interface HistoricalPoint {
  date: string; // ISO Date YYYY-MM-DD
  score: number;
  timestamp: number;
}

export interface MapFeature {
  type: string;
  properties: {
    name: string;
    id?: string;
    [key: string]: any;
  };
  geometry: any;
}

export interface GeoJSONData {
  type: string;
  features: MapFeature[];
}
