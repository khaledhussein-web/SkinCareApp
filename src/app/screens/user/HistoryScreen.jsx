import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Calendar, Eye, FileText, Sparkles } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useSkinCare } from "@/app/context/SkinCareContext";
import { fetchAssessmentHistory } from "@/app/services/skincareApi";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const HistoryScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setAnalysisResult, setLatestAssessmentId } = useSkinCare();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError("");
      try {
        const result = await fetchAssessmentHistory();
        setAssessments(result?.history || []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load assessment history");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user?.id]);

  const progressStats = useMemo(() => {
    if (assessments.length === 0) {
      return { latestScore: 0, scoreDelta: 0, assessmentsTracked: 0 };
    }
    const latestScore = Number(assessments[0]?.score || 0);
    const earliestScore = Number(assessments[assessments.length - 1]?.score || 0);
    return {
      latestScore,
      scoreDelta: latestScore - earliestScore,
      assessmentsTracked: assessments.length,
    };
  }, [assessments]);

  const getScoreClass = (score) => {
    if (score >= 80) return "bg-emerald-50 text-emerald-700";
    if (score >= 60) return "bg-amber-50 text-amber-700";
    return "bg-rose-50 text-rose-700";
  };

  const openAssessment = (assessment) => {
    setLatestAssessmentId(assessment.id);
    setAnalysisResult({
      skinType: assessment.skinType,
      score: assessment.score,
      conditions: assessment.conditions || [],
      recommendations: assessment.recommendations || [],
    });
    navigate("/results");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl mb-2 text-slate-800">Assessment History</h1>
          <p className="text-slate-600">Review previous assessments and compare progress using photos.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="text-2xl">Progress Snapshot</h2>
                </div>
                <Button onClick={() => navigate("/progress-tracking")} className="bg-white text-purple-700 hover:bg-white/90 rounded-full">
                  Track progress with photo comparison
                </Button>
              </div>
              <div className="grid sm:grid-cols-3 gap-5">
                <div>
                  <p className="text-white/80 text-sm mb-1">Health Score</p>
                  <p className="text-4xl">{progressStats.latestScore}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Score Delta</p>
                  <p className="text-4xl">{progressStats.scoreDelta > 0 ? `+${progressStats.scoreDelta}` : progressStats.scoreDelta}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Assessments</p>
                  <p className="text-4xl">{progressStats.assessmentsTracked}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {loading ? <p className="text-slate-600">Loading history...</p> : null}
        {error ? <p className="text-rose-600">{error}</p> : null}

        {!loading && !error ? (
          <section>
            <h2 className="text-xl text-slate-800 mb-4">All Assessments</h2>
            <div className="space-y-4">
              {assessments.map((assessment, index) => (
                <motion.div
                  key={assessment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.03 }}
                >
                  <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-white/90 backdrop-blur">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600">{formatDate(assessment.date)}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {assessment.skinType || "Unknown"}
                            </Badge>
                            {(assessment.conditions || []).map((condition, conditionIndex) => (
                              <Badge
                                key={`${assessment.id}-${conditionIndex}`}
                                variant="outline"
                                className="bg-orange-50 text-orange-700 border-orange-200"
                              >
                                {condition.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`px-4 py-2 rounded-lg ${getScoreClass(assessment.score)}`}>
                            <p className="text-2xl">{assessment.score}</p>
                            <p className="text-xs">Score</p>
                          </div>
                          <Button variant="outline" size="sm" className="rounded-full" onClick={() => openAssessment(assessment)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {assessments.length === 0 ? (
                <Card className="border-none shadow-md bg-white/90 backdrop-blur">
                  <CardContent className="p-8 text-center">
                    <p className="text-slate-600 mb-4">No assessments yet.</p>
                    <Button
                      onClick={() => navigate("/questionnaire")}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full"
                    >
                      Start Your First Assessment
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};
