import { ensureUserOccupationColumn, pool, isDatabaseConfigured } from "../config/db.js";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function passwordMatches(password, storedPassword) {
  // Existing demo/database accounts use plaintext passwords or the seed placeholder.
  // New registrations use scrypt; retain this compatibility while allowing those accounts to log in.
  if (!storedPassword?.startsWith("scrypt$")) {
    return password === storedPassword || (password === "password123" && storedPassword === "<bcrypt-hash-for-password123>");
  }

  const [, salt, expectedKey] = storedPassword.split("$");
  if (!salt || !expectedKey) return false;
  const actualKey = await scrypt(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedKey, "hex");
  return expectedBuffer.length === actualKey.length && timingSafeEqual(expectedBuffer, actualKey);
}

// Mutable in-memory accounts for demo/testing when PostgreSQL is not configured
let fallbackUsers = [
  // Workers
  {
    id: 1,
    name: "Raju Kumar",
    email: "worker1@kaamsetu.demo",
    role: "worker",
    profile_id: 1,
    occupation: "Welder",
    location: "Pune",
    is_available: true,
  },
  {
    id: 2,
    name: "Meena Devi",
    email: "worker2@kaamsetu.demo",
    role: "worker",
    profile_id: 2,
    occupation: "Electrician",
    location: "Pune",
    is_available: true,
  },
  {
    id: 3,
    name: "Suresh Patil",
    email: "worker3@kaamsetu.demo",
    role: "worker",
    profile_id: 3,
    occupation: "Plumber",
    location: "Mumbai",
    is_available: true,
  },
  {
    id: 4,
    name: "Anitha Raj",
    email: "worker4@kaamsetu.demo",
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
    email: "employer5@kaamsetu.demo",
    password: "password123",
    role: "employer",
    profile_id: 1,
    company_name: "Pragati Fabrication Works",
    location: "Pune",
  },
  {
    id: 6,
    name: "Kavya Iyer",
    email: "employer6@kaamsetu.demo",
    password: "password123",
    role: "employer",
    profile_id: 2,
    company_name: "Metro Build Services",
    location: "Pune",
  },
  {
    id: 7,
    name: "Rahul Nair",
    email: "employer7@kaamsetu.demo",
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
  occupation,
  experienceYears = 1,
  location = "Pune",
  expectedSalaryMin = 20000,
  companyName = "My Company",
}) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const normalizedRole = (role || "worker").trim().toLowerCase();
  const trimmedName = (name || "").trim();
  const trimmedOccupation = (occupation || "").trim();

  if (!trimmedName || !normalizedEmail || (normalizedRole === "employer" && !password) || (normalizedRole === "worker" && !trimmedOccupation)) {
    const err = new Error(normalizedRole === "employer" ? "Name, email, and password are required" : "Name, email, and basic occupation are required");
    err.status = 400;
    throw err;
  }

  if (!["worker", "employer"].includes(normalizedRole)) {
    const err = new Error("Invalid role. Must be 'worker' or 'employer'");
    err.status = 400;
    throw err;
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  if (!isValidEmail) {
    const err = new Error("Please enter a valid email address");
    err.status = 400;
    throw err;
  }

  if (isDatabaseConfigured()) {
    await ensureUserOccupationColumn();
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
        // Workers retain their issued-ID sign-in. Employer passwords are hashed
        // before they are persisted in the shared users table.
        `INSERT INTO users (name, email, password_hash, role, occupation)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, occupation, created_at`,
        [
          trimmedName,
          normalizedEmail,
          normalizedRole === "employer" ? await hashPassword(password) : "user-id-only",
          normalizedRole,
          normalizedRole === "worker" ? trimmedOccupation : null,
        ]
      );
      const newUser = userRes.rows[0];

      await client.query("COMMIT");

      return {
        id: Number(newUser.id),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profileId: null,
        occupation: newUser.occupation,
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
  const newUser = {
    id: userId,
    name: trimmedName,
    email: normalizedEmail,
    password: normalizedRole === "employer" ? await hashPassword(password) : undefined,
    role: normalizedRole,
    profile_id: null,
    occupation: normalizedRole === "worker" ? trimmedOccupation : null,
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
    profileId: null,
    occupation: newUser.occupation,
    companyName: newUser.company_name,
    location: newUser.location,
  };
}

/**
 * Authenticates user and verifies role match.
 * Workers sign in with an issued user ID; employers keep password-based access.
 */
export async function authenticateUser({ email, password, userId, expectedRole }) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const normalizedRole = (expectedRole || "").trim().toLowerCase();

  if (!normalizedRole || !["worker", "employer"].includes(normalizedRole)) {
    const err = new Error("Invalid expected role specified");
    err.status = 400;
    throw err;
  }

  const targetUserId = Number(userId);
  if (!normalizedEmail || (normalizedRole === "worker" && (!Number.isSafeInteger(targetUserId) || targetUserId <= 0)) || (normalizedRole === "employer" && !password)) {
    const err = new Error("Email and User ID are required");
    if (normalizedRole === "employer") err.message = "Email and password are required";
    err.status = 400;
    throw err;
  }

  if (isDatabaseConfigured()) {
    await ensureUserOccupationColumn();
    const userQuery = `
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.occupation
      FROM users u
      WHERE LOWER(u.email) = $1
    `;
    const { rows } = await pool.query(userQuery, [normalizedEmail]);

    if (rows.length === 0 || rows[0].role !== normalizedRole || (normalizedRole === "worker" && Number(rows[0].id) !== targetUserId)) {
      const err = new Error(`No ${normalizedRole} account found`);
      err.status = rows.length > 0 && rows[0].role === normalizedRole ? 401 : 404;
      throw err;
    }

    const user = rows[0];
    if (normalizedRole === "employer" && !(await passwordMatches(password, user.password_hash))) {
      const err = new Error("No employer account found");
      err.status = 401;
      throw err;
    }
    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      profileId: null,
      occupation: user.occupation || null,
      companyName: user.role === "employer" ? user.name : null,
      location: null,
    };
  }

  // Fallback follows the same worker-ID / employer-password split.
  const user = fallbackUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user || user.role !== normalizedRole || (normalizedRole === "worker" && Number(user.id) !== targetUserId)) {
    const err = new Error(`No ${normalizedRole} account found`);
    err.status = 404;
    throw err;
  }
  if (normalizedRole === "employer" && !(await passwordMatches(password, user.password))) {
    const err = new Error("No employer account found");
    err.status = 401;
    throw err;
  }

  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    profileId: null,
    occupation: user.occupation || null,
    companyName: user.role === "employer" ? (user.company_name || user.name) : null,
    location: user.location,
  };
}
