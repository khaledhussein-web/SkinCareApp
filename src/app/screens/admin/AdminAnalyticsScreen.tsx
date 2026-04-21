import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/app/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Activity, Calendar } from 'lucide-react';

export const AdminAnalyticsScreen: React.FC = () => {
  // Mock data for charts
  const userGrowthData = [
    { month: 'Jan', users: 120 },
    { month: 'Feb', users: 180 },
    { month: 'Mar', users: 250 },
    { month: 'Apr', users: 320 },
    { month: 'May', users: 450 },
    { month: 'Jun', users: 580 },
    { month: 'Jul', users: 720 },
    { month: 'Aug', users: 890 },
  ];

  const assessmentData = [
    { day: 'Mon', assessments: 45 },
    { day: 'Tue', assessments: 52 },
    { day: 'Wed', assessments: 61 },
    { day: 'Thu', assessments: 48 },
    { day: 'Fri', assessments: 70 },
    { day: 'Sat', assessments: 85 },
    { day: 'Sun', assessments: 78 },
  ];

  const skinTypeData = [
    { name: 'Dry', value: 25, color: '#f59e0b' },
    { name: 'Oily', value: 30, color: '#3b82f6' },
    { name: 'Combination', value: 28, color: '#8b5cf6' },
    { name: 'Normal', value: 17, color: '#10b981' },
  ];

  const conditionData = [
    { name: 'Acne', value: 35, color: '#ef4444' },
    { name: 'Dryness', value: 28, color: '#f59e0b' },
    { name: 'Sensitivity', value: 20, color: '#ec4899' },
    { name: 'Pigmentation', value: 17, color: '#8b5cf6' },
  ];

  const stats = [
    {
      title: 'Total Assessments',
      value: '12,543',
      change: '+18.2%',
      icon: Activity,
      color: 'from-blue-400 to-cyan-400',
    },
    {
      title: 'Active Users (7d)',
      value: '3,892',
      change: '+12.5%',
      icon: Users,
      color: 'from-green-400 to-emerald-400',
    },
    {
      title: 'Avg. Session Time',
      value: '8m 42s',
      change: '+5.3%',
      icon: Calendar,
      color: 'from-purple-400 to-pink-400',
    },
    {
      title: 'Growth Rate',
      value: '24.8%',
      change: '+3.1%',
      icon: TrendingUp,
      color: 'from-orange-400 to-red-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-slate-800">Analytics & Insights</h2>
        <p className="text-sm text-slate-600">Track performance and user behavior</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-none shadow-md bg-white/90 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      {stat.change}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl mb-1 text-slate-800">{stat.value}</h3>
                  <p className="text-sm text-slate-600">{stat.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-none shadow-md bg-white/90 backdrop-blur">
            <CardContent className="p-6">
              <h3 className="text-lg mb-4 text-slate-800">User Growth</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Daily Assessments Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-none shadow-md bg-white/90 backdrop-blur">
            <CardContent className="p-6">
              <h3 className="text-lg mb-4 text-slate-800">Daily Assessments</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={assessmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Bar dataKey="assessments" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Skin Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {skinTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {skinTypeData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-slate-600">
                      {item.name}: {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Common Conditions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {conditionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {conditionData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-slate-600">
                      {item.name}: {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
