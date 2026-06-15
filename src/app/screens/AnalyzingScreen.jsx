import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useSkinCare } from "@/app/context/SkinCareContext";
import { useAuth } from "@/app/context/AuthContext";
import { runSkinAnalysis } from "@/app/services/skincareApi";

export const AnalyzingScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    questionnaireData,
    uploadedImage,
    setUploadedImage,
    setAnalysisResult,
    setLatestAssessmentId,
    setChatConversationId,
    setForceNewChatSession,
  } = useSkinCare();
  const [error, setError] = useState("");
  const handleRetakePhoto = () => {
    setUploadedImage(null);
    navigate("/upload");
  };

  useEffect(() => {
    // Kick off analysis when this screen mounts, then route to results.
    const analyze = async () => {
      if (!user?.id) {
        navigate("/login");
        return;
      }
      if (!uploadedImage) {
        navigate("/upload");
        return;
      }

      try {
        const response = await runSkinAnalysis({
          questionnaireData: questionnaireData || {},
          imageBase64: uploadedImage,
        });

        setAnalysisResult(response.result);
        setLatestAssessmentId(response.assessmentId);
        setChatConversationId(null);
        setForceNewChatSession(true);
        navigate("/results");
      } catch (analysisError) {
        setError(analysisError instanceof Error ? analysisError.message : "Analysis failed");
      }
    };

    analyze();
  }, [
    navigate,
    questionnaireData,
    setAnalysisResult,
    setLatestAssessmentId,
    setChatConversationId,
    setForceNewChatSession,
    uploadedImage,
    user?.id,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
          className="mb-8 inline-block"
        >
          <div className="relative">
            <Sparkles className="w-24 h-24 text-purple-500" />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-purple-400 rounded-full blur-xl"
            />
          </div>
        </motion.div>

        <h2 className="text-3xl mb-4 text-slate-800">Analyzing Your Skin</h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          We are processing your questionnaire and image to generate your personalized skincare
          insights.
        </p>

        {error ? (
          <div className="max-w-md mx-auto p-5 rounded-lg bg-red-50 border border-red-200 text-red-700">
            <p>{error}</p>
            <Button
              onClick={handleRetakePhoto}
              className="mt-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 text-white hover:from-pink-600 hover:to-purple-600"
            >
              Retake Photo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {["Detecting skin type...", "Identifying conditions...", "Preparing recommendations..."].map(
              (text, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.8 }}
                  className="flex items-center justify-center gap-3 text-slate-600"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{text}</span>
                </motion.div>
              ),
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
