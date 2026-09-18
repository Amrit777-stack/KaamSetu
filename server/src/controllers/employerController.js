import { emptyDirectory } from "../services/directoryService.js";

export function listEmployers(_request, response) {
  response.json(emptyDirectory("Employers"));
}
