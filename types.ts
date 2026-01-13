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
}

export interface CountrySentimentData {
  countryName: string;
  sentimentScore: number; // -1.0 to 1.0
  sentimentLabel: SentimentType;
  stateSummary: string;
  headlines: NewsHeadline[];
  lastUpdated: number;
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
