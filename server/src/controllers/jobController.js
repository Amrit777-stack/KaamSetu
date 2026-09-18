import { emptyDirectory } from "../services/directoryService.js";

export function listJobs(_request, response) {
  response.json(emptyDirectory("Jobs"));
}
