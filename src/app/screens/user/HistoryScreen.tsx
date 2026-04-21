import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Calendar, Eye, FileText, TrendingUp } from 'lucide-react';

interface Assessment {
  id: string;
  date: string;
  skinType: string;
  conditions: string[];
  score: number;
}

export const HistoryScreen: React.FC = () => {
  const navigate = useNavigate();

  // Mock assessment history
  const assessments: Assessment[] = [
    {
      id: '1',
      date: '2026-02-05',
      skinType: 'Combination',
      conditions: ['Acne', 'Oiliness'],
      score: 78,
    },
    {
      id: '2',
      date: '2026-01-28',
      skinType: 'Combination',
      conditions: ['Acne', 'Dryness'],
      score: 72,
    },
    {
      id: '3',
      date: '2026-01-15',
      skinType: 'Oily',
      conditions: ['Acne'],
      score: 65,
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl mb-2 text-slate-800">Assessment History</h1>
          <p className="text-slate-600">Track your skin health progress over time</p>
        </motion.div>

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6" />
                <h2 className="text-2xl">Your Progress</h2>
              </div>
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-white/80 text-sm mb-1">Latest Score</p>
                  <p className="text-4xl">78</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Improvement</p>
                  <p className="text-4xl">+13</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Total Assessments</p>
                  <p className="text-4xl">{assessments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assessment List */}
        <div className="space-y-4">
          {assessments.map((assessment, index) => (
            <motion.div
              key={assessment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-white/90 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FileText className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {new Date(assessment.date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {assessment.skinType}
                        </Badge>
                        {assessment.conditions.map((condition, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-orange-50 text-orange-700 border-orange-200"
                          >
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`px-4 py-2 rounded-lg ${getScoreColor(assessment.score)}`}>
                        <p className="text-2xl">{assessment.score}</p>
                        <p className="text-xs">Score</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State or New Assessment CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="border-none shadow-md bg-white/90 backdrop-blur">
            <CardContent className="p-8 text-center">
              <p className="text-slate-600 mb-4">Ready for your next assessment?</p>
              <Button
                onClick={() => navigate('/questionnaire')}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full"
              >
                Start New Assessment
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
