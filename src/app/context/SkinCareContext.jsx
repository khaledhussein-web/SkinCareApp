import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";

const SkinCareContext = createContext(undefined);

export const SkinCareProvider = ({ children }) => {
  const { user } = useAuth();
  const [questionnaireData, setQuestionnaireData] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [latestAssessmentId, setLatestAssessmentId] = useState(null);
  const [chatConversationId, setChatConversationId] = useState(null);
  const previousUserIdRef = useRef(null);

  const resetSkinCareState = () => {
    setQuestionnaireData(null);
    setUploadedImage(null);
    setAnalysisResult(null);
    setLatestAssessmentId(null);
    setChatConversationId(null);
  };

  useEffect(() => {
    const currentUserId = user?.id || null;
    if (previousUserIdRef.current !== currentUserId) {
      // Prevent cross-account leakage by resetting in-memory assessment/chat state
      // whenever auth identity changes (login/logout/switch user).
      resetSkinCareState();
      previousUserIdRef.current = currentUserId;
    }
  }, [user?.id]);

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
        resetSkinCareState,
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
