INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Raju Kumar', 'raju@example.test', '$2b$10$demo.hash.not.for.production', 'worker'),
  (2, 'Meena Devi', 'meena@example.test', '$2b$10$demo.hash.not.for.production', 'worker'),
  (3, 'Suresh Patil', 'suresh@example.test', '$2b$10$demo.hash.not.for.production', 'worker'),
  (4, 'Anitha Raj', 'anitha@example.test', '$2b$10$demo.hash.not.for.production', 'worker'),
  (5, 'Amit Shah', 'amit@pragati.example.test', '$2b$10$demo.hash.not.for.production', 'employer'),
  (6, 'Kavya Iyer', 'kavya@metro.example.test', '$2b$10$demo.hash.not.for.production', 'employer'),
  (7, 'Rahul Nair', 'rahul@precision.example.test', '$2b$10$demo.hash.not.for.production', 'employer');

INSERT INTO worker_profiles (id, user_id, occupation, experience_years, expected_salary_min, location, preferred_shift, language) VALUES
  (1, 1, 'Welder', 4, 20000, 'Pune', 'day', 'hi-IN'),
  (2, 2, 'Electrician', 6, 24000, 'Pune', 'day', 'mr-IN'),
  (3, 3, 'Plumber', 3, 18000, 'Mumbai', 'flexible', 'hi-IN'),
  (4, 4, 'Machine Operator', 5, 23000, 'Chennai', 'night', 'ta-IN');

INSERT INTO employer_profiles (id, user_id, company_name, location) VALUES
  (1, 5, 'Pragati Fabrication Works', 'Pune'),
  (2, 6, 'Metro Build Services', 'Pune'),
  (3, 7, 'Precision Components India', 'Chennai');

INSERT INTO jobs (id, employer_id, title, description, location, salary_min, salary_max, required_experience, required_skills, shift, openings) VALUES
  (1, 1, 'MIG Welder', 'Fabrication work for industrial equipment.', 'Pune', 22000, 28000, 3, '["MIG welding", "fabrication"]', 'day', 3),
  (2, 1, 'TIG Welder', 'Precision welding for stainless steel assemblies.', 'Pune', 25000, 32000, 4, '["TIG welding", "blueprint reading"]', 'day', 2),
  (3, 1, 'Arc Welder', 'Site welding and structural repair work.', 'Pune', 19000, 24000, 2, '["arc welding", "safety"]', 'day', 4),
  (4, 2, 'Industrial Electrician', 'Install and maintain factory electrical systems.', 'Pune', 24000, 30000, 4, '["wiring", "panel maintenance"]', 'day', 2),
  (5, 2, 'Building Electrician', 'Residential and commercial electrical installation.', 'Pune', 20000, 26000, 2, '["wiring", "troubleshooting"]', 'day', 3),
  (6, 2, 'Maintenance Electrician', 'Maintain motors, cables, and electrical panels.', 'Pune', 23000, 29000, 3, '["motor maintenance", "wiring"]', 'rotating', 2),
  (7, 2, 'Plumber', 'Commercial plumbing installation and repair.', 'Mumbai', 19000, 25000, 2, '["pipe fitting", "repair"]', 'day', 3),
  (8, 2, 'Site Plumber', 'Plumbing work for an apartment construction site.', 'Mumbai', 18000, 23000, 1, '["PVC piping", "sanitary fitting"]', 'day', 5),
  (9, 3, 'CNC Machine Operator', 'Operate CNC turning and milling machines.', 'Chennai', 25000, 31000, 4, '["CNC operation", "quality inspection"]', 'night', 2),
  (10, 3, 'Machine Operator', 'Operate production machinery and complete quality checks.', 'Chennai', 22000, 27000, 3, '["machine operation", "quality inspection"]', 'night', 4),
  (11, 3, 'Assembly Machine Operator', 'Assembly-line operation for precision components.', 'Chennai', 20000, 24000, 2, '["assembly", "machine operation"]', 'day', 6),
  (12, 1, 'Fabrication Helper', 'Support welding and fabrication teams on the shop floor.', 'Pune', 16000, 19000, 0, '["material handling", "safety"]', 'day', 5);

INSERT INTO employment_history (worker_id, employer_name, role, duration) VALUES
  (1, 'Shivam Engineering', 'Welder', '2021 - 2025'),
  (2, 'Sai Electrical Services', 'Electrician', '2019 - 2025'),
  (3, 'Urban Plumbing Works', 'Plumber', '2022 - 2025'),
  (4, 'Southline Manufacturing', 'Machine Operator', '2020 - 2025');

INSERT INTO applications (worker_id, job_id, status) VALUES
  (1, 1, 'shortlisted'),
  (1, 2, 'applied'),
  (2, 4, 'shortlisted'),
  (3, 7, 'applied'),
  (4, 10, 'shortlisted');

SELECT setval('users_id_seq', 7, true);
SELECT setval('worker_profiles_id_seq', 4, true);
SELECT setval('employer_profiles_id_seq', 3, true);
SELECT setval('jobs_id_seq', 12, true);
