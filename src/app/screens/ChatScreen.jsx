import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ProgressBar } from "@/app/components/ProgressBar";
import { useSkinCare } from "@/app/context/SkinCareContext";
import { useAuth } from "@/app/context/AuthContext";
import { fetchChatContext, fetchChatMessages, sendChatMessage } from "@/app/services/skincareApi";
import { Send, Bot, User } from "lucide-react";

export const ChatScreen = () => {
  const {
    analysisResult,
    chatConversationId,
    setChatConversationId,
    forceNewChatSession,
    setForceNewChatSession,
  } = useSkinCare();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(true);
  const [assessmentContext, setAssessmentContext] = useState(null);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    // Keep newest messages visible after each update.
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const loadAssessmentContext = async () => {
      if (!user?.id) return;
      setContextLoading(true);
      try {
        const response = await fetchChatContext();
        setAssessmentContext(response.assessmentContext || null);
      } catch (_loadError) {
        setAssessmentContext(null);
      } finally {
        setContextLoading(false);
      }
    };

    loadAssessmentContext();
  }, [user?.id]);

  useEffect(() => {
    // Load latest or selected conversation for the authenticated user.
    const loadMessages = async () => {
      if (!user?.id) return;
      if (!chatConversationId && forceNewChatSession) {
        // New assessment should start with a fresh empty chat session.
        setMessages([]);
        setError("");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await fetchChatMessages(chatConversationId);
        if (response.conversationId) {
          setChatConversationId(response.conversationId);
        }
        const mapped = response.messages.map((message) => ({
          id: message.message_id,
          text: message.message_text,
          sender: String(message.sender_type || "").toLowerCase() === "ai" ? "ai" : "user",
          timestamp: new Date(message.created_at),
        }));
        setMessages(mapped);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load conversation");
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [chatConversationId, forceNewChatSession, setChatConversationId, user?.id]);

  const handleSend = async () => {
    // Send message to backend and append both user + AI messages from response.
    if (!inputValue.trim() || !user?.id) return;

    const pendingMessage = inputValue.trim();
    setInputValue("");
    setIsTyping(true);
    setError("");

    try {
      const response = await sendChatMessage({
        conversationId: chatConversationId,
        message: pendingMessage,
      });

      if (response.conversationId) {
        setChatConversationId(response.conversationId);
        if (forceNewChatSession) {
          setForceNewChatSession(false);
        }
      }
      if (response.assessmentContext) {
        setAssessmentContext(response.assessmentContext);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: response.userMessage.message_id,
          text: response.userMessage.message_text,
          sender: "user",
          timestamp: new Date(response.userMessage.created_at),
        },
        {
          id: response.aiMessage.message_id,
          text: response.aiMessage.message_text,
          sender: "ai",
          timestamp: new Date(response.aiMessage.created_at),
        },
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    // Submit on Enter, allow Shift+Enter for multiline behavior.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showWelcomeHint = !loading && messages.length === 0 && !error;
  const contextSkinType = assessmentContext?.skinType || analysisResult?.skinType || null;
  const contextConditions = Array.isArray(assessmentContext?.conditions) ? assessmentContext.conditions : [];
  const contextRecommendations = Array.isArray(assessmentContext?.recommendations)
    ? assessmentContext.recommendations
    : [];

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
          <p className="text-sm sm:text-base text-slate-600">
            Get personalized advice and product recommendations
          </p>
        </div>

        <ProgressBar currentStep={4} totalSteps={4} />

        <Card className="border-none shadow-md bg-white/90 backdrop-blur mb-4 sm:mb-6">
          <CardContent className="p-4 sm:p-5">
            {contextLoading ? (
              <p className="text-sm text-slate-500">Loading latest assessment context...</p>
            ) : assessmentContext ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Skin Type: {assessmentContext.skinType || "Unknown"}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Score:{" "}
                    {assessmentContext.score === null || assessmentContext.score === undefined
                      ? "N/A"
                      : assessmentContext.score}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Recommendations: {contextRecommendations.length}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700">
                  <strong>Prediction:</strong>{" "}
                  {assessmentContext?.imageAnalysis?.summary || "No image prediction summary available yet."}
                </p>
                <p className="text-sm text-slate-700">
                  <strong>Detected Conditions:</strong>{" "}
                  {contextConditions.length > 0
                    ? contextConditions
                        .slice(0, 3)
                        .map((item) => `${item.name} (${item.severity})`)
                        .join(", ")
                    : "None detected"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No assessment context found yet. Complete an analysis to unlock fully personalized chat guidance.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/90 backdrop-blur mb-4 sm:mb-6">
          <CardContent className="p-0">
            <div className="h-[400px] sm:h-[500px] overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
              {loading && (
                <p className="text-sm text-slate-500 text-center">Loading conversation...</p>
              )}
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              {showWelcomeHint && (
                <p className="text-sm text-slate-600 text-center">
                  Ask your first question.{" "}
                  {contextSkinType
                    ? `I can tailor guidance for ${contextSkinType} skin.`
                    : "I can help with routines, products, and skin concerns."}
                </p>
              )}

              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-2 sm:gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                        message.sender === "ai"
                          ? "bg-gradient-to-br from-purple-400 to-pink-400"
                          : "bg-gradient-to-br from-blue-400 to-cyan-400"
                      }`}
                    >
                      {message.sender === "ai" ? (
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      ) : (
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      )}
                    </div>
                    <div
                      className={`flex-1 max-w-[75%] sm:max-w-[70%] ${
                        message.sender === "user" ? "text-right" : ""
                      }`}
                    >
                      <div
                        className={`inline-block p-3 sm:p-4 rounded-2xl ${
                          message.sender === "ai"
                            ? "bg-slate-100 text-slate-800"
                            : "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                        }`}
                      >
                        <p className="whitespace-pre-line text-sm sm:text-base">{message.text}</p>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 sm:gap-3">
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
                  disabled={!inputValue.trim() || isTyping || loading || contextLoading}
                  className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-4 sm:px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
