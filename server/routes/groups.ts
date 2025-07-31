import { RequestHandler } from "express";
import pool from "../db/connection";
import { 
  Group, 
  GroupWithUsers, 
  CreateGroupRequest, 
  UpdateGroupRequest, 
  ApiResponse, 
  PaginatedResponse 
} from "@shared/api";

// Get all groups with optional filtering and pagination
export const getGroups: RequestHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';

    let query = `
      SELECT g.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'uuid', u.uuid,
                   'username', u.username,
                   'email', u.email,
                   'role', u.role,
                   'status', u.status
                 )
               ) FILTER (WHERE u.uuid IS NOT NULL), 
               '[]'
             ) as users
      FROM groups g
      LEFT JOIN relation_group_user rgu ON g.uuid = rgu.group_id
      LEFT JOIN users u ON rgu.user_id = u.uuid
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (g.name ILIKE $${paramCount} OR g.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY g.uuid ORDER BY g.created_at DESC`;

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM groups g
      WHERE 1=1
    `;

    let countParams: any[] = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (g.name ILIKE $${countParamCount} OR g.description ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const [groupsResult, countResult] = await Promise.all([
      pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<GroupWithUsers> = {
      success: true,
      data: groupsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching groups:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch groups'
    };
    res.status(500).json(response);
  }
};

// Get single group by ID
export const getGroupById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT g.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'uuid', u.uuid,
                   'username', u.username,
                   'email', u.email,
                   'role', u.role,
                   'status', u.status
                 )
               ) FILTER (WHERE u.uuid IS NOT NULL), 
               '[]'
             ) as users
      FROM groups g
      LEFT JOIN relation_group_user rgu ON g.uuid = rgu.group_id
      LEFT JOIN users u ON rgu.user_id = u.uuid
      WHERE g.uuid = $1
      GROUP BY g.uuid
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Group not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<GroupWithUsers> = {
      success: true,
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching group:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch group'
    };
    res.status(500).json(response);
  }
};

// Create new group
export const createGroup: RequestHandler = async (req, res) => {
  try {
    const { name, description }: CreateGroupRequest = req.body;

    // Basic validation
    if (!name) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Group name is required'
      };
      return res.status(400).json(response);
    }

    const query = `
      INSERT INTO groups (name, description)
      VALUES ($1, $2)
      RETURNING uuid, name, description, created_at, updated_at
    `;

    const result = await pool.query(query, [name, description || null]);

    const response: ApiResponse<Group> = {
      success: true,
      data: result.rows[0],
      message: 'Group created successfully'
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error creating group:', error);
    
    let errorMessage = 'Failed to create group';
    if (error.code === '23505') { // Unique constraint violation
      errorMessage = 'Group name already exists';
    }

    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage
    };
    res.status(400).json(response);
  }
};

// Update group
export const updateGroup: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates: UpdateGroupRequest = req.body;

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
        error: 'No fields to update'
      };
      return res.status(400).json(response);
    }

    values.push(id); // Add ID as last parameter
    const query = `
      UPDATE groups 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE uuid = $${paramCount + 1}
      RETURNING uuid, name, description, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Group not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Group> = {
      success: true,
      data: result.rows[0],
      message: 'Group updated successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error updating group:', error);
    
    let errorMessage = 'Failed to update group';
    if (error.code === '23505') { // Unique constraint violation
      errorMessage = 'Group name already exists';
    }

    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage
    };
    res.status(400).json(response);
  }
};

// Delete group
export const deleteGroup: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // First check if group exists
    const checkResult = await pool.query('SELECT uuid FROM groups WHERE uuid = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Group not found'
      };
      return res.status(404).json(response);
    }

    // Delete group (cascading will handle relationships)
    await pool.query('DELETE FROM groups WHERE uuid = $1', [id]);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Group deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting group:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to delete group'
    };
    res.status(500).json(response);
  }
};
