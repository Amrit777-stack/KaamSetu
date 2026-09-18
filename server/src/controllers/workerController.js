import { emptyDirectory } from "../services/directoryService.js";

export function listWorkers(_request, response) {
  response.json(emptyDirectory("Workers"));
}
