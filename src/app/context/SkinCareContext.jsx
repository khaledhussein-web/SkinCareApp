import React, { createContext, useContext, useState } from "react";

const SkinCareContext = createContext(undefined);

export const SkinCareProvider = ({ children }) => {
  const [questionnaireData, setQuestionnaireData] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [latestAssessmentId, setLatestAssessmentId] = useState(null);
  const [chatConversationId, setChatConversationId] = useState(null);

  return (
    <SkinCareContext.Provider
      value={{
        questionnaireData,
        setQuestionnaireData,
        uploadedImage,
        setUploadedImage,
        analysisResult,
        setAnalysisResult,
        latestAssessmentId,
        setLatestAssessmentId,
        chatConversationId,
        setChatConversationId,
      }}
    >
      {children}
    </SkinCareContext.Provider>
  );
};

export const useSkinCare = () => {
  const context = useContext(SkinCareContext);
  if (context === undefined) {
    throw new Error("useSkinCare must be used within a SkinCareProvider");
  }
  return context;
};
