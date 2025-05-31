export type QuestionType = 'multiple_choice' | 'rating' | 'text' | 'dropdown';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  required: boolean;
  order: number;
  branchLogic?: {
    condition: string;
    value: string;
    showQuestionId?: string;
  };
}

export interface SurveyResponse {
  answers: Array<{
    questionId: string;
    value: string | string[] | number;
  }>;
  submittedAt: Date;
  respondentEmail?: string;
  ipAddress?: string;
}

export interface SurveySettings {
  allowAnonymous: boolean;
  collectEmail: boolean;
  oneResponsePerIp: boolean;
  showResults: boolean;
  customThankYou: string;
}

export interface Survey {
  _id: string;
  title: string;
  description: string;
  creator_id: string;
  questions: Question[];
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
  is_public: boolean;
  shareable_link: string;
  responses: SurveyResponse[];
  collaborators: string[];
  settings: SurveySettings;
}

export interface SurveyTemplate extends Survey {
  category?: string;
  tags?: string[];
  popularity?: number;
}

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  type: string;
  data: {
    labels?: string[];
    values?: number[];
    average?: number;
    responses?: string[];
  };
}

export interface SurveyAnalytics {
  totalResponses: number;
  completionRate: number;
  questionAnalytics: QuestionAnalytics[];
  responses: SurveyResponse[];
}