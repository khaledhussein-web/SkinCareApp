import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { ProgressBar } from '@/app/components/ProgressBar';
import { useSkinCare } from '@/app/context/SkinCareContext';
import { Droplets, Sun, AlertCircle, Sparkles } from 'lucide-react';

const questions = [
  {
    id: 'afterCleansing',
    question: 'How does your skin feel 20 minutes after cleansing?',
    icon: Droplets,
    options: [
      { value: 'tight', label: 'Tight and uncomfortable' },
      { value: 'comfortable', label: 'Comfortable and balanced' },
      { value: 'slightly-oily', label: 'Slightly oily in T-zone' },
      { value: 'very-oily', label: 'Very oily all over' },
    ],
  },
  {
    id: 'middayFeeling',
    question: 'How does your skin feel by midday?',
    icon: Sun,
    options: [
      { value: 'flaky', label: 'Dry and flaky' },
      { value: 'normal', label: 'Still comfortable' },
      { value: 'shiny-tzone', label: 'Shiny in T-zone only' },
      { value: 'shiny-all', label: 'Shiny everywhere' },
    ],
  },
  {
    id: 'productReaction',
    question: 'How does your skin typically react to new products?',
    icon: AlertCircle,
    options: [
      { value: 'sensitive', label: 'Often gets irritated or red' },
      { value: 'rarely', label: 'Rarely has any reaction' },
      { value: 'breakouts', label: 'Sometimes causes breakouts' },
      { value: 'immediate', label: 'Immediate stinging or burning' },
    ],
  },
  {
    id: 'shineLevel',
    question: 'How does your skin look in photos with flash?',
    icon: Sparkles,
    options: [
      { value: 'matte', label: 'Matte and dull' },
      { value: 'natural', label: 'Natural and even' },
      { value: 'slight-shine', label: 'Some shine on forehead and nose' },
      { value: 'very-shiny', label: 'Very shiny and reflective' },
    ],
  },
];

export const QuestionnaireScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setQuestionnaireData } = useSkinCare();
  const [answers, setAnswers] = useState({
    afterCleansing: '',
    middayFeeling: '',
    productReaction: '',
    shineLevel: '',
  });

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isComplete = Object.values(answers).every((answer) => answer !== '');

  const handleSubmit = () => {
    setQuestionnaireData(answers);
    navigate('/upload');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 sm:py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl mb-2 sm:mb-3 text-slate-800">Skin Assessment</h1>
          <p className="text-sm sm:text-base text-slate-600">Help us understand your skin better</p>
        </div>

        <ProgressBar currentStep={1} totalSteps={4} />

        <div className="space-y-4 sm:space-y-6">
          {questions.map((q, index) => {
            const Icon = q.icon;
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="border-none shadow-md bg-white/90 backdrop-blur">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 flex-shrink-0">
                        <Icon className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-base sm:text-lg text-slate-800 flex-1">{q.question}</h3>
                    </div>
                    <RadioGroup
                      value={answers[q.id as keyof typeof answers]}
                      onValueChange={(value) => handleAnswerChange(q.id, value)}
                    >
                      <div className="space-y-2 sm:space-y-3">
                        {q.options.map((option) => (
                          <label
                            key={option.value}
                            htmlFor={`${q.id}-${option.value}`}
                            className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border-2 border-transparent has-[:checked]:border-purple-400 has-[:checked]:bg-purple-50"
                          >
                            <RadioGroupItem 
                              value={option.value} 
                              id={`${q.id}-${option.value}`}
                              className="flex-shrink-0"
                            />
                            <span className="flex-1 text-sm sm:text-base text-slate-700">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 sm:mt-8 flex justify-center"
        >
          <Button
            onClick={handleSubmit}
            disabled={!isComplete}
            className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Continue to Photo Upload
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};