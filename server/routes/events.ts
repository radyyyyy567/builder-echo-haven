import { RequestHandler } from "express";
import pool from "../db/connection";
import {
  Event,
  EventWithGroups,
  CreateEventRequest,
  UpdateEventRequest,
  ApiResponse,
  PaginatedResponse,
} from "@shared/api";

// Get all events with optional filtering and pagination
export const getEvents: RequestHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const status = req.query.status as string;

    let query = `
      SELECT e.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'uuid', g.uuid,
                   'name', g.name,
                   'description', g.description
                 )
               ) FILTER (WHERE g.uuid IS NOT NULL), 
               '[]'
             ) as groups
      FROM events e
      LEFT JOIN relation_group_event rge ON e.uuid = rge.event_id
      LEFT JOIN groups g ON rge.group_id = g.uuid
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (e.name ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status && status !== "all") {
      paramCount++;
      query += ` AND e.status = $${paramCount}`;
      params.push(status);
    }

    query += ` GROUP BY e.uuid ORDER BY e.time_start DESC`;

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT e.uuid) as total
      FROM events e
      WHERE 1=1
    `;

    let countParams: any[] = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (e.name ILIKE $${countParamCount} OR e.description ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    if (status && status !== "all") {
      countParamCount++;
      countQuery += ` AND e.status = $${countParamCount}`;
      countParams.push(status);
    }

    const [eventsResult, countResult] = await Promise.all([
      pool.query(
        query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset],
      ),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<EventWithGroups> = {
      success: true,
      data: eventsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching events:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to fetch events",
    };
    res.status(500).json(response);
  }
};

// Get single event by ID
export const getEventById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT e.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'uuid', g.uuid,
                   'name', g.name,
                   'description', g.description
                 )
               ) FILTER (WHERE g.uuid IS NOT NULL), 
               '[]'
             ) as groups
      FROM events e
      LEFT JOIN relation_group_event rge ON e.uuid = rge.event_id
      LEFT JOIN groups g ON rge.group_id = g.uuid
      WHERE e.uuid = $1
      GROUP BY e.uuid
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Event not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<EventWithGroups> = {
      success: true,
      data: result.rows[0],
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching event:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to fetch event",
    };
    res.status(500).json(response);
  }
};

// Create new event
export const createEvent: RequestHandler = async (req, res) => {
  try {
    const {
      name,
      description,
      time_start,
      time_end,
      status,
    }: CreateEventRequest = req.body;

    // Basic validation
    if (!name || !time_start || !time_end) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Name, start time, and end time are required",
      };
      return res.status(400).json(response);
    }

    // Validate that end time is after start time
    if (new Date(time_end) <= new Date(time_start)) {
      const response: ApiResponse<null> = {
        success: false,
        error: "End time must be after start time",
      };
      return res.status(400).json(response);
    }

    const query = `
      INSERT INTO events (name, description, time_start, time_end, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING uuid, name, description, time_start, time_end, status, created_at, updated_at
    `;

    const result = await pool.query(query, [
      name,
      description || null,
      time_start,
      time_end,
      status || "scheduled",
    ]);

    const response: ApiResponse<Event> = {
      success: true,
      data: result.rows[0],
      message: "Event created successfully",
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error("Error creating event:", error);

    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to create event",
    };
    res.status(400).json(response);
  }
};

// Update event
export const updateEvent: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates: UpdateEventRequest = req.body;

    // Validate time relationship if both times are provided
    if (updates.time_start && updates.time_end) {
      if (new Date(updates.time_end) <= new Date(updates.time_start)) {
        const response: ApiResponse<null> = {
          success: false,
          error: "End time must be after start time",
        };
        return res.status(400).json(response);
      }
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: "No fields to update",
      };
      return res.status(400).json(response);
    }

    values.push(id); // Add ID as last parameter
    const query = `
      UPDATE events 
      SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE uuid = $${paramCount + 1}
      RETURNING uuid, name, description, time_start, time_end, status, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Event not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Event> = {
      success: true,
      data: result.rows[0],
      message: "Event updated successfully",
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error updating event:", error);

    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to update event",
    };
    res.status(400).json(response);
  }
};

// Delete event
export const deleteEvent: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // First check if event exists
    const checkResult = await pool.query(
      "SELECT uuid FROM events WHERE uuid = $1",
      [id],
    );

    if (checkResult.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Event not found",
      };
      return res.status(404).json(response);
    }

    // Delete event (cascading will handle relationships)
    await pool.query("DELETE FROM events WHERE uuid = $1", [id]);

    const response: ApiResponse<null> = {
      success: true,
      message: "Event deleted successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Error deleting event:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to delete event",
    };
    res.status(500).json(response);
  }
};

// Add event to group
export const addEventToGroup: RequestHandler = async (req, res) => {
  try {
    const { eventId, groupId } = req.body;

    if (!eventId || !groupId) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Event ID and Group ID are required",
      };
      return res.status(400).json(response);
    }

    const query = `
      INSERT INTO relation_group_event (event_id, group_id)
      VALUES ($1, $2)
      ON CONFLICT (event_id, group_id) DO NOTHING
    `;

    await pool.query(query, [eventId, groupId]);

    const response: ApiResponse<null> = {
      success: true,
      message: "Event added to group successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Error adding event to group:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to add event to group",
    };
    res.status(500).json(response);
  }
};

// Remove event from group
export const removeEventFromGroup: RequestHandler = async (req, res) => {
  try {
    const { eventId, groupId } = req.body;

    if (!eventId || !groupId) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Event ID and Group ID are required",
      };
      return res.status(400).json(response);
    }

    const query = `
      DELETE FROM relation_group_event
      WHERE event_id = $1 AND group_id = $2
    `;

    await pool.query(query, [eventId, groupId]);

    const response: ApiResponse<null> = {
      success: true,
      message: "Event removed from group successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Error removing event from group:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to remove event from group",
    };
    res.status(500).json(response);
  }
};
