import { RequestHandler } from "express";
import pool from "../db/connection";
import { 
  Survey, 
  SurveyWithEvents, 
  CreateSurveyRequest, 
  UpdateSurveyRequest, 
  ApiResponse, 
  PaginatedResponse 
} from "@shared/api";

// Get all surveys with optional filtering and pagination
export const getSurveys: RequestHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const status = req.query.status as string;

    let query = `
      SELECT s.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'uuid', e.uuid,
                   'name', e.name,
                   'description', e.description,
                   'time_start', e.time_start,
                   'time_end', e.time_end,
                   'status', e.status
                 )
               ) FILTER (WHERE e.uuid IS NOT NULL), 
               '[]'
             ) as events
      FROM surveys s
      LEFT JOIN relation_event_survey res ON s.uuid = res.survey_id
      LEFT JOIN events e ON res.event_id = e.uuid
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (s.name ILIKE $${paramCount} OR s.set_point ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status && status !== 'all') {
      paramCount++;
      query += ` AND s.status = $${paramCount}`;
      params.push(status);
    }

    query += ` GROUP BY s.uuid ORDER BY s.created_at DESC`;

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM surveys s
      WHERE 1=1
    `;

    let countParams: any[] = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (s.name ILIKE $${countParamCount} OR s.set_point ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    if (status && status !== 'all') {
      countParamCount++;
      countQuery += ` AND s.status = $${countParamCount}`;
      countParams.push(status);
    }

    const [surveysResult, countResult] = await Promise.all([
      pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<SurveyWithEvents> = {
      success: true,
      data: surveysResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch surveys'
    };
    res.status(500).json(response);
  }
};

// Get single survey by ID
export const getSurveyById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT s.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'uuid', e.uuid,
                   'name', e.name,
                   'description', e.description,
                   'time_start', e.time_start,
                   'time_end', e.time_end,
                   'status', e.status
                 )
               ) FILTER (WHERE e.uuid IS NOT NULL), 
               '[]'
             ) as events
      FROM surveys s
      LEFT JOIN relation_event_survey res ON s.uuid = res.survey_id
      LEFT JOIN events e ON res.event_id = e.uuid
      WHERE s.uuid = $1
      GROUP BY s.uuid
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Survey not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<SurveyWithEvents> = {
      success: true,
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching survey:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch survey'
    };
    res.status(500).json(response);
  }
};

// Create new survey
export const createSurvey: RequestHandler = async (req, res) => {
  try {
    const { name, form, set_point, status }: CreateSurveyRequest = req.body;

    // Basic validation
    if (!name || !form) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Name and form are required'
      };
      return res.status(400).json(response);
    }

    // Validate form is valid JSON
    if (typeof form !== 'object') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Form must be a valid JSON object'
      };
      return res.status(400).json(response);
    }

    const query = `
      INSERT INTO surveys (name, form, set_point, status)
      VALUES ($1, $2, $3, $4)
      RETURNING uuid, name, form, set_point, status, created_at, updated_at
    `;

    const result = await pool.query(query, [
      name, 
      JSON.stringify(form), 
      set_point || null, 
      status || 'active'
    ]);

    const response: ApiResponse<Survey> = {
      success: true,
      data: result.rows[0],
      message: 'Survey created successfully'
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error creating survey:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to create survey'
    };
    res.status(400).json(response);
  }
};

// Update survey
export const updateSurvey: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates: UpdateSurveyRequest = req.body;

    // Validate form if provided
    if (updates.form && typeof updates.form !== 'object') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Form must be a valid JSON object'
      };
      return res.status(400).json(response);
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        if (key === 'form') {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
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
      UPDATE surveys 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE uuid = $${paramCount + 1}
      RETURNING uuid, name, form, set_point, status, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Survey not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Survey> = {
      success: true,
      data: result.rows[0],
      message: 'Survey updated successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error updating survey:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to update survey'
    };
    res.status(400).json(response);
  }
};

// Delete survey
export const deleteSurvey: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // First check if survey exists
    const checkResult = await pool.query('SELECT uuid FROM surveys WHERE uuid = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Survey not found'
      };
      return res.status(404).json(response);
    }

    // Delete survey (cascading will handle relationships)
    await pool.query('DELETE FROM surveys WHERE uuid = $1', [id]);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Survey deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting survey:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to delete survey'
    };
    res.status(500).json(response);
  }
};

// Add survey to event
export const addSurveyToEvent: RequestHandler = async (req, res) => {
  try {
    const { surveyId, eventId, file_final } = req.body;

    if (!surveyId || !eventId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Survey ID and Event ID are required'
      };
      return res.status(400).json(response);
    }

    const query = `
      INSERT INTO relation_event_survey (survey_id, event_id, file_final)
      VALUES ($1, $2, $3)
      ON CONFLICT (survey_id, event_id) DO NOTHING
    `;

    await pool.query(query, [surveyId, eventId, file_final || null]);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Survey added to event successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error adding survey to event:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to add survey to event'
    };
    res.status(500).json(response);
  }
};

// Remove survey from event
export const removeSurveyFromEvent: RequestHandler = async (req, res) => {
  try {
    const { surveyId, eventId } = req.body;

    if (!surveyId || !eventId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Survey ID and Event ID are required'
      };
      return res.status(400).json(response);
    }

    const query = `
      DELETE FROM relation_event_survey
      WHERE survey_id = $1 AND event_id = $2
    `;

    await pool.query(query, [surveyId, eventId]);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Survey removed from event successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error removing survey from event:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to remove survey from event'
    };
    res.status(500).json(response);
  }
};
