import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Mail, RefreshCw, Clock3, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminSupportMessages, updateAdminSupportMessage } from "@/app/services/skincareApi";

export const AdminSupportScreen = () => {
  const [filterStatus, setFilterStatus] = useState("all");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async (status = filterStatus) => {
    setLoading(true);
    try {
      const data = await fetchAdminSupportMessages({ status, limit: 150 });
      setMessages(data.messages || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load support messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages(filterStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const totals = useMemo(() => {
    return messages.reduce(
      (acc, message) => {
        const status = String(message.status || "open").toLowerCase();
        acc.total += 1;
        if (status === "resolved") acc.resolved += 1;
        else if (status === "in_progress") acc.inProgress += 1;
        else acc.open += 1;
        return acc;
      },
      { total: 0, open: 0, inProgress: 0, resolved: 0 },
    );
  }, [messages]);

  const getStatusBadgeClasses = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "resolved") return "bg-green-100 text-green-700 border-green-200";
    if (normalized === "in_progress") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const handleStatusUpdate = async (messageId, status) => {
    try {
      await updateAdminSupportMessage(messageId, { status });
      setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, status } : message)));
      toast.success("Support message updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update support message");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl text-slate-800">Support Messages</h2>
          <p className="text-sm text-slate-600">Review and resolve incoming contact requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => loadMessages(filterStatus)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: totals.total, className: "text-slate-800" },
          { label: "Open", value: totals.open, className: "text-blue-700" },
          { label: "In Progress", value: totals.inProgress, className: "text-amber-700" },
          { label: "Resolved", value: totals.resolved, className: "text-green-700" },
        ].map((stat) => (
          <Card key={stat.label} className="border-none shadow-md bg-white/90 backdrop-blur">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">{stat.label}</p>
              <p className={`text-2xl ${stat.className}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-md bg-white/90 backdrop-blur">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-slate-600">Loading support messages...</p>
          ) : messages.length === 0 ? (
            <p className="p-6 text-sm text-slate-600">No support messages for this filter.</p>
          ) : (
            <div className="divide-y">
              {messages.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.25) }}
                  className="p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <p className="text-sm text-slate-800">{item.subject}</p>
                        <Badge variant="outline" className={getStatusBadgeClasses(item.status)}>
                          {String(item.status || "open").replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{item.message}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>{item.name}</span>
                        <span>{item.email}</span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(item.id, "in_progress")}
                        disabled={item.status === "in_progress"}
                      >
                        <Clock3 className="w-4 h-4 mr-2" />
                        In Progress
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(item.id, "resolved")}
                        disabled={item.status === "resolved"}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Resolve
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

