import React, { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { fetchAssessmentsWithImages } from "@/app/services/skincareApi";

const MIN_COMPARISON_DAYS = 5;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calculateDayDifference(startDateValue, endDateValue) {
  const startDate = new Date(startDateValue);
  const endDate = new Date(endDateValue);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const startUtcMidnight = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const endUtcMidnight = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

  return Math.floor((endUtcMidnight - startUtcMidnight) / MS_PER_DAY);
}

export default function DateSelector({ onSelectionChange, onCompare, loadingCompare = false }) {
  const [assessments, setAssessments] = useState([]);
  const [legacyCount, setLegacyCount] = useState(0);
  const [selectedAssessment1, setSelectedAssessment1] = useState(null);
  const [selectedAssessment2, setSelectedAssessment2] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAssessments = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await fetchAssessmentsWithImages();
        const loaded = Array.isArray(result?.assessments) ? result.assessments : [];
        setAssessments(loaded);
        setLegacyCount(Number(result?.legacyCount || 0));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load saved photos");
      } finally {
        setLoading(false);
      }
    };

    loadAssessments();
  }, []);

  useEffect(() => {
    onSelectionChange?.(selectedAssessment1, selectedAssessment2);
  }, [onSelectionChange, selectedAssessment1, selectedAssessment2]);

  const selectedFirst = useMemo(
    () => assessments.find((assessment) => String(assessment.id) === String(selectedAssessment1)),
    [assessments, selectedAssessment1],
  );
  const selectedSecond = useMemo(
    () => assessments.find((assessment) => String(assessment.id) === String(selectedAssessment2)),
    [assessments, selectedAssessment2],
  );

  const selectedGapDays = useMemo(() => {
    if (!selectedFirst || !selectedSecond) return null;
    return calculateDayDifference(selectedFirst.date, selectedSecond.date);
  }, [selectedFirst, selectedSecond]);

  useEffect(() => {
    if (!selectedFirst || !selectedSecond) return;
    if (selectedGapDays === null || selectedGapDays < MIN_COMPARISON_DAYS) {
      setSelectedAssessment2(null);
    }
  }, [selectedFirst, selectedSecond, selectedGapDays]);

  const canCompare = Boolean(
    selectedFirst &&
      selectedSecond &&
      selectedFirst.id !== selectedSecond.id &&
      selectedGapDays !== null &&
      selectedGapDays >= MIN_COMPARISON_DAYS,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-600">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading saved photo assessments...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (assessments.length < 2) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          {legacyCount > 0
            ? `You have ${legacyCount} older photo assessment${legacyCount === 1 ? "" : "s"} saved in a legacy format that can no longer be displayed. Please create at least two new photo assessments to compare progress.`
            : "You need at least two assessments with photos before you can compare progress."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg text-slate-800">Step 1: Select the earlier photo</h3>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {assessments.map((assessment) => {
              const isSelected = String(selectedAssessment1) === String(assessment.id);
              return (
                <button
                  key={`first-${assessment.id}`}
                  type="button"
                  onClick={() => setSelectedAssessment1(assessment.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 bg-white hover:border-purple-300"
                  }`}
                >
                  <p className="text-slate-800">{formatDate(assessment.date)}</p>
                  <p className="text-sm text-slate-600">Score: {assessment.score}</p>
                  <p className="text-xs text-slate-500">Skin type: {assessment.skinType || "Unknown"}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg text-slate-800">Step 2: Select the later photo</h3>
          <p className="text-sm text-slate-600">Choose a photo at least {MIN_COMPARISON_DAYS} days after Step 1.</p>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {assessments.map((assessment) => {
              const dayGapFromFirst = selectedFirst ? calculateDayDifference(selectedFirst.date, assessment.date) : null;
              const isSameAssessment = String(selectedAssessment1) === String(assessment.id);
              const isTooSoon = selectedFirst && (dayGapFromFirst === null || dayGapFromFirst < MIN_COMPARISON_DAYS);
              const isDisabled = !selectedFirst || isSameAssessment || isTooSoon;
              const isSelected = String(selectedAssessment2) === String(assessment.id);
              return (
                <button
                  key={`second-${assessment.id}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setSelectedAssessment2(assessment.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? "border-purple-500 bg-purple-50"
                      : isDisabled
                        ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                        : "border-slate-200 bg-white hover:border-purple-300"
                  }`}
                >
                  <p className="text-slate-800">{formatDate(assessment.date)}</p>
                  <p className="text-sm text-slate-600">Score: {assessment.score}</p>
                  <p className="text-xs text-slate-500">Skin type: {assessment.skinType || "Unknown"}</p>
                  {selectedFirst && isTooSoon ? (
                    <p className="text-xs text-amber-700 mt-1">Need at least {MIN_COMPARISON_DAYS} days after Step 1</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {canCompare ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm">
              Ready to compare {formatDate(selectedFirst.date)} vs {formatDate(selectedSecond.date)} ({selectedGapDays} days apart).
            </p>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={onCompare}
        disabled={!canCompare || loadingCompare}
        className="w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
      >
        {loadingCompare ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Comparing Photos...
          </>
        ) : (
          "Compare Progress"
        )}
      </Button>
    </div>
  );
}
