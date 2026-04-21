import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAuth } from '@/app/context/AuthContext';
import { AdminUsersScreen } from '@/app/screens/admin/AdminUsersScreen';
import { AdminAnalyticsScreen } from '@/app/screens/admin/AdminAnalyticsScreen';
import { AdminReportsScreen } from '@/app/screens/admin/AdminReportsScreen';
import {
  Users,
  Activity,
  TrendingUp,
  AlertCircle,
  Shield,
  FileText,
  BarChart3,
} from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  trend: 'up' | 'down';
  color: string;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  assessments: number;
}

export const AdminDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const stats: StatCard[] = [
    {
      title: 'Total Users',
      value: '2,543',
      change: '+12.5%',
      icon: Users,
      trend: 'up',
      color: 'from-blue-400 to-cyan-400',
    },
    {
      title: 'Active Sessions',
      value: '487',
      change: '+8.2%',
      icon: Activity,
      trend: 'up',
      color: 'from-green-400 to-emerald-400',
    },
    {
      title: 'Assessments Today',
      value: '142',
      change: '+23.1%',
      icon: FileText,
      trend: 'up',
      color: 'from-purple-400 to-pink-400',
    },
    {
      title: 'System Health',
      value: '99.9%',
      change: '-0.1%',
      icon: Shield,
      trend: 'down',
      color: 'from-orange-400 to-red-400',
    },
  ];

  const recentUsers: RecentUser[] = [
    {
      id: '1',
      name: 'Emily Johnson',
      email: 'emily.j@example.com',
      status: 'active',
      joinedAt: '2 hours ago',
      assessments: 3,
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'm.chen@example.com',
      status: 'active',
      joinedAt: '5 hours ago',
      assessments: 1,
    },
    {
      id: '3',
      name: 'Sarah Williams',
      email: 'sarah.w@example.com',
      status: 'pending',
      joinedAt: '1 day ago',
      assessments: 0,
    },
    {
      id: '4',
      name: 'David Martinez',
      email: 'd.martinez@example.com',
      status: 'active',
      joinedAt: '2 days ago',
      assessments: 5,
    },
    {
      id: '5',
      name: 'Lisa Anderson',
      email: 'lisa.a@example.com',
      status: 'inactive',
      joinedAt: '1 week ago',
      assessments: 2,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8 sm:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl text-slate-800">Admin Dashboard</h1>
              <p className="text-slate-600">Welcome back, {user?.name}</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/90 backdrop-blur p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
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
                    <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-white/90 backdrop-blur">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-10`}
                          >
                            <Icon className="w-6 h-6 text-slate-700" />
                          </div>
                          <Badge
                            variant="outline"
                            className={`${
                              stat.trend === 'up'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {stat.change}
                          </Badge>
                        </div>
                        <h3 className="text-2xl sm:text-3xl mb-1 text-slate-800">{stat.value}</h3>
                        <p className="text-sm text-slate-600">{stat.title}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Recent Users */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-2"
              >
                <Card className="border-none shadow-md bg-white/90 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl text-slate-800">Recent Users</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setActiveTab('users')}
                      >
                        View All
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {recentUsers.map((user, index) => (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
                            {user.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm text-slate-800 truncate">{user.name}</h4>
                            <p className="text-xs text-slate-600 truncate">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <Badge variant="outline" className={getStatusColor(user.status)}>
                              {user.status}
                            </Badge>
                            <div className="text-right">
                              <p className="text-xs text-slate-600">{user.joinedAt}</p>
                              <p className="text-xs text-purple-600">
                                {user.assessments} assessment{user.assessments !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions & System Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-6"
              >
                {/* Quick Actions */}
                <Card className="border-none shadow-md bg-white/90 backdrop-blur">
                  <CardContent className="p-6">
                    <h3 className="text-xl mb-4 text-slate-800">Quick Actions</h3>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-lg"
                        onClick={() => setActiveTab('users')}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Manage Users
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-lg"
                        onClick={() => setActiveTab('analytics')}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Analytics
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-lg"
                        onClick={() => setActiveTab('reports')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Export Reports
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* System Alerts */}
                <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-red-50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <h3 className="text-lg text-slate-800">System Alerts</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-sm text-slate-700 mb-1">
                          <strong>Database Backup</strong>
                        </p>
                        <p className="text-xs text-slate-600">Scheduled for tonight at 2:00 AM</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-sm text-slate-700 mb-1">
                          <strong>API Rate Limit</strong>
                        </p>
                        <p className="text-xs text-slate-600">85% of daily quota used</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance */}
                <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg text-slate-800">Performance</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600">Server Uptime</span>
                          <span className="text-slate-800">99.9%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 w-[99.9%]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600">Response Time</span>
                          <span className="text-slate-800">145ms</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 w-[85%]" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <AdminUsersScreen />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AdminAnalyticsScreen />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <AdminReportsScreen />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};