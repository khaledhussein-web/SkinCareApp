import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ArrowDown, ArrowUp, Calendar, Camera, Eye, FileText, Minus, TrendingUp } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { fetchAssessmentHistory, fetchWeeklyProgress } from "@/app/services/skincareApi";
import { useSkinCare } from "@/app/context/SkinCareContext";

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
  const [weeklyWeeks, setWeeklyWeeks] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weeklyWarning, setWeeklyWarning] = useState("");

  useEffect(() => {
    // Fetch this authenticated user's history and weekly trend rollups.
    const loadHistory = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError("");
      setWeeklyWarning("");
      try {
        const [historyResult, weeklyResult] = await Promise.allSettled([
          fetchAssessmentHistory(),
          fetchWeeklyProgress(),
        ]);

        if (historyResult.status !== "fulfilled") {
          throw historyResult.reason;
        }

        setAssessments(historyResult.value?.history || []);

        if (weeklyResult.status === "fulfilled") {
          setWeeklyWeeks(weeklyResult.value?.weeks || []);
          setWeeklySummary(weeklyResult.value?.summary || null);
        } else {
          setWeeklyWeeks([]);
          setWeeklySummary(null);
          setWeeklyWarning("Weekly trend is temporarily unavailable. Your assessment history is still available.");
        }
      } catch (historyError) {
        setError(historyError instanceof Error ? historyError.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user?.id]);

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getTrendMeta = (status) => {
    if (status === "improved") {
      return {
        label: "Improved",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: ArrowUp,
      };
    }
    if (status === "worse") {
      return {
        label: "Worse",
        className: "bg-rose-50 text-rose-700 border-rose-200",
        icon: ArrowDown,
      };
    }
    if (status === "no_change") {
      return {
        label: "No Change",
        className: "bg-slate-50 text-slate-700 border-slate-200",
        icon: Minus,
      };
    }
    return {
      label: "Baseline",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      icon: Calendar,
    };
  };

  const progressStats = useMemo(() => {
    if (weeklySummary?.totalWeeksTracked) {
      return {
        latestScore: Number(weeklySummary.latestScore || 0),
        improvement: Number(weeklySummary.scoreChangeFromLastWeek || 0),
        totalWeeks: Number(weeklySummary.totalWeeksTracked || 0),
        currentStreakWeeks: Number(weeklySummary.currentStreakWeeks || 0),
      };
    }

    if (assessments.length === 0) {
      return { latestScore: 0, improvement: 0, totalWeeks: 0, currentStreakWeeks: 0 };
    }

    const latestScore = Number(assessments[0]?.score || 0);
    const oldestScore = Number(assessments[assessments.length - 1]?.score || 0);
    return {
      latestScore,
      improvement: latestScore - oldestScore,
      totalWeeks: assessments.length,
      currentStreakWeeks: assessments.length > 0 ? 1 : 0,
    };
  }, [assessments, weeklySummary]);

  const openAssessment = (assessment) => {
    // Rehydrate one historical result into context and open details.
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
          <p className="text-slate-600">Track your week-by-week skincare progress</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6" />
                  <h2 className="text-2xl">Weekly Progress</h2>
                </div>
                <Button
                  onClick={() => navigate("/upload")}
                  className="bg-white text-purple-700 hover:bg-white/90 rounded-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Upload This Week Photo
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-white/80 text-sm mb-1">Latest Score</p>
                  <p className="text-4xl">{progressStats.latestScore}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Week-over-Week</p>
                  <p className="text-4xl">
                    {progressStats.improvement >= 0 ? `+${progressStats.improvement}` : progressStats.improvement}
                  </p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Weeks Tracked</p>
                  <p className="text-4xl">{progressStats.totalWeeks}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Current Streak</p>
                  <p className="text-4xl">{progressStats.currentStreakWeeks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {loading && <p className="text-slate-600">Loading history...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && weeklyWarning ? <p className="text-amber-700 mb-4">{weeklyWarning}</p> : null}

        {!loading && !error && (
          <div className="space-y-8">
            <section>
              <h2 className="text-xl text-slate-800 mb-4">Weekly Check-ins</h2>
              {weeklyWeeks.length > 0 ? (
                <div className="space-y-3">
                  {weeklyWeeks.map((week, index) => {
                    const trend = getTrendMeta(week.progress?.status);
                    const TrendIcon = trend.icon;
                    const scoreChange = week.progress?.scoreChange;
                    const burdenChange = week.progress?.conditionBurdenChange;
                    return (
                      <motion.div
                        key={week.weekStart}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + index * 0.04 }}
                      >
                        <Card className="border-none shadow-md bg-white/90 backdrop-blur">
                          <CardContent className="p-5">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-slate-500" />
                                  <p className="text-sm text-slate-700">
                                    Week {formatDate(week.weekStart)} - {formatDate(week.weekEnd)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className={trend.className}>
                                    <TrendIcon className="w-3.5 h-3.5 mr-1" />
                                    {trend.label}
                                  </Badge>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {week.skinType || "Unknown"}
                                  </Badge>
                                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                                    {week.assessmentCount} assessment{week.assessmentCount !== 1 ? "s" : ""}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600">
                                  {scoreChange === null
                                    ? "This is your baseline week for tracking."
                                    : `Score ${scoreChange >= 0 ? `+${scoreChange}` : scoreChange} vs previous week, concern burden ${
                                        burdenChange > 0 ? `+${burdenChange}` : burdenChange
                                      }.`}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`px-4 py-2 rounded-lg ${getScoreColor(week.score)}`}>
                                  <p className="text-2xl">{week.score}</p>
                                  <p className="text-xs">Score</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={() => {
                                    const found = assessments.find((item) => item.id === week.assessmentId);
                                    if (found) openAssessment(found);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-none shadow-md bg-white/90 backdrop-blur">
                  <CardContent className="p-8 text-center">
                    <p className="text-slate-600 mb-4">No weekly check-ins yet.</p>
                    <Button
                      onClick={() => navigate("/upload")}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full"
                    >
                      Upload Your First Weekly Photo
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>

            <section>
              <h2 className="text-xl text-slate-800 mb-4">All Assessments</h2>
              <div className="space-y-4">
                {assessments.map((assessment, index) => (
                  <motion.div
                    key={assessment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.03 }}
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
                              {(assessment.conditions || []).map((condition, idx) => (
                                <Badge
                                  key={`${assessment.id}-${idx}`}
                                  variant="outline"
                                  className="bg-orange-50 text-orange-700 border-orange-200"
                                >
                                  {condition.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`px-4 py-2 rounded-lg ${getScoreColor(assessment.score)}`}>
                              <p className="text-2xl">{assessment.score}</p>
                              <p className="text-xs">Score</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => openAssessment(assessment)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                {assessments.length === 0 && (
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
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
