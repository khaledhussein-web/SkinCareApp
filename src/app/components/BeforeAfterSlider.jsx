import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/app/services/api";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolveComparisonImageSrc(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  if (value.startsWith("data:image/")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return value;
}

export default function BeforeAfterSlider({ comparison }) {
  const [sliderPercent, setSliderPercent] = useState(50);
  const [beforeLoadFailed, setBeforeLoadFailed] = useState(false);
  const [afterLoadFailed, setAfterLoadFailed] = useState(false);
  const containerRef = useRef(null);

  const image1 = comparison?.comparison?.image1 || "";
  const image2 = comparison?.comparison?.image2 || "";
  const beforeImageSrc = resolveComparisonImageSrc(image1);
  const afterImageSrc = resolveComparisonImageSrc(image2);
  const date1 = comparison?.comparison?.date1;
  const date2 = comparison?.comparison?.date2;

  useEffect(() => {
    setBeforeLoadFailed(false);
  }, [beforeImageSrc]);

  useEffect(() => {
    setAfterLoadFailed(false);
  }, [afterImageSrc]);

  const datesLabel = useMemo(() => {
    if (!date1 || !date2) return "";
    return `${formatDate(date1)} vs ${formatDate(date2)}`;
  }, [date1, date2]);

  const updateFromPointer = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setSliderPercent(Math.max(0, Math.min(100, next)));
  };

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX);
  };

  const handlePointerMove = (event) => {
    if (event.buttons === 0) return;
    updateFromPointer(event.clientX);
  };

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl text-slate-800">Before and After Photos</h2>
        <p className="text-sm text-slate-600">Drag the center handle to compare changes over time.</p>
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3] select-none touch-none"
      >
        {beforeImageSrc && !beforeLoadFailed ? (
          <img
            src={beforeImageSrc}
            alt="Before skin assessment"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setBeforeLoadFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            Before photo unavailable
          </div>
        )}

        {afterImageSrc && !afterLoadFailed ? (
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPercent}%` }}>
            <img
              src={afterImageSrc}
              alt="After skin assessment"
              className="h-full w-full object-cover"
              onError={() => setAfterLoadFailed(true)}
            />
          </div>
        ) : null}

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.3)]"
          style={{ left: `${sliderPercent}%` }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-1 text-xs text-slate-700 shadow">
            <>
              {"< >"}
            </>
          </div>
        </div>

        <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
          Before: {date1 ? formatDate(date1) : "N/A"}
        </div>
        <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
          After: {date2 ? formatDate(date2) : "N/A"}
        </div>
      </div>

      {datesLabel ? (
        <p className="mt-3 text-center text-sm text-slate-600">
          {datesLabel} | Slider: {Math.round(sliderPercent)}%
        </p>
      ) : null}
    </div>
  );
}
