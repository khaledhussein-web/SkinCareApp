import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useAuth } from "@/app/context/AuthContext";
import { AdminUsersScreen } from "@/app/screens/admin/AdminUsersScreen";
import { AdminAnalyticsScreen } from "@/app/screens/admin/AdminAnalyticsScreen";
import { AdminReportsScreen } from "@/app/screens/admin/AdminReportsScreen";
import { AdminSupportScreen } from "@/app/screens/admin/AdminSupportScreen";
import { Users, Activity, TrendingUp, AlertCircle, Shield, FileText, BarChart3, Inbox } from "lucide-react";
import { fetchAdminOverview } from "@/app/services/skincareApi";

export const AdminDashboardScreen = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      try {
        const data = await fetchAdminOverview();
        setOverview(data);
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, []);

  const stats = useMemo(() => {
    if (!overview?.stats) return [];
    return [
      {
        title: "Total Users",
        value: overview.stats.totalUsers,
        icon: Users,
        color: "from-blue-400 to-cyan-400",
      },
      {
        title: "Active Users",
        value: overview.stats.activeUsers,
        icon: Activity,
        color: "from-green-400 to-emerald-400",
      },
      {
        title: "Assessments Today",
        value: overview.stats.assessmentsToday,
        icon: FileText,
        color: "from-purple-400 to-pink-400",
      },
      {
        title: "Open Support",
        value: overview.stats.openSupportMessages,
        icon: AlertCircle,
        color: "from-orange-400 to-red-400",
      },
    ];
  }, [overview]);

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "banned":
        return "bg-red-100 text-red-700 border-red-200";
      case "inactive":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8 sm:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/90 backdrop-blur p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {loading ? (
              <p className="text-sm text-slate-600">Loading dashboard...</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={stat.title} className="border-none shadow-md bg-white/90 backdrop-blur">
                        <CardContent className="p-6">
                          <div className="p-3 rounded-xl bg-slate-100 inline-flex mb-4">
                            <Icon className="w-6 h-6 text-slate-700" />
                          </div>
                          <h3 className="text-2xl sm:text-3xl mb-1 text-slate-800">
                            {Number(stat.value).toLocaleString()}
                          </h3>
                          <p className="text-sm text-slate-600">{stat.title}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  <Card className="border-none shadow-md bg-white/90 backdrop-blur lg:col-span-2">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl text-slate-800">Recent Users</h3>
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setActiveTab("users")}>
                          View All
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {(overview?.recentUsers || []).map((recentUser) => (
                          <div
                            key={recentUser.id}
                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
                              {recentUser.name?.charAt(0) || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm text-slate-800 truncate">{recentUser.name}</h4>
                              <p className="text-xs text-slate-600 truncate">{recentUser.email}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <Badge variant="outline" className={getStatusColor(recentUser.status)}>
                                {recentUser.status}
                              </Badge>
                              <div className="text-right">
                                <p className="text-xs text-slate-600">
                                  {new Date(recentUser.joinedAt).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-purple-600">
                                  {recentUser.assessments} assessment{recentUser.assessments !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="border-none shadow-md bg-white/90 backdrop-blur">
                      <CardContent className="p-6">
                        <h3 className="text-xl mb-4 text-slate-800">Quick Actions</h3>
                        <div className="space-y-3">
                          <Button variant="outline" className="w-full justify-start rounded-lg" onClick={() => setActiveTab("users")}>
                            <Users className="w-4 h-4 mr-2" />
                            Manage Users
                          </Button>
                          <Button variant="outline" className="w-full justify-start rounded-lg" onClick={() => setActiveTab("analytics")}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analytics
                          </Button>
                          <Button variant="outline" className="w-full justify-start rounded-lg" onClick={() => setActiveTab("reports")}>
                            <FileText className="w-4 h-4 mr-2" />
                            Export Reports
                          </Button>
                          <Button variant="outline" className="w-full justify-start rounded-lg" onClick={() => setActiveTab("support")}>
                            <Inbox className="w-4 h-4 mr-2" />
                            Manage Support
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <h3 className="text-lg text-slate-800">System Snapshot</h3>
                        </div>
                        <p className="text-sm text-slate-700">
                          User activity and assessment metrics are being pulled from live database
                          records.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersScreen />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalyticsScreen />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReportsScreen />
          </TabsContent>

          <TabsContent value="support">
            <AdminSupportScreen />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
