import { useState, useEffect } from "react";
import { Users, Users2, Calendar, FileText, TrendingUp, Activity, Database, CheckCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { DashboardStats, RecentActivity, ApiResponse } from "@shared/api";

const systemHealth = [
  { name: "Database", status: "healthy", uptime: 99.9 },
  { name: "API Services", status: "healthy", uptime: 99.7 },
  { name: "User Authentication", status: "healthy", uptime: 100 },
  { name: "Email Service", status: "warning", uptime: 98.5 },
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/activity?limit=5")
      ]);

      const statsData: ApiResponse<DashboardStats> = await statsResponse.json();
      const activityData: ApiResponse<RecentActivity[]> = await activityResponse.json();

      if (statsData.success) {
        setStats(statsData.data!);
      }

      if (activityData.success) {
        setRecentActivity(activityData.data!);
      }

      if (!statsData.success || !activityData.success) {
        toast({
          title: "Warning",
          description: "Some dashboard data failed to load",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate percentage changes (mock for now)
  const statsCards = stats ? [
    {
      title: "Total Users",
      value: stats.totalUsers.toString(),
      change: "+12%",
      changeType: "positive" as const,
      icon: Users,
      description: "Active users in the system",
    },
    {
      title: "Groups",
      value: stats.totalGroups.toString(),
      change: "+4%",
      changeType: "positive" as const,
      icon: Users2,
      description: "Active groups",
    },
    {
      title: "Events",
      value: stats.totalEvents.toString(),
      change: "+18%",
      changeType: "positive" as const,
      icon: Calendar,
      description: "Total events scheduled",
    },
    {
      title: "Surveys",
      value: stats.totalSurveys.toString(),
      change: "-2%",
      changeType: "negative" as const,
      icon: FileText,
      description: "Active surveys",
    },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your system's performance and key metrics.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span
                    className={
                      stat.changeType === "positive"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {stat.change}
                  </span>{" "}
                  from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest actions and updates in your system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      {activity.status === "success" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.details}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(activity.time).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Current status of system components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.map((system) => (
                <div key={system.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{system.name}</span>
                    <Badge
                      variant={system.status === "healthy" ? "secondary" : "destructive"}
                      className={
                        system.status === "healthy"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : system.status === "warning"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                          : ""
                      }
                    >
                      {system.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uptime</span>
                      <span>{system.uptime}%</span>
                    </div>
                    <Progress 
                      value={system.uptime} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and management functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <button className="flex flex-col items-center justify-center p-6 space-y-2 border rounded-lg hover:bg-accent transition-colors">
              <Users className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Add User</span>
            </button>
            <button className="flex flex-col items-center justify-center p-6 space-y-2 border rounded-lg hover:bg-accent transition-colors">
              <Users2 className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Create Group</span>
            </button>
            <button className="flex flex-col items-center justify-center p-6 space-y-2 border rounded-lg hover:bg-accent transition-colors">
              <Calendar className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Schedule Event</span>
            </button>
            <button className="flex flex-col items-center justify-center p-6 space-y-2 border rounded-lg hover:bg-accent transition-colors">
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">New Survey</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
