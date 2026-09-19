import { pool, isDatabaseConfigured } from "../config/db.js";

// Mutable fallback seed jobs
let fallbackJobs = [
  { id: 1, employer_id: 1, company_name: "Pragati Fabrication Works", title: "MIG Welder", description: "Fabrication work for industrial equipment.", location: "Pune", salary_min: 22000, salary_max: 28000, required_experience: 3, shift: "day", openings: 3 },
  { id: 2, employer_id: 1, company_name: "Pragati Fabrication Works", title: "TIG Welder", description: "Precision welding for stainless steel assemblies.", location: "Pune", salary_min: 25000, salary_max: 32000, required_experience: 4, shift: "day", openings: 2 },
  { id: 3, employer_id: 1, company_name: "Pragati Fabrication Works", title: "Arc Welder", description: "Site welding and structural repair work.", location: "Pune", salary_min: 19000, salary_max: 24000, required_experience: 2, shift: "day", openings: 4 },
  { id: 4, employer_id: 2, company_name: "Metro Build Services", title: "Industrial Electrician", description: "Install and maintain factory electrical systems.", location: "Pune", salary_min: 24000, salary_max: 30000, required_experience: 4, shift: "day", openings: 2 },
  { id: 5, employer_id: 2, company_name: "Metro Build Services", title: "Building Electrician", description: "Residential and commercial electrical installation.", location: "Pune", salary_min: 20000, salary_max: 26000, required_experience: 2, shift: "day", openings: 3 },
  { id: 7, employer_id: 2, company_name: "Metro Build Services", title: "Plumber", description: "Commercial plumbing installation and repair.", location: "Mumbai", salary_min: 19000, salary_max: 25000, required_experience: 2, shift: "day", openings: 3 },
  { id: 9, employer_id: 3, company_name: "Precision Components India", title: "CNC Machine Operator", description: "Operate CNC turning and milling machines.", location: "Chennai", salary_min: 25000, salary_max: 31000, required_experience: 4, shift: "night", openings: 2 },
  { id: 10, employer_id: 3, company_name: "Precision Components India", title: "Machine Operator", description: "Operate production machinery and complete quality checks.", location: "Chennai", salary_min: 22000, salary_max: 27000, required_experience: 3, shift: "night", openings: 4 },
];

let nextJobId = 50;

export async function getJobs(filters = {}) {
  const { employer_id: employerId } = filters;

  if (isDatabaseConfigured()) {
    let query = `
      SELECT j.id, j.employer_id, ep.company_name, j.title, j.description, j.location,
             j.salary_min, j.salary_max, j.required_experience, j.shift, j.openings, j.created_at,
             COUNT(a.id)::int as applicant_count
      FROM jobs j
      JOIN employer_profiles ep ON j.employer_id = ep.id
      LEFT JOIN applications a ON j.id = a.job_id
    `;
    const values = [];

    if (employerId) {
      values.push(Number(employerId));
      query += ` WHERE j.employer_id = $1`;
    }

    query += ` GROUP BY j.id, ep.company_name ORDER BY j.created_at DESC`;

    const { rows } = await pool.query(query, values);
    return { data: rows };
  }

  // Fallback in-memory response
  let jobs = [...fallbackJobs];
  if (employerId) {
    jobs = jobs.filter((j) => j.employer_id === Number(employerId));
  }

  return { data: jobs };
}

export async function createJob({
  employerId,
  companyName = "Employer Company",
  title,
  description = "Industrial job opening",
  location = "Pune",
  salaryMin = 20000,
  salaryMax = 26000,
  requiredExperience = 1,
  shift = "day",
  openings = 2,
}) {
  if (!title) {
    const err = new Error("Job title is required");
    err.status = 400;
    throw err;
  }

  const numericEmployerId = Number(employerId) || 1;
  const numOpenings = Number(openings) || 1;
  const numSalaryMin = Number(salaryMin) || 18000;
  const numSalaryMax = Number(salaryMax) || 24000;

  if (isDatabaseConfigured()) {
    const insertQuery = `
      INSERT INTO jobs (employer_id, title, description, location, salary_min, salary_max, required_experience, shift, openings)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, employer_id, title, description, location, salary_min, salary_max, required_experience, shift, openings, created_at
    `;
    const values = [
      numericEmployerId,
      title,
      description,
      location,
      numSalaryMin,
      numSalaryMax,
      Number(requiredExperience) || 0,
      shift,
      numOpenings,
    ];
    const { rows } = await pool.query(insertQuery, values);
    return { ...rows[0], company_name: companyName };
  }

  const newJob = {
    id: ++nextJobId,
    employer_id: numericEmployerId,
    company_name: companyName,
    title,
    description,
    location,
    salary_min: numSalaryMin,
    salary_max: numSalaryMax,
    required_experience: Number(requiredExperience) || 0,
    shift,
    openings: numOpenings,
    created_at: new Date().toISOString(),
  };

  fallbackJobs.unshift(newJob);
  return newJob;
}
