import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

function getDirectory() {
  const candidates = [
    path.resolve(process.cwd(), 'dist/controllers'),
    path.resolve(process.cwd(), 'controllers'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
  }

  return null
}

const controllerMiddleware = express.Router();
const controllersDir = getDirectory();

if (!controllersDir) {
  throw new Error('Controllers directory not found. Please ensure it exists in the project root or in the dist folder.');
}

for (const file of fs.readdirSync(controllersDir)) {
  if (!file.endsWith('.js')) continue;

  const name = file.slice(0, -3);
  if (!name) continue;

  const mountPath = name === 'root' ? '' : `/${name}`;
  const moduleUrl = pathToFileURL(path.join(controllersDir, file)).toString();

  const { default: Controller } = await import(moduleUrl);
  const controller = new Controller();
  controllerMiddleware.use(mountPath, controller.router);
}

export default controllerMiddleware;