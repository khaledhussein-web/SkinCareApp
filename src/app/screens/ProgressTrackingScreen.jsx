import React, { useState } from "react";
import { AlertCircle, MessageCircle } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { compareProgressPhotos } from "@/app/services/skincareApi";
import DateSelector from "@/app/components/DateSelector";
import BeforeAfterSlider from "@/app/components/BeforeAfterSlider";
import ProgressAnalysisCard from "@/app/components/ProgressAnalysisCard";
import ComparisonMetrics from "@/app/components/ComparisonMetrics";
import ProgressChatPanel from "@/app/components/ProgressChatPanel";

export default function ProgressTrackingScreen() {
  const { isAuthenticated } = useAuth();
  const [assessmentId1, setAssessmentId1] = useState(null);
  const [assessmentId2, setAssessmentId2] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showChat, setShowChat] = useState(false);

  const handleCompare = async () => {
    if (!assessmentId1 || !assessmentId2) {
      setError("Please select two photo assessments first.");
      return;
    }
    if (String(assessmentId1) === String(assessmentId2)) {
      setError("Please choose two different assessments.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await compareProgressPhotos(assessmentId1, assessmentId2);
      setComparisonData(result);
      setShowChat(false);
    } catch (compareError) {
      setError(compareError instanceof Error ? compareError.message : "Failed to compare progress photos");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setComparisonData(null);
    setAssessmentId1(null);
    setAssessmentId2(null);
    setShowChat(false);
    setError("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert className="max-w-lg">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>Please sign in to use photo comparison progress tracking.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl text-slate-800 mb-2">Photo Comparison Progress</h1>
          <p className="text-slate-600">Pick two saved assessments and compare your skin changes with FastAPI AI analysis.</p>
        </div>

        {!comparisonData ? (
          <Card className="border-none shadow-lg bg-white/90 backdrop-blur p-5 sm:p-7">
            <DateSelector
              loadingCompare={loading}
              onSelectionChange={(id1, id2) => {
                setAssessmentId1(id1);
                setAssessmentId2(id2);
              }}
              onCompare={handleCompare}
            />
            {error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <Card className="border-none shadow-md bg-white/95">
                <BeforeAfterSlider comparison={comparisonData} />
              </Card>
              <Card className="border-none shadow-md bg-white/95">
                <ComparisonMetrics metrics={comparisonData.metrics} />
              </Card>
              <Card className="border-none shadow-md bg-white/95">
                <ProgressAnalysisCard analysis={comparisonData.analysis} />
              </Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="rounded-full" onClick={handleReset}>
                  Compare Different Photos
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => setShowChat((value) => !value)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {showChat ? "Hide Progress Chat" : "Ask About This Progress"}
                </Button>
              </div>
            </div>

            <div className="xl:col-span-1">
              {showChat ? <ProgressChatPanel comparisonData={comparisonData} onClose={() => setShowChat(false)} /> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
