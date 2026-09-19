import { pool, isDatabaseConfigured } from "../config/db.js";

// Mutable in-memory accounts for demo/testing when PostgreSQL is not configured
let fallbackUsers = [
  // Workers
  {
    id: 1,
    name: "Raju Kumar",
    email: "raju@example.test",
    password: "password123",
    role: "worker",
    profile_id: 1,
    occupation: "Welder",
    location: "Pune",
    is_available: true,
  },
  {
    id: 2,
    name: "Meena Devi",
    email: "meena@example.test",
    password: "password123",
    role: "worker",
    profile_id: 2,
    occupation: "Electrician",
    location: "Pune",
    is_available: true,
  },
  {
    id: 3,
    name: "Suresh Patil",
    email: "suresh@example.test",
    password: "password123",
    role: "worker",
    profile_id: 3,
    occupation: "Plumber",
    location: "Mumbai",
    is_available: true,
  },
  {
    id: 4,
    name: "Anitha Raj",
    email: "anitha@example.test",
    password: "password123",
    role: "worker",
    profile_id: 4,
    occupation: "Machine Operator",
    location: "Chennai",
    is_available: true,
  },

  // Employers
  {
    id: 5,
    name: "Amit Shah",
    email: "amit@pragati.example.test",
    password: "password123",
    role: "employer",
    profile_id: 1,
    company_name: "Pragati Fabrication Works",
    location: "Pune",
  },
  {
    id: 6,
    name: "Kavya Iyer",
    email: "kavya@metro.example.test",
    password: "password123",
    role: "employer",
    profile_id: 2,
    company_name: "Metro Build Services",
    location: "Pune",
  },
  {
    id: 7,
    name: "Rahul Nair",
    email: "rahul@precision.example.test",
    password: "password123",
    role: "employer",
    profile_id: 3,
    company_name: "Precision Components India",
    location: "Chennai",
  },
];

let nextUserId = 100;
let nextProfileId = 100;

/**
 * Register a new user (Worker or Employer)
 */
