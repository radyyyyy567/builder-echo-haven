import { RequestHandler } from "express";
import pool from "../db/connection";
import { DashboardStats, RecentActivity, ApiResponse } from "@shared/api";

// Get dashboard statistics
export const getDashboardStats: RequestHandler = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM groups) as total_groups,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM surveys) as total_surveys,
        (SELECT COUNT(*) FROM users WHERE status = true) as active_users,
        (SELECT COUNT(*) FROM events WHERE status = 'active') as active_events,
        (SELECT COUNT(*) FROM surveys WHERE status = 'active') as active_surveys
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    const dashboardStats: DashboardStats = {
      totalUsers: parseInt(stats.total_users),
      totalGroups: parseInt(stats.total_groups),
      totalEvents: parseInt(stats.total_events),
      totalSurveys: parseInt(stats.total_surveys),
      activeUsers: parseInt(stats.active_users),
      activeEvents: parseInt(stats.active_events),
      activeSurveys: parseInt(stats.active_surveys),
    };

    const response: ApiResponse<DashboardStats> = {
      success: true,
      data: dashboardStats,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to fetch dashboard statistics",
    };
    res.status(500).json(response);
  }
};

// Get recent activity
export const getRecentActivity: RequestHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Get recent users
    const usersQuery = `
      SELECT 'user' as type, 'New user registered' as action, 
             email as details, created_at as time
      FROM users 
      ORDER BY created_at DESC 
      LIMIT $1
    `;

    // Get recent groups
    const groupsQuery = `
      SELECT 'group' as type, 'Group created' as action, 
             name as details, created_at as time
      FROM groups 
      ORDER BY created_at DESC 
      LIMIT $1
    `;

    // Get recent events (if table exists)
    const eventsQuery = `
      SELECT 'event' as type, 'Event scheduled' as action, 
             name as details, created_at as time
      FROM events 
      ORDER BY created_at DESC 
      LIMIT $1
    `;

    // Get recent surveys (if table exists)
    const surveysQuery = `
      SELECT 'survey' as type, 'Survey created' as action, 
             name as details, created_at as time
      FROM surveys 
      ORDER BY created_at DESC 
      LIMIT $1
    `;

    const [usersResult, groupsResult] = await Promise.all([
      pool.query(usersQuery, [Math.ceil(limit / 2)]),
      pool.query(groupsQuery, [Math.ceil(limit / 2)]),
    ]);

    // Combine and sort activities
    const activities: RecentActivity[] = [
      ...usersResult.rows.map((row) => ({
        type: row.type as "user",
        action: row.action,
        details: row.details,
        time: row.time,
        status: "success" as const,
      })),
      ...groupsResult.rows.map((row) => ({
        type: row.type as "group",
        action: row.action,
        details: row.details,
        time: row.time,
        status: "info" as const,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);

    const response: ApiResponse<RecentActivity[]> = {
      success: true,
      data: activities,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to fetch recent activity",
    };
    res.status(500).json(response);
  }
};
