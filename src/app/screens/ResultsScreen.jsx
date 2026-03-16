import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { ProgressBar } from '@/app/components/ProgressBar';
import { WeatherCard } from '@/app/components/WeatherCard';
import { useSkinCare } from '@/app/context/SkinCareContext';
import {
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Sparkles,
  Activity,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const ResultsScreen = () => {
  const navigate = useNavigate();
  const { analysisResult, uploadedImage } = useSkinCare();

  useEffect(() => {
    if (!analysisResult) {
      navigate('/questionnaire');
    }
  }, [analysisResult, navigate]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'mild':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'severe':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const normalizedConditions = useMemo(() => {
    if (!analysisResult?.conditions || !Array.isArray(analysisResult.conditions)) return [];
    return analysisResult.conditions.map((condition, index) => ({
      id: `${condition?.name || 'condition'}-${index}`,
      name: condition?.name || 'Unspecified concern',
      severity: String(condition?.severity || 'mild').toLowerCase(),
      description: condition?.description || 'No additional details provided.',
      confidence: Number(condition?.confidence),
    }));
  }, [analysisResult]);

  const recommendationList = useMemo(() => {
    const merged = [];

    if (Array.isArray(analysisResult?.recommendations)) {
      for (const item of analysisResult.recommendations) {
        if (typeof item === 'string' && item.trim()) {
          merged.push(item.trim());
        } else if (item && typeof item === 'object') {
          const asText = item.details || item.description || item.title;
          if (asText) merged.push(String(asText).trim());
        }
      }
    }

    const match = analysisResult?.recommendationMatch;
    if (match && typeof match === 'object') {
      const mapped = [
        ['Cleanser', match.recommended_cleanser],
        ['Moisturizer', match.recommended_moisturizer],
        ['Serum', match.recommended_serum],
        ['SPF', match.recommended_spf],
        ['Treatment', match.recommended_treatment],
      ];
      for (const [label, value] of mapped) {
        if (value) merged.push(`${label}: ${value}`);
      }
    }

    return [...new Set(merged)];
  }, [analysisResult]);

  if (!analysisResult) return null;

  const score = Number(analysisResult?.score);
  const hasScore = Number.isFinite(score);
  const metaConfidence = Number(
    analysisResult?.analysisMeta?.confidence ??
      analysisResult?.confidence ??
      analysisResult?.meta?.confidence,
  );
  const confidencePercent =
    Number.isFinite(metaConfidence) && metaConfidence <= 1
      ? Math.round(metaConfidence * 100)
      : Number.isFinite(metaConfidence)
      ? Math.round(metaConfidence)
      : null;

  const imageProvider =
    analysisResult?.analysisMeta?.imageProvider || analysisResult?.meta?.imageProvider || 'rule-based';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 sm:py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mb-3 sm:mb-4"
          >
            <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl mb-2 sm:mb-3 text-slate-800">Analysis Complete</h1>
          <p className="text-sm sm:text-base text-slate-600">
            Here are your prediction results and personalized recommendations
          </p>
        </div>

        <ProgressBar currentStep={3} totalSteps={4} />

        <div className="mb-6">
          <WeatherCard />
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-none shadow-md bg-white/90 backdrop-blur h-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl text-slate-800">Your Skin Type</h3>
                </div>
                <p className="text-2xl sm:text-3xl text-purple-600 mb-2 capitalize">
                  {analysisResult?.skinType || 'Unknown'}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {hasScore ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      Score: {Math.round(score)}
                    </Badge>
                  ) : null}
                  {confidencePercent !== null ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Confidence: {confidencePercent}%
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 capitalize">
                    Provider: {imageProvider}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {uploadedImage ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-none shadow-md bg-white/90 backdrop-blur h-full">
                <CardContent className="p-4 sm:p-6">
                  <img
                    src={uploadedImage}
                    alt="Your skin"
                    className="w-full h-40 sm:h-48 object-cover rounded-lg"
                  />
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            <Card className="border-none shadow-md bg-white/90 backdrop-blur h-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base sm:text-lg text-slate-800">Prediction Overview</h3>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  This view summarizes your latest model prediction and recommended actions.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Conditions detected</span>
                    <span className="text-sm text-slate-800">{normalizedConditions.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Recommendations</span>
                    <span className="text-sm text-slate-800">{recommendationList.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Image used</span>
                    <span className="text-sm text-slate-800">
                      {analysisResult?.analysisMeta?.imageProvided || uploadedImage ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-none shadow-md bg-white/90 backdrop-blur mb-4 sm:mb-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                <h3 className="text-lg sm:text-xl text-slate-800">Detected Conditions</h3>
              </div>
              {normalizedConditions.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {normalizedConditions.map((condition, index) => (
                    <motion.div
                      key={condition.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="p-3 sm:p-4 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <h4 className="text-sm sm:text-base text-slate-800 capitalize">{condition.name}</h4>
                        <div className="flex items-center gap-2">
                          {Number.isFinite(condition.confidence) ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                            >
                              {Math.round(condition.confidence * 100)}%
                            </Badge>
                          ) : null}
                          <Badge
                            variant="outline"
                            className={`${getSeverityColor(condition.severity)} capitalize text-xs`}
                          >
                            {condition.severity}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600">{condition.description}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                  No concerns were detected in this analysis.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-purple-50 mb-6 sm:mb-8">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg sm:text-xl text-slate-800">Recommended Actions</h3>
              </div>

              {recommendationList.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {recommendationList.map((rec, index) => (
                    <motion.div
                      key={`${rec}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.08 }}
                      className="flex items-start gap-2 sm:gap-3"
                    >
                      <div className="mt-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      </div>
                      <p className="text-sm sm:text-base text-slate-700 flex-1">{rec}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-white/80 border border-slate-200 text-slate-700 text-sm">
                  No recommendation details were returned for this result.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4">
            Want personalized product recommendations and expert advice?
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              onClick={() => navigate('/chat')}
              className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full shadow-lg"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Chat with AI Assistant
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/questionnaire')}
              className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg rounded-full"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              New Assessment
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