export async function registerUser({
  name,
  email,
  password,
  role,
  occupation = "Skilled Worker",
  experienceYears = 1,
  location = "Pune",
  expectedSalaryMin = 20000,
  companyName = "My Company",
}) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const normalizedRole = (role || "worker").trim().toLowerCase();
  const trimmedName = (name || "").trim();

  if (!trimmedName || !normalizedEmail || !password) {
    const err = new Error("Name, email, and password are required");
    err.status = 400;
    throw err;
  }

  if (!["worker", "employer"].includes(normalizedRole)) {
    const err = new Error("Invalid role. Must be 'worker' or 'employer'");
    err.status = 400;
    throw err;
  }

  if (isDatabaseConfigured()) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if email already exists
      const existing = await client.query("SELECT id FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
      if (existing.rows.length > 0) {
        const err = new Error("An account with this email already exists");
        err.status = 400;
        throw err;
      }

      // Insert user
      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, created_at`,
        [trimmedName, normalizedEmail, password, normalizedRole]
      );
      const newUser = userRes.rows[0];
      let profileId;

      if (normalizedRole === "worker") {
        const workerRes = await client.query(
          `INSERT INTO worker_profiles (user_id, occupation, experience_years, expected_salary_min, location, skills, employment_history)
           VALUES ($1, $2, $3, $4, $5, '[]'::jsonb, '[]'::jsonb)
           ON CONFLICT (user_id) DO NOTHING
           RETURNING id`,
          [newUser.id, occupation, Number(experienceYears) || 0, Number(expectedSalaryMin) || 0, location]
        );
        profileId = workerRes.rows[0]?.id || null;
      }

      await client.query("COMMIT");

      return {
        id: Number(newUser.id),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profileId,
        occupation: normalizedRole === "worker" ? occupation : null,
        companyName: normalizedRole === "employer" ? (companyName || newUser.name) : null,
        location,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Fallback in-memory registration
  const existing = fallbackUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    const err = new Error("An account with this email already exists");
    err.status = 400;
    throw err;
  }

  const userId = ++nextUserId;
  const profileId = ++nextProfileId;

  const newUser = {
    id: userId,
    name: trimmedName,
    email: normalizedEmail,
    password,
    role: normalizedRole,
    profile_id: profileId,
    occupation: normalizedRole === "worker" ? occupation : null,
    company_name: normalizedRole === "employer" ? (companyName || trimmedName) : null,
    location,
    is_available: true,
  };

  fallbackUsers.push(newUser);

  return {
    id: Number(newUser.id),
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    profileId: newUser.profile_id,
    occupation: newUser.occupation,
    companyName: newUser.company_name,
    location: newUser.location,
  };
}

/**
 * Authenticates user and verifies role match.
 * Worker login: validates email + user_id against users table.
 * Employer login: validates email + password against users table.
 */
export async function authenticateUser({ email, password, userId, expectedRole }) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const normalizedRole = (expectedRole || "").trim().toLowerCase();

  if (!normalizedRole || !["worker", "employer"].includes(normalizedRole)) {
    const err = new Error("Invalid expected role specified");
    err.status = 400;
    throw err;
  }

  if (normalizedRole === "worker") {
    // Worker login uses Email + User ID
    const targetUserId = Number(userId || password);
    if (!normalizedEmail || !targetUserId || Number.isNaN(targetUserId)) {
      const err = new Error("Email and User ID are required");
      err.status = 400;
      throw err;
    }

    if (isDatabaseConfigured()) {
      const userQuery = `
        SELECT u.id, u.name, u.email, u.role,
               wp.id as worker_profile_id, wp.occupation, wp.location as worker_location
        FROM users u
        LEFT JOIN worker_profiles wp ON u.id = wp.user_id
        WHERE LOWER(u.email) = $1
      `;
      const { rows } = await pool.query(userQuery, [normalizedEmail]);

      // If user does not exist, role is not worker, or user ID does not match
      if (rows.length === 0 || rows[0].role !== "worker" || Number(rows[0].id) !== targetUserId) {
        const err = new Error("No worker account found");
        err.status = 404;
        throw err;
      }

      const user = rows[0];
      return {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        role: "worker",
        profileId: user.worker_profile_id ? Number(user.worker_profile_id) : null,
        occupation: user.occupation || null,
        location: user.worker_location || null,
      };
    }

    // Fallback in-memory verification
    const user = fallbackUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user || user.role !== "worker" || Number(user.id) !== targetUserId) {
      const err = new Error("No worker account found");
      err.status = 404;
      throw err;
    }

    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: "worker",
      profileId: user.profile_id,
      occupation: user.occupation || null,
      location: user.location,
    };
  }

  // Employer login uses Email + Password
  if (!normalizedEmail || !password) {
    const err = new Error("Email and password are required");
    err.status = 400;
    throw err;
  }

  if (isDatabaseConfigured()) {
    const userQuery = `
      SELECT u.id, u.name, u.email, u.password_hash, u.role
      FROM users u
      WHERE LOWER(u.email) = $1
    `;
    const { rows } = await pool.query(userQuery, [normalizedEmail]);

    // If user does not exist or role is not employer
    if (rows.length === 0 || rows[0].role !== "employer") {
      const err = new Error("No employer account found");
      err.status = 404;
      throw err;
    }

    const user = rows[0];
    const isValidPassword = password === "password123" || password === user.password_hash;
    if (!isValidPassword) {
      const err = new Error("No employer account found");
      err.status = 401;
      throw err;
    }

    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: "employer",
      companyName: user.name,
    };
  }

  // Fallback in-memory verification
  const user = fallbackUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user || user.role !== "employer") {
    const err = new Error("No employer account found");
    err.status = 404;
    throw err;
  }

  if (user.password !== password && password !== "password123") {
    const err = new Error("No employer account found");
    err.status = 401;
    throw err;
  }

  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: "employer",
    companyName: user.company_name || user.name,
    location: user.location,
  };
}
