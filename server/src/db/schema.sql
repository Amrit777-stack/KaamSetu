CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('worker', 'employer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE worker_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  occupation VARCHAR(120) NOT NULL,
  experience_years NUMERIC(4, 1) NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  expected_salary_min INTEGER CHECK (expected_salary_min >= 0),
  location VARCHAR(160) NOT NULL,
  preferred_shift VARCHAR(50),
  language VARCHAR(20) NOT NULL DEFAULT 'hi-IN',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employer_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(180) NOT NULL,
  location VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
  id BIGSERIAL PRIMARY KEY,
  employer_id BIGINT NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(160) NOT NULL,
  salary_min INTEGER NOT NULL CHECK (salary_min >= 0),
  salary_max INTEGER NOT NULL CHECK (salary_max >= salary_min),
  required_experience NUMERIC(4, 1) NOT NULL DEFAULT 0 CHECK (required_experience >= 0),
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  shift VARCHAR(50),
  openings INTEGER NOT NULL DEFAULT 1 CHECK (openings >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE applications (
  id BIGSERIAL PRIMARY KEY,
  worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'shortlisted', 'rejected', 'hired', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (worker_id, job_id)
);

CREATE TABLE employment_history (
  id BIGSERIAL PRIMARY KEY,
  worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  employer_name VARCHAR(180) NOT NULL,
  role VARCHAR(120) NOT NULL,
  duration VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX jobs_location_idx ON jobs (location);
CREATE INDEX jobs_employer_idx ON jobs (employer_id);
CREATE INDEX applications_worker_idx ON applications (worker_id);
CREATE INDEX applications_worker_status_idx ON applications (worker_id, status);
