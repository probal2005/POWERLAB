export type Language = 'en' | 'bn';

export interface LawSection {
  headingEn: string;
  headingBn: string;
  bodyEn: string[];
  bodyBn: string[];
}

export type AssessmentOptions = [string, string, string, string];

export interface AssessmentQuestion {
  id: string;
  questionEn: string;
  questionBn: string;
  optionsEn: AssessmentOptions;
  optionsBn: AssessmentOptions;
  correctOption: 0 | 1 | 2 | 3;
  explanationEn: string;
  explanationBn: string;
}

export interface LawAssessment {
  passPercentage: number;
  isPublished: boolean;
  questions: AssessmentQuestion[];
}

export interface Law {
  number: number;
  slug: string;
  titleEn: string;
  titleBn: string;
  shortEn: string;
  shortBn: string;
  category: string;
  sections?: LawSection[];
  assessment?: LawAssessment;
  isPublished?: boolean;
}

export interface Category {
  id: string;
  labelEn: string;
  labelBn: string;
}
