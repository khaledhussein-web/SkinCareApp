import React, { useState } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function ProgressAnalysisCard({ analysis }) {
  const [expanded, setExpanded] = useState(true);
  const aiSummary = analysis?.aiSummary || "Progress report generated.";
  const report = analysis?.report || "No detailed report available.";

  const handleDownload = () => {
    const file = new Blob([report], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = `progress-report-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4">
        <h3 className="text-base sm:text-lg text-slate-800 mb-2">AI Summary</h3>
        <p className="text-sm sm:text-base text-slate-700">{aiSummary}</p>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="w-full flex items-center justify-between bg-white px-4 py-3 text-left hover:bg-slate-50 transition"
        >
          <span className="text-slate-800">Detailed Progress Report</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>
        {expanded ? (
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs sm:text-sm text-slate-700 font-mono">
              {report}
            </pre>
            <Button
              type="button"
              onClick={handleDownload}
              className="mt-4 w-full rounded-full bg-purple-600 hover:bg-purple-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
