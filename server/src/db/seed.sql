INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Raju Kumar', 'worker1@kaamsetu.demo', 'user-id-only', 'worker'),
  (2, 'Meena Devi', 'worker2@kaamsetu.demo', 'user-id-only', 'worker'),
  (3, 'Suresh Patil', 'worker3@kaamsetu.demo', 'user-id-only', 'worker'),
  (4, 'Anitha Raj', 'worker4@kaamsetu.demo', 'user-id-only', 'worker'),
  (5, 'Amit Shah', 'employer5@kaamsetu.demo', 'password123', 'employer'),
  (6, 'Kavya Iyer', 'employer6@kaamsetu.demo', 'password123', 'employer'),
  (7, 'Rahul Nair', 'employer7@kaamsetu.demo', 'password123', 'employer');

INSERT INTO worker_profiles (id, user_id, occupation, experience_years, expected_salary_min, location, preferred_shift, language, is_available) VALUES
  (1, 1, 'Welder', 4, 20000, 'Pune', 'day', 'hi-IN', TRUE),
  (2, 2, 'Electrician', 6, 24000, 'Pune', 'day', 'mr-IN', TRUE),
  (3, 3, 'Plumber', 3, 18000, 'Mumbai', 'flexible', 'hi-IN', TRUE),
  (4, 4, 'Machine Operator', 5, 23000, 'Chennai', 'night', 'ta-IN', TRUE);

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

INSERT INTO applications (worker_id, job_id, status, updated_at) VALUES
  (1, 1, 'shortlisted', NOW()),
  (1, 2, 'applied', NOW()),
  (2, 4, 'shortlisted', NOW()),
  (3, 7, 'applied', NOW()),
  (4, 10, 'shortlisted', NOW());

SELECT setval('users_id_seq', 7, true);
SELECT setval('worker_profiles_id_seq', 4, true);
SELECT setval('employer_profiles_id_seq', 3, true);
SELECT setval('jobs_id_seq', 12, true);
