import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";
import { FileText, Download, Calendar, Filter } from "lucide-react";
import { toast } from "sonner";
import { fetchReportsList, fetchRecentReports, generateReport, exportReport } from "@/app/services/skincareApi";

export const AdminReportsScreen = () => {
  const [selectedReport, setSelectedReport] = useState("");
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-12-31");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [reports, setReports] = useState([]);
  const [recentExports, setRecentExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadReports = async () => {
    // Load report templates and recent exports for the admin reports view.
    setLoading(true);
    try {
      const [reportsResult, recentResult] = await Promise.all([
        fetchReportsList(),
        fetchRecentReports(),
      ]);
      setReports(reportsResult.reports || []);
      setRecentExports(recentResult.recent || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const quickStats = useMemo(() => {
    // Compute top-line stats shown above the reports table.
    const totalRecords = reports.reduce((sum, report) => sum + Number(report.records || 0), 0);
    return [
      { label: "Reports Available", value: reports.length.toString(), color: "text-blue-600" },
      {
        label: "Last Export",
        value:
          recentExports.length > 0
            ? new Date(recentExports[0].date).toLocaleString()
            : "No exports yet",
        color: "text-purple-600",
      },
      { label: "Total Records", value: totalRecords.toLocaleString(), color: "text-green-600" },
    ];
  }, [reports, recentExports]);

  const handleGenerateReport = async () => {
    // Create report entry on backend with current filters.
    if (!selectedReport) {
      toast.error("Please select a report type");
      return;
    }
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      toast.error("Date From cannot be later than Date To");
      return;
    }
    setIsGenerating(true);
    try {
      await generateReport({
        reportType: selectedReport,
        dateFrom,
        dateTo,
        format: exportFormat,
      });

      const { blob, fileName } = await exportReport({
        reportType: selectedReport,
        dateFrom,
        dateTo,
        format: exportFormat,
        audit: false,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(`Report generated and downloaded (${exportFormat.toUpperCase()})`);
      await loadReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportReport = async () => {
    if (!selectedReport) {
      toast.error("Please select a report first");
      return;
    }
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      toast.error("Date From cannot be later than Date To");
      return;
    }
    setIsExporting(true);
    try {
      const { blob, fileName } = await exportReport({
        reportType: selectedReport,
        dateFrom,
        dateTo,
        format: exportFormat,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(`Export downloaded (${exportFormat.toUpperCase()})`);
      await loadReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl text-slate-800">Reports & Analytics</h2>
          <p className="text-sm text-slate-600">Generate and export detailed reports</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {quickStats.map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-none shadow-md bg-white/90 backdrop-blur">
              <CardContent className="p-4">
                <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                <p className={`text-2xl ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <Card className="border-none shadow-lg bg-white/90 backdrop-blur sticky top-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg text-slate-800">Report Configuration</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger id="reportType" className="mt-2">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reports.map((report) => (
                        <SelectItem key={report.id} value={report.id}>
                          {report.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-2" />
                </div>

                <div>
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-2" />
                </div>

                <Separator />

                <div>
                  <Label htmlFor="exportFormat">Export Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger id="exportFormat" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV File</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate Report"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleExportReport}
                  className="w-full"
                  disabled={!selectedReport || isExporting || isGenerating}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export Report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border-none shadow-lg bg-white/90 backdrop-blur">
            <CardContent className="p-6">
              <h3 className="text-lg mb-6 text-slate-800">Available Reports</h3>
              {loading ? (
                <p className="text-sm text-slate-600">Loading report definitions...</p>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedReport === report.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50"
                      }`}
                      onClick={() => setSelectedReport(report.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-slate-800">{report.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">{report.description}</p>
                        </div>
                        <Badge variant="outline">{report.type}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-3">
                        {Number(report.records || 0).toLocaleString()} records
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-none shadow-lg bg-white/90 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg mb-4 text-slate-800">Recent Exports</h3>
            <div className="space-y-3">
              {recentExports.length === 0 && <p className="text-sm text-slate-600">No exports yet.</p>}
              {recentExports.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="text-sm text-slate-800">{item.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.date).toLocaleString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {String(item.format).toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-500">{item.size}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
