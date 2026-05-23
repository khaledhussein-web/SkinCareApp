import React, { useMemo, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { sendChatMessage } from "@/app/services/skincareApi";

function buildComparisonContext(comparisonData) {
  const comparison = comparisonData?.comparison || {};
  const metrics = comparisonData?.metrics || {};
  return [
    "Progress comparison context:",
    `- Date 1: ${comparison.date1 || "N/A"}, score: ${comparison.score1 ?? "N/A"}`,
    `- Date 2: ${comparison.date2 || "N/A"}, score: ${comparison.score2 ?? "N/A"}`,
    `- Score delta: ${metrics.scoreDelta ?? "N/A"}`,
    `- Percent change: ${metrics.percentChange ?? "N/A"}`,
    `- Improved conditions: ${(metrics.conditionsImproved || []).map((item) => item.name).join(", ") || "none"}`,
    `- Worsened conditions: ${(metrics.conditionsWorsened || []).map((item) => item.name).join(", ") || "none"}`,
    `- New conditions: ${(metrics.newConditions || []).map((item) => item.name).join(", ") || "none"}`,
    `- Resolved conditions: ${(metrics.resolvedConditions || []).map((item) => item.name).join(", ") || "none"}`,
  ].join("\n");
}

export default function ProgressChatPanel({ comparisonData, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState(null);

  const contextPrompt = useMemo(() => buildComparisonContext(comparisonData), [comparisonData]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError("");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);

    const prompt = `${contextPrompt}\n\nUser question about progress:\n${trimmed}`;

    try {
      const response = await sendChatMessage({
        conversationId,
        message: prompt,
      });
      if (response?.conversationId) {
        setConversationId(response.conversationId);
      }
      const aiText = response?.aiMessage?.message_text || "I could not generate a progress answer right now.";
      setMessages((prev) => [...prev, { role: "ai", text: aiText }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send progress question");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-slate-800">Ask About This Progress</h3>
        <Button type="button" size="icon" variant="ghost" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="h-[360px] overflow-y-auto space-y-3 p-4 bg-slate-50">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-600">
            Ask for routine changes, likely causes, or what to focus on before your next photo.
          </p>
        ) : null}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
              message.role === "user"
                ? "bg-purple-600 text-white ml-8"
                : "bg-white border border-slate-200 text-slate-700 mr-8"
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-3">
        {error ? <p className="mb-2 text-xs text-rose-600">{error}</p> : null}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up about your progress..."
            disabled={isSending}
          />
          <Button type="button" onClick={handleSend} disabled={isSending || !input.trim()}>
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
