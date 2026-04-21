import React, { createContext, useContext, useState } from 'react';

interface QuestionnaireData {
  afterCleansing: string;
  middayFeeling: string;
  productReaction: string;
  shineLevel: string;
}

interface AnalysisResult {
  skinType: string;
  conditions: Array<{
    name: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
  }>;
  recommendations: string[];
}

interface SkinCareContextType {
  questionnaireData: QuestionnaireData | null;
  setQuestionnaireData: (data: QuestionnaireData) => void;
  uploadedImage: string | null;
  setUploadedImage: (image: string | null) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult) => void;
}

const SkinCareContext = createContext<SkinCareContextType | undefined>(undefined);

export const SkinCareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  return (
    <SkinCareContext.Provider
      value={{
        questionnaireData,
        setQuestionnaireData,
        uploadedImage,
        setUploadedImage,
        analysisResult,
        setAnalysisResult,
      }}
    >
      {children}
    </SkinCareContext.Provider>
  );
};

export const useSkinCare = () => {
  const context = useContext(SkinCareContext);
  if (context === undefined) {
    throw new Error('useSkinCare must be used within a SkinCareProvider');
  }
  return context;
};
