import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { ProgressBar } from "@/app/components/ProgressBar";
import { useSkinCare } from "@/app/context/SkinCareContext";
import { Droplets, Sun, Sparkles, ShieldAlert } from "lucide-react";

const questions = [
  {
    id: "skinType",
    question: "What best describes your skin type?",
    icon: Sparkles,
    options: [
      { label: "Normal", value: "normal" },
      { label: "Dry", value: "dry" },
      { label: "Oily", value: "oily" },
      { label: "Combination", value: "combination" },
      { label: "Sensitive", value: "sensitive" },
      { label: "Acne-prone", value: "acne-prone" },
      { label: "Dehydrated", value: "dehydrated" },
      { label: "Mature", value: "mature" },
    ],
  },
  {
    id: "afterCleansing",
    question: "How does your skin feel 30 minutes after cleansing?",
    icon: Droplets,
    options: [
      { label: "Tight or dry", value: "tight" },
      { label: "Comfortable", value: "comfortable" },
      { label: "Slightly oily", value: "slightly-oily" },
      { label: "Very oily", value: "very-oily" },
      { label: "Dry but still looks dull", value: "dry-dull" },
    ],
  },
  {
    id: "middayFeeling",
    question: "By midday, your skin is usually:",
    icon: Sun,
    options: [
      { label: "Flaky or dry", value: "flaky" },
      { label: "Balanced and comfortable", value: "balanced" },
      { label: "Shiny in the T-zone (forehead, nose, chin)", value: "shiny-tzone" },
      { label: "Shiny all over", value: "shiny-all" },
      { label: "Red or easily irritated", value: "red-irritated" },
    ],
  },
  {
    id: "productReaction",
    question: "How does your skin react to new skincare products?",
    icon: ShieldAlert,
    options: [
      { label: "Usually no reaction", value: "none" },
      { label: "Mild redness", value: "redness" },
      { label: "Breakouts or pimples", value: "breakout" },
      { label: "Burning or irritation", value: "irritation" },
      { label: "Feels dry or tight", value: "dry-tight" },
    ],
  },
  {
    id: "shineLevel",
    question: "How much shine do you notice most days?",
    icon: Sparkles,
    options: [
      { label: "Low (almost none)", value: "low" },
      { label: "Moderate (mainly in T-zone)", value: "medium" },
      { label: "High (shiny all over)", value: "high" },
      { label: "Changes depending on the day", value: "variable" },
    ],
  },
  {
    id: "breakoutFrequency",
    question: "How often do you experience breakouts?",
    icon: ShieldAlert,
    options: [
      { label: "Rarely or never", value: "rarely" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Often", value: "often" },
      { label: "Almost always", value: "always" },
    ],
  },
  {
    id: "skinTexture",
    question: "How would you describe your skin texture?",
    icon: Sparkles,
    options: [
      { label: "Smooth and even", value: "smooth-even" },
      { label: "Rough or flaky", value: "rough-flaky" },
      { label: "Oily and thick", value: "oily-thick" },
      { label: "Bumpy or acne-prone", value: "bumpy-acne-prone" },
      { label: "Thin with visible lines", value: "thin-lines" },
    ],
  },
  {
    id: "endOfDay",
    question: "How does your skin feel at the end of the day?",
    icon: Droplets,
    options: [
      { label: "Comfortable", value: "comfortable" },
      { label: "Dry or tight", value: "dry-tight" },
      { label: "Oily or greasy", value: "oily-greasy" },
      { label: "Irritated or sensitive", value: "irritated-sensitive" },
    ],
  },
];

export const QuestionnaireScreen = () => {
  const navigate = useNavigate();
  const { setQuestionnaireData } = useSkinCare();
  const [answers, setAnswers] = useState({
    skinType: "",
    afterCleansing: "",
    middayFeeling: "",
    productReaction: "",
    shineLevel: "",
    breakoutFrequency: "",
    skinTexture: "",
    endOfDay: "",
  });

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isComplete = Object.values(answers).every((answer) => answer !== "");

  const handleSubmit = () => {
    setQuestionnaireData(answers);
    navigate("/upload");
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
                      value={answers[q.id]}
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
