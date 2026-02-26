import type { NextFunction, Request, Response } from 'express';
import Logger from "../logger.js";
import { DatabaseError } from "pg";
import { InternalServerError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } from '../errors.js';

function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  // TODO: look if a switch case is better here
  
  // Bad JSON
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json("Invalid JSON payload");
  }
  
  if (err instanceof DatabaseError) {
    Logger.databaseError(err.message, err.code);
    res.status(500).send("Internal Server Error");
    return;
  }

  if (err instanceof InternalServerError) {
    Logger.serverError("An internal server error occured", err.message);
    res.status(500).send("Internal Server Error");
    return;
  }

  if (err instanceof BadRequestError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(401).json({ error: err.message });
    return;
  }
  
  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message });
    return;
  }

  // Unexpected errors
  Logger.serverError("An unexpected error occured", err.message);
  if (err.stack) Logger.debug(err.stack);
  res.status(500).send("Internal Server Error");
};


export default errorMiddleware;