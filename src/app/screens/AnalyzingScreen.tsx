import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useSkinCare } from '@/app/context/SkinCareContext';
import { Sparkles, Loader2 } from 'lucide-react';

export const AnalyzingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { questionnaireData, setAnalysisResult } = useSkinCare();

  useEffect(() => {
    // Simulate AI analysis
    const timer = setTimeout(() => {
      // Mock analysis based on questionnaire data
      const mockAnalysis = {
        skinType: determineSkinType(),
        conditions: [
          {
            name: 'Mild Acne',
            severity: 'mild' as const,
            description: 'Small breakouts detected on T-zone area',
          },
          {
            name: 'Slight Dryness',
            severity: 'mild' as const,
            description: 'Minor dry patches on cheek areas',
          },
        ],
        recommendations: [
          'Use a gentle, non-comedogenic cleanser twice daily',
          'Apply a lightweight, oil-free moisturizer',
          'Incorporate products with salicylic acid for acne',
          'Use SPF 30+ sunscreen every morning',
        ],
      };
      setAnalysisResult(mockAnalysis);
      navigate('/results');
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate, setAnalysisResult]);

  const determineSkinType = () => {
    if (!questionnaireData) return 'Combination';
    const { afterCleansing, middayFeeling } = questionnaireData;
    if (afterCleansing === 'tight' || middayFeeling === 'flaky') return 'Dry';
    if (afterCleansing === 'very-oily' || middayFeeling === 'shiny-all') return 'Oily';
    if (afterCleansing === 'slightly-oily' || middayFeeling === 'shiny-tzone')
      return 'Combination';
    return 'Normal';
  };

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
            rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
            scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
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
          Our AI is examining your photo and questionnaire responses to provide personalized
          insights
        </p>

        <div className="space-y-3">
          {['Detecting skin type...', 'Identifying conditions...', 'Preparing recommendations...'].map(
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
            )
          )}
        </div>
      </motion.div>
    </div>
  );
};
