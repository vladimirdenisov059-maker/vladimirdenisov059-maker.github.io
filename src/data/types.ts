export type PlantCategory = 'Лианы' | 'Плодовые' | 'Ягодные' | 'Орехоплодные' | 'Прочие';

export interface Article {
  id: string; slug: string; title: string; excerpt: string; content: string[];
  coverImage?: string; gallery: string[]; author: string; publishedAt?: string;
  updatedAt?: string; category: string; tags: string[]; relatedPlants: string[];
  relatedArticles: string[]; originalSource?: string; originalUrl?: string;
  draft: boolean; featured: boolean; readingTime: number;
}

export interface Plant {
  id: string; slug: string; name: string; latinName?: string; category: PlantCategory;
  variety?: string; description: string; images: string[]; videos?: { src: string; title: string; poster?: string }[]; yearsInGarden?: number;
  status: 'плодоносит' | 'наблюдение' | 'эксперимент'; floweringPeriod?: string;
  harvestPeriod?: string; pollination?: string; winterHardiness?: string;
  fruitSize?: string; taste?: string; yield?: string; thornless?: boolean;
  remontant?: boolean; experimental: boolean; planting?: string; care?: string;
  pruning?: string; winterProtection?: string; personalNotes: string;
  advantages: string[]; disadvantages: string[]; relatedArticles: string[];
  confirmationNeeded?: string[];
}

export interface TimelineEntry {
  date?: string; year: number; title: string; description: string; images: string[];
  weatherNotes?: string; result?: string;
}

export interface Experiment {
  id: string; slug: string; title: string; summary: string; plantIds: string[];
  startYear?: number; status: 'продолжается' | 'завершён' | 'наблюдение'; goal: string;
  timeline: TimelineEntry[]; images: string[]; videos?: { src: string; title: string; poster?: string }[]; observations: string[];
  results: string[]; problems: string[]; nextSteps: string[]; relatedArticles: string[];
}

export interface GardenTask {
  month: number; title: string; description: string; category: string;
  plantIds: string[]; priority: 'обычная' | 'важная'; relatedArticle?: string;
}
