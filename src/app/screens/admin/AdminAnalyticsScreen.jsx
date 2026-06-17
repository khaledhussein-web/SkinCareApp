import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, Activity, Calendar } from "lucide-react";
import { fetchAdminAnalytics } from "@/app/services/skincareApi";

const palette = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export const AdminAnalyticsScreen = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAdminAnalytics();
        setAnalytics(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (loading) return <p className="text-sm text-slate-600">Loading analytics...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!analytics) return null;

  const stats = [
    {
      title: "Total Assessments",
      value: analytics.stats.totalAssessments,
      icon: Activity,
      color: "from-blue-400 to-cyan-400",
    },
    {
      title: "Active Users (7d)",
      value: analytics.stats.activeUsers7d,
      icon: Users,
      color: "from-green-400 to-emerald-400",
    },
    {
      title: "Total Users",
      value: analytics.stats.totalUsers,
      icon: Calendar,
      color: "from-purple-400 to-pink-400",
    },
  ];

  const skinTypeData = (analytics.skinTypeData || []).map((item, index) => ({
    ...item,
    color: palette[index % palette.length],
  }));

  const conditionData = (analytics.conditionData || []).map((item, index) => ({
    ...item,
    color: palette[index % palette.length],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-slate-800">Analytics & Insights</h2>
        <p className="text-sm text-slate-600">Track performance and user behavior</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className="border-none shadow-md bg-white/90 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl sm:text-3xl mb-1 text-slate-800">
                    {Number(stat.value).toLocaleString()}
                  </h3>
                  <p className="text-sm text-slate-600">{stat.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-md bg-white/90 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg mb-4 text-slate-800">User Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.userGrowthData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: "#8b5cf6", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white/90 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg mb-4 text-slate-800">Daily Assessments</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.assessmentData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="assessments" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white/90 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg mb-4 text-slate-800">Skin Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={skinTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {skinTypeData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white/90 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg mb-4 text-slate-800">Common Conditions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={conditionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {conditionData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
