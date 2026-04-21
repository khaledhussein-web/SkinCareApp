import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { ProgressBar } from '@/app/components/ProgressBar';
import { useSkinCare } from '@/app/context/SkinCareContext';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  products?: Array<{ name: string; type: string }>;
}

const mockResponses = [
  {
    keywords: ['routine', 'steps', 'order'],
    response:
      "Based on your skin analysis, here's a recommended routine:\n\n1. **Morning:** Gentle cleanser → Lightweight moisturizer → SPF 30+ sunscreen\n2. **Evening:** Cleanser → Salicylic acid treatment → Hydrating moisturizer\n\nStart slowly and introduce new products one at a time!",
  },
  {
    keywords: ['product', 'recommend', 'suggestion'],
    response:
      "I'd recommend these products for your skin type:\n\n• **Cleanser:** CeraVe Foaming Facial Cleanser\n• **Treatment:** Paula's Choice 2% BHA Liquid Exfoliant\n• **Moisturizer:** Neutrogena Hydro Boost Gel-Cream\n• **Sunscreen:** La Roche-Posay Anthelios SPF 50",
    products: [
      { name: 'CeraVe Foaming Facial Cleanser', type: 'Cleanser' },
      { name: "Paula's Choice 2% BHA", type: 'Treatment' },
      { name: 'Neutrogena Hydro Boost', type: 'Moisturizer' },
      { name: 'La Roche-Posay Anthelios', type: 'Sunscreen' },
    ],
  },
  {
    keywords: ['acne', 'breakout', 'pimple'],
    response:
      "For mild acne, try these tips:\n\n• Use salicylic acid 2-3 times per week\n• Avoid touching your face\n• Change pillowcases regularly\n• Keep hair products away from your face\n• Stay hydrated and maintain a balanced diet\n\nIf breakouts persist, consider consulting a dermatologist.",
  },
  {
    keywords: ['dry', 'flaky', 'hydration'],
    response:
      "To combat dryness:\n\n• Use a gentle, creamy cleanser\n• Apply moisturizer on damp skin\n• Consider adding a hyaluronic acid serum\n• Use a humidifier at night\n• Avoid hot water when washing your face\n• Look for ingredients like ceramides and glycerin",
  },
];

export const ChatScreen: React.FC = () => {
  const { analysisResult } = useSkinCare();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello! I've reviewed your skin analysis. You have ${analysisResult?.skinType} skin with some areas that need attention. How can I help you today?`,
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getAIResponse = (userMessage: string): { text: string; products?: any[] } => {
    const lowerMessage = userMessage.toLowerCase();

    for (const mock of mockResponses) {
      if (mock.keywords.some((keyword) => lowerMessage.includes(keyword))) {
        return { text: mock.response, products: mock.products };
      }
    }

    return {
      text: "That's a great question! Based on your skin profile, I recommend focusing on gentle, consistent care. Would you like specific product recommendations or routine advice?",
    };
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const { text, products } = getAIResponse(inputValue);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text,
        sender: 'ai',
        timestamp: new Date(),
        products,
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 sm:py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl mb-2 sm:mb-3 text-slate-800">AI Skin Consultant</h1>
          <p className="text-sm sm:text-base text-slate-600">Get personalized advice and product recommendations</p>
        </div>

        <ProgressBar currentStep={4} totalSteps={4} />

        <Card className="border-none shadow-lg bg-white/90 backdrop-blur mb-4 sm:mb-6">
          <CardContent className="p-0">
            {/* Chat Messages */}
            <div className="h-[400px] sm:h-[500px] overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-2 sm:gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                        message.sender === 'ai'
                          ? 'bg-gradient-to-br from-purple-400 to-pink-400'
                          : 'bg-gradient-to-br from-blue-400 to-cyan-400'
                      }`}
                    >
                      {message.sender === 'ai' ? (
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      ) : (
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      )}
                    </div>
                    <div
                      className={`flex-1 max-w-[75%] sm:max-w-[70%] ${
                        message.sender === 'user' ? 'text-right' : ''
                      }`}
                    >
                      <div
                        className={`inline-block p-3 sm:p-4 rounded-2xl ${
                          message.sender === 'ai'
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        }`}
                      >
                        <p className="whitespace-pre-line text-sm sm:text-base">{message.text}</p>
                      </div>
                      {message.products && (
                        <div className="mt-2 sm:mt-3 space-y-2">
                          {message.products.map((product, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="inline-block mr-2 mb-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white rounded-lg shadow-sm border border-slate-200"
                            >
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" />
                                <div className="text-left">
                                  <p className="text-xs sm:text-sm text-slate-800">{product.name}</p>
                                  <p className="text-[10px] sm:text-xs text-slate-500">{product.type}</p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 sm:gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="bg-slate-100 p-3 sm:p-4 rounded-2xl">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-slate-400 rounded-full"
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-3 sm:p-4 bg-slate-50">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about products, routines, or concerns..."
                  className="flex-1 border-slate-300 focus:border-purple-400 rounded-full px-4 sm:px-6 text-sm sm:text-base"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-4 sm:px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-2 text-center">
                This is a demo AI assistant for educational purposes
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs sm:text-sm text-slate-600">
            For persistent skin concerns, please consult with a licensed dermatologist
          </p>
        </div>
      </motion.div>
    </div>
  );
};