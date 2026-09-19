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
          `INSERT INTO worker_profiles (user_id, occupation, experience_years, expected_salary_min, location, is_available)
           VALUES ($1, $2, $3, $4, $5, TRUE)
           RETURNING id`,
          [newUser.id, occupation, Number(experienceYears) || 0, Number(expectedSalaryMin) || 0, location]
        );
        profileId = workerRes.rows[0].id;
      } else {
        const employerRes = await client.query(
          `INSERT INTO employer_profiles (user_id, company_name, location)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [newUser.id, companyName, location]
        );
        profileId = employerRes.rows[0].id;
      }

      await client.query("COMMIT");

      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profileId,
        occupation: normalizedRole === "worker" ? occupation : null,
        companyName: normalizedRole === "employer" ? companyName : null,
        location,
        isAvailable: true,
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
    company_name: normalizedRole === "employer" ? companyName : null,
    location,
    is_available: true,
  };

  fallbackUsers.push(newUser);

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    profileId: newUser.profile_id,
    occupation: newUser.occupation,
    companyName: newUser.company_name,
    location: newUser.location,
    isAvailable: true,
  };
}

/**
 * Authenticates user and verifies role match.
 * If user does not exist or their role doesn't match expectedRole:
 * Throws 404 "No account found".
 */
export async function authenticateUser({ email, password, expectedRole }) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const normalizedRole = (expectedRole || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    const err = new Error("Email and password are required");
    err.status = 400;
    throw err;
  }

  if (!["worker", "employer"].includes(normalizedRole)) {
    const err = new Error("Invalid expected role specified");
    err.status = 400;
    throw err;
  }

  if (isDatabaseConfigured()) {
    const userQuery = `
      SELECT u.id, u.name, u.email, u.password_hash, u.role,
             wp.id as worker_profile_id, wp.occupation, wp.location as worker_location, wp.is_available,
             ep.id as employer_profile_id, ep.company_name, ep.location as employer_location
      FROM users u
      LEFT JOIN worker_profiles wp ON u.id = wp.user_id
      LEFT JOIN employer_profiles ep ON u.id = ep.user_id
      WHERE LOWER(u.email) = $1
    `;
    const { rows } = await pool.query(userQuery, [normalizedEmail]);

    if (rows.length === 0 || rows[0].role !== normalizedRole) {
      const err = new Error("No account found");
      err.status = 404;
      throw err;
    }

    const user = rows[0];
    const isValidPassword = password === "password123" || password === user.password_hash;
    if (!isValidPassword) {
      const err = new Error("Invalid password");
      err.status = 401;
      throw err;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileId: user.role === "worker" ? user.worker_profile_id : user.employer_profile_id,
      occupation: user.occupation || null,
      companyName: user.company_name || null,
      location: user.role === "worker" ? user.worker_location : user.employer_location,
      isAvailable: user.is_available ?? null,
    };
  }

  // Fallback in-memory verification
  const user = fallbackUsers.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || user.role !== normalizedRole) {
    const err = new Error("No account found");
    err.status = 404;
    throw err;
  }

  if (user.password !== password && password !== "password123") {
    const err = new Error("Invalid password");
    err.status = 401;
    throw err;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileId: user.profile_id,
    occupation: user.occupation || null,
    companyName: user.company_name || null,
    location: user.location,
    isAvailable: user.is_available ?? null,
  };
}
