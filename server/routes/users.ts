import { RequestHandler } from "express";
import pool from "../db/connection";
import {
  User,
  UserWithGroups,
  CreateUserRequest,
  UpdateUserRequest,
  ApiResponse,
  PaginatedResponse,
} from "@shared/api";

// Get all users with optional filtering and pagination
export const getUsers: RequestHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const role = req.query.role as string;
    const status = req.query.status as string;

    let query = `
      SELECT u.*, 
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
      FROM users u
      LEFT JOIN relation_group_user rgu ON u.uuid = rgu.user_id
      LEFT JOIN groups g ON rgu.group_id = g.uuid
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (role && role !== "all") {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      params.push(role);
    }

    if (status && status !== "all") {
      paramCount++;
      const statusBool = status === "active";
      query += ` AND u.status = $${paramCount}`;
      params.push(statusBool);
    }

    query += ` GROUP BY u.uuid ORDER BY u.created_at DESC`;

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT u.uuid) as total
      FROM users u
      WHERE 1=1
    `;

    let countParams: any[] = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (u.username ILIKE $${countParamCount} OR u.email ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    if (role && role !== "all") {
      countParamCount++;
      countQuery += ` AND u.role = $${countParamCount}`;
      countParams.push(role);
    }

    if (status && status !== "all") {
      countParamCount++;
      const statusBool = status === "active";
      countQuery += ` AND u.status = $${countParamCount}`;
      countParams.push(statusBool);
    }

    const [usersResult, countResult] = await Promise.all([
      pool.query(
        query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset],
      ),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<UserWithGroups> = {
      success: true,
      data: usersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching users:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to fetch users",
    };
    res.status(500).json(response);
  }
};

// Get single user by ID
export const getUserById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT u.*, 
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
      FROM users u
      LEFT JOIN relation_group_user rgu ON u.uuid = rgu.user_id
      LEFT JOIN groups g ON rgu.group_id = g.uuid
      WHERE u.uuid = $1
      GROUP BY u.uuid
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: "User not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<UserWithGroups> = {
      success: true,
      data: result.rows[0],
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching user:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to fetch user",
    };
    res.status(500).json(response);
  }
};

// Create new user
export const createUser: RequestHandler = async (req, res) => {
  try {
    const { username, email, role, password }: CreateUserRequest = req.body;

    // Basic validation
    if (!username || !email || !password) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Username, email, and password are required",
      };
      return res.status(400).json(response);
    }

    // In a real app, you'd hash the password here
    // const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (username, email, role, password)
      VALUES ($1, $2, $3, $4)
      RETURNING uuid, username, email, role, status, created_at, updated_at
    `;

    const result = await pool.query(query, [
      username,
      email,
      role || "user",
      password,
    ]);

    const response: ApiResponse<User> = {
      success: true,
      data: result.rows[0],
      message: "User created successfully",
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error("Error creating user:", error);

    let errorMessage = "Failed to create user";
    if (error.code === "23505") {
      // Unique constraint violation
      if (error.constraint?.includes("username")) {
        errorMessage = "Username already exists";
      } else if (error.constraint?.includes("email")) {
        errorMessage = "Email already exists";
      }
    }

    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage,
    };
    res.status(400).json(response);
  }
};

// Update user
export const updateUser: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates: UpdateUserRequest = req.body;

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
      UPDATE users 
      SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE uuid = $${paramCount + 1}
      RETURNING uuid, username, email, role, status, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: "User not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<User> = {
      success: true,
      data: result.rows[0],
      message: "User updated successfully",
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error updating user:", error);

    let errorMessage = "Failed to update user";
    if (error.code === "23505") {
      // Unique constraint violation
      if (error.constraint?.includes("username")) {
        errorMessage = "Username already exists";
      } else if (error.constraint?.includes("email")) {
        errorMessage = "Email already exists";
      }
    }

    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage,
    };
    res.status(400).json(response);
  }
};

// Delete user
export const deleteUser: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // First check if user exists
    const checkResult = await pool.query(
      "SELECT uuid FROM users WHERE uuid = $1",
      [id],
    );

    if (checkResult.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: "User not found",
      };
      return res.status(404).json(response);
    }

    // Delete user (cascading will handle relationships)
    await pool.query("DELETE FROM users WHERE uuid = $1", [id]);

    const response: ApiResponse<null> = {
      success: true,
      message: "User deleted successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Error deleting user:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to delete user",
    };
    res.status(500).json(response);
  }
};

// Add user to group
export const addUserToGroup: RequestHandler = async (req, res) => {
  try {
    const { userId, groupId } = req.body;

    if (!userId || !groupId) {
      const response: ApiResponse<null> = {
        success: false,
        error: "User ID and Group ID are required",
      };
      return res.status(400).json(response);
    }

    const query = `
      INSERT INTO relation_group_user (user_id, group_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, group_id) DO NOTHING
    `;

    await pool.query(query, [userId, groupId]);

    const response: ApiResponse<null> = {
      success: true,
      message: "User added to group successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Error adding user to group:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to add user to group",
    };
    res.status(500).json(response);
  }
};

// Remove user from group
export const removeUserFromGroup: RequestHandler = async (req, res) => {
  try {
    const { userId, groupId } = req.body;

    if (!userId || !groupId) {
      const response: ApiResponse<null> = {
        success: false,
        error: "User ID and Group ID are required",
      };
      return res.status(400).json(response);
    }

    const query = `
      DELETE FROM relation_group_user
      WHERE user_id = $1 AND group_id = $2
    `;

    await pool.query(query, [userId, groupId]);

    const response: ApiResponse<null> = {
      success: true,
      message: "User removed from group successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Error removing user from group:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to remove user from group",
    };
    res.status(500).json(response);
  }
};
