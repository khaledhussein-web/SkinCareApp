import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import {
  FileText,
  Download,
  Calendar,
  Users,
  Activity,
  TrendingUp,
  PieChart,
  BarChart3,
  FileSpreadsheet,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

interface Report {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: React.ElementType;
  color: string;
  records: number;
}

export const AdminReportsScreen: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-02-15');
  const [exportFormat, setExportFormat] = useState('pdf');

  const reports: Report[] = [
    {
      id: 'user-activity',
      name: 'User Activity Report',
      type: 'Activity',
      description: 'Comprehensive user engagement and activity metrics',
      icon: Activity,
      color: 'from-blue-400 to-cyan-400',
      records: 2543,
    },
    {
      id: 'assessment-summary',
      name: 'Assessment Summary',
      type: 'Analytics',
      description: 'Detailed analysis of skin assessments and results',
      icon: FileText,
      color: 'from-purple-400 to-pink-400',
      records: 1892,
    },
    {
      id: 'user-growth',
      name: 'User Growth Report',
      type: 'Growth',
      description: 'User registration trends and growth patterns',
      icon: TrendingUp,
      color: 'from-green-400 to-emerald-400',
      records: 2543,
    },
    {
      id: 'skin-conditions',
      name: 'Skin Conditions Analysis',
      type: 'Medical',
      description: 'Distribution and trends of detected skin conditions',
      icon: PieChart,
      color: 'from-orange-400 to-red-400',
      records: 4521,
    },
    {
      id: 'demographics',
      name: 'User Demographics',
      type: 'Demographics',
      description: 'Geographic and demographic user distribution',
      icon: Users,
      color: 'from-indigo-400 to-purple-400',
      records: 2543,
    },
    {
      id: 'engagement',
      name: 'Engagement Metrics',
      type: 'Engagement',
      description: 'Session duration, frequency, and interaction patterns',
      icon: BarChart3,
      color: 'from-pink-400 to-rose-400',
      records: 8934,
    },
  ];

  const handleGenerateReport = () => {
    if (!selectedReport) {
      toast.error('Please select a report type');
      return;
    }
    toast.success('Report generated successfully');
  };

  const handleExportReport = (format: string) => {
    if (!selectedReport) {
      toast.error('Please generate a report first');
      return;
    }
    toast.success(`Report exported as ${format.toUpperCase()}`);
  };

  const quickStats = [
    { label: 'Reports Generated', value: '156', color: 'text-blue-600' },
    { label: 'Last Export', value: '2 hours ago', color: 'text-purple-600' },
    { label: 'Total Records', value: '23.4K', color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl text-slate-800">Reports & Analytics</h2>
          <p className="text-sm text-slate-600">Generate and export detailed reports</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {quickStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-none shadow-md bg-white/90 backdrop-blur">
              <CardContent className="p-4">
                <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                <p className={`text-2xl ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Report Generation */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
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
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="mt-2"
                  />
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
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleExportReport(exportFormat)}
                  className="w-full"
                  disabled={!selectedReport}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Available Reports */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="border-none shadow-lg bg-white/90 backdrop-blur">
            <CardContent className="p-6">
              <h3 className="text-lg mb-6 text-slate-800">Available Reports</h3>
              <div className="space-y-4">
                {reports.map((report, index) => {
                  const Icon = report.icon;
                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedReport === report.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedReport(report.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-3 rounded-xl bg-gradient-to-br ${report.color} flex-shrink-0`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-slate-800">{report.name}</h4>
                            <Badge variant="outline" className="bg-slate-100 text-slate-700">
                              {report.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{report.description}</p>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-slate-500">
                              {report.records.toLocaleString()} records
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReport(report.id);
                                handleExportReport(exportFormat);
                              }}
                              className="h-7 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Quick Export
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Exports */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-none shadow-lg bg-white/90 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg mb-4 text-slate-800">Recent Exports</h3>
            <div className="space-y-3">
              {[
                {
                  name: 'User Activity Report',
                  date: '2026-02-14',
                  format: 'PDF',
                  size: '2.4 MB',
                },
                {
                  name: 'Assessment Summary',
                  date: '2026-02-13',
                  format: 'Excel',
                  size: '1.8 MB',
                },
                {
                  name: 'Skin Conditions Analysis',
                  date: '2026-02-12',
                  format: 'CSV',
                  size: '542 KB',
                },
                {
                  name: 'User Growth Report',
                  date: '2026-02-10',
                  format: 'PDF',
                  size: '3.1 MB',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-slate-800">{item.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.date}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.format}
                        </Badge>
                        <span className="text-xs text-slate-500">{item.size}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
