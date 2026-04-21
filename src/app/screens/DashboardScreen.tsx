import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { WeatherCard } from '@/app/components/WeatherCard';
import { useSkinCare } from '@/app/context/SkinCareContext';
import { Play, FileText, Camera, MessageCircle, Sparkles, ArrowRight } from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analysisResult, questionnaireData } = useSkinCare();

  const hasCompletedAssessment = analysisResult !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl mb-3 text-slate-800">Your Dashboard</h1>
          <p className="text-base sm:text-lg text-slate-600">
            {hasCompletedAssessment
              ? 'View your results or chat with our AI assistant'
              : 'Start your personalized skin assessment journey'}
          </p>
        </motion.div>

        {/* Weather Impact Card */}
        <div className="mb-8">
          <WeatherCard />
        </div>

        {/* Main Action Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-none shadow-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white overflow-hidden">
            <CardContent className="p-8 sm:p-12">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-4">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">AI-Powered Analysis</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl mb-4">
                    {hasCompletedAssessment
                      ? 'Your Skin Profile is Ready!'
                      : 'Begin Your Skin Assessment'}
                  </h2>
                  <p className="text-lg mb-6 text-white/90">
                    {hasCompletedAssessment
                      ? 'Review your detailed analysis and get personalized recommendations'
                      : 'Answer a few questions and upload a photo to get your personalized skin analysis'}
                  </p>
                  <Button
                    onClick={() =>
                      navigate(hasCompletedAssessment ? '/results' : '/questionnaire')
                    }
                    className="bg-white text-purple-600 hover:bg-slate-100 rounded-full px-8 py-6 text-lg shadow-xl"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {hasCompletedAssessment ? 'View Results' : 'Start Assessment'}
                  </Button>
                </div>
                <div className="hidden lg:block">
                  <div className="w-64 h-64 relative">
                    <div className="absolute inset-0 bg-white/20 rounded-3xl backdrop-blur-sm" />
                    <div className="absolute inset-4 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Camera className="w-24 h-24 text-white/60" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl sm:text-2xl mb-4 text-slate-800">Quick Actions</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: FileText,
                title: 'Take Quiz',
                description: 'Answer questions about your skin',
                action: () => navigate('/questionnaire'),
                color: 'from-blue-400 to-cyan-400',
              },
              {
                icon: Camera,
                title: 'Upload Photo',
                description: 'Get instant skin analysis',
                action: () => navigate('/upload'),
                color: 'from-pink-400 to-rose-400',
              },
              {
                icon: MessageCircle,
                title: 'Chat with AI',
                description: 'Get personalized advice',
                action: () => navigate('/chat'),
                color: 'from-purple-400 to-indigo-400',
                disabled: !hasCompletedAssessment,
              },
            ].map((action, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Card
                  className={`border-none shadow-md hover:shadow-xl transition-all h-full ${
                    action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  onClick={action.disabled ? undefined : action.action}
                >
                  <CardContent className="p-6">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4`}
                    >
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-lg mb-2 text-slate-800">{action.title}</h4>
                    <p className="text-sm text-slate-600 mb-4">{action.description}</p>
                    {!action.disabled && (
                      <div className="flex items-center text-purple-600 text-sm">
                        <span>Get Started</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    )}
                    {action.disabled && (
                      <p className="text-xs text-slate-400">Complete assessment first</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Results Summary (if completed) */}
        {hasCompletedAssessment && analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-xl sm:text-2xl mb-4 text-slate-800">Your Latest Results</h3>
            <Card className="border-none shadow-md bg-white/90 backdrop-blur">
              <CardContent className="p-6 sm:p-8">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Skin Type</p>
                    <p className="text-2xl text-purple-600">{analysisResult.skinType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Conditions Detected</p>
                    <p className="text-2xl text-slate-800">
                      {analysisResult.conditions.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Recommendations</p>
                    <p className="text-2xl text-slate-800">
                      {analysisResult.recommendations.length}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <Button
                    onClick={() => navigate('/results')}
                    variant="outline"
                    className="w-full sm:w-auto rounded-full"
                  >
                    View Full Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-100"
        >
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> This is a demonstration tool for educational purposes. For
            professional skincare advice, please consult with a licensed dermatologist.
          </p>
        </motion.div>
      </div>
    </div>
  );
};