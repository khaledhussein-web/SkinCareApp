import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

function MetricPill({ title, value, className }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${className}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{title}</p>
      <p className="text-lg">{value}</p>
    </div>
  );
}

function formatConditionList(conditions) {
  if (!Array.isArray(conditions) || conditions.length === 0) return "None";
  return conditions.map((condition) => condition.name).join(", ");
}

export default function ComparisonMetrics({ metrics }) {
  if (!metrics) {
    return (
      <div className="p-6">
        <p className="text-slate-600">No metrics available yet.</p>
      </div>
    );
  }

  const delta = Number(metrics.scoreDelta || 0);
  const percent = metrics.percentChange;
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <h3 className="text-xl text-slate-800">Comparison Metrics</h3>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-slate-800">
          {isPositive ? (
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
          ) : isNegative ? (
            <ArrowDownRight className="w-5 h-5 text-rose-600" />
          ) : (
            <Minus className="w-5 h-5 text-slate-500" />
          )}
          <p className="text-lg">
            Score Delta: {delta > 0 ? `+${delta}` : delta}
            {percent === null ? "" : ` (${percent > 0 ? "+" : ""}${percent}%)`}
          </p>
        </div>
        <p className="mt-1 text-sm text-slate-600">Overall Progress: {metrics.overallProgressPercent}%</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricPill
          title="Improved"
          value={metrics.conditionsImproved?.length || 0}
          className="border-emerald-200 bg-emerald-50 text-emerald-700"
        />
        <MetricPill
          title="Worsened"
          value={metrics.conditionsWorsened?.length || 0}
          className="border-rose-200 bg-rose-50 text-rose-700"
        />
        <MetricPill
          title="New"
          value={metrics.newConditions?.length || 0}
          className="border-amber-200 bg-amber-50 text-amber-700"
        />
        <MetricPill
          title="Resolved"
          value={metrics.resolvedConditions?.length || 0}
          className="border-sky-200 bg-sky-50 text-sky-700"
        />
        <MetricPill
          title="Unchanged"
          value={metrics.unchangedConditions?.length || 0}
          className="border-slate-200 bg-slate-50 text-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-emerald-800">Improved Conditions</p>
          <p className="text-emerald-700">{formatConditionList(metrics.conditionsImproved)}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-rose-800">Worsened Conditions</p>
          <p className="text-rose-700">{formatConditionList(metrics.conditionsWorsened)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-amber-800">New Conditions</p>
          <p className="text-amber-700">{formatConditionList(metrics.newConditions)}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-sky-800">Resolved Conditions</p>
          <p className="text-sky-700">{formatConditionList(metrics.resolvedConditions)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
          <p className="text-slate-800">Unchanged Conditions</p>
          <p className="text-slate-700">{formatConditionList(metrics.unchangedConditions)}</p>
        </div>
      </div>
    </div>
  );
}
