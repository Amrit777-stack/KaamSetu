import app from "./app.js";

// app.js owns the single API server and routes. This import keeps
// `node src/server.js` working as documented without starting a second server.
export default app;
