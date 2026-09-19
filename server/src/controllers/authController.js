import { authenticateUser, registerUser } from "../services/authService.js";

/**
 * POST /api/auth/login
 * Authenticates user and checks role match.
 */
export async function login(request, response) {
  try {
    const { email, password, expectedRole } = request.body;
    const user = await authenticateUser({ email, password, expectedRole });
    return response.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user,
    });
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({ error: error.message });
  }
}

/**
 * POST /api/auth/register
 * Registers a new worker or employer.
 */
export async function register(request, response) {
  try {
    const user = await registerUser(request.body);
    return response.status(201).json({
      success: true,
      message: `Account created successfully. Welcome to KaamSetu, ${user.name}!`,
      user,
    });
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({ error: error.message });
  }
}
