export interface D56Item {
  name: string;
  series: string;
  itemNumber: string | null;
  modelNumber: string | null;
  yearIntroduced: number | null;
  yearRetired: number | null;
  retiredStatus: string | null;
  estimatedCondition: string;
  estimatedValueRange: string;
  description: string;
  isDepartment56: boolean;
  confidenceScore: number;
  isLimitedEdition: boolean;
  isSigned: boolean;
  feedbackStatus?: 'idle' | 'accepted' | 'rejected';
}

export interface AlternativeItem {
  name: string;
  series: string;
  reason: string;
  confidenceScore?: number;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}