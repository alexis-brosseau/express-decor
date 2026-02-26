import type { Request, Response } from 'express';

const ansi = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  },
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
  }
}

class Logger {

  incoming(req: Request, res: Response) {
    const uuid = res.locals.uuid || 'UNKNOWN';
    let fontColor;
    switch (req.method) {
      case "GET":
        fontColor = ansi.fg.blue;
        break;
      case "POST":
        fontColor = ansi.fg.green;
        break;
      case "PUT":
        fontColor = ansi.fg.yellow;
        break;
      case "DELETE":
        fontColor = ansi.fg.red;
        break;
      default:
        fontColor = ansi.fg.white;
    }

    const message = `${ansi.fg.white}[${res.locals.uuid}] ⇒ ${ansi.reset}${fontColor}${req.method}${ansi.reset} ${req.originalUrl} ${ansi.dim}from ${res.locals.ip}${ansi.reset}`;
    console.log(`${ansi.dim}${this.getTimestamp()} ${message}`);

    // JSON log data
    // const logData = {
    //   uuid,
    //   ip: res.locals.ip,
    //   direction: "incoming",
    //   method: req.method,
    //   url: req.originalUrl,
    //   headers: req.headers,
    //   body: req.body || {},
    // };
    //this.writeToFile(`${req.method} ${req.originalUrl}`, "request", logData);
  }

  outgoing(req: Request, res: Response, responseTime: number, body: unknown = null) {
    const uuid = res.locals.uuid || 'UNKNOWN';
    const statusCode = typeof res.statusCode === 'number' ? res.statusCode : parseInt(res.statusCode as any);
    
    let statusColor = ansi.fg.green;
    if (statusCode >= 400) statusColor = ansi.fg.red;
    else if (statusCode >= 300) statusColor = ansi.fg.yellow;
    
    const message = `${ansi.fg.white}[${uuid}] ⇐ ${ansi.reset}${statusColor}${statusCode}${ansi.reset} ${ansi.dim}(${responseTime}ms)${ansi.reset}${body ? ` ${body}` : ''}`;
    console.log(`${ansi.dim}${this.getTimestamp()} ${ansi.reset}${message}`);
    
    // JSON log data
    // const logData = {
    //   uuid,
    //   ip: res.locals.ip,
    //   direction: "outgoing",
    //   status: statusCode,
    //   responseTime: responseTime,
    //   body
    // };
    //this.writeToFile(`${statusCode}${body ? ` ${body}` : ''}`, "response", logData);
  }

  serverInfo(message: string) {
    const formattedMessage = `${ansi.fg.cyan}ⓘ INFO ${ansi.reset} ${message}`;
    console.log(`${this.getTimestamp()} ${formattedMessage}`);
  }

  serverWarning(message: string) {
    const formattedMessage = `${ansi.fg.yellow}⚠ WARN ${ansi.reset} ${message}`;
    console.log(`${this.getTimestamp()} ${formattedMessage}`);
  }

  serverError(message: string, error: unknown = null) {
    let formattedMessage = `${ansi.bg.red}${ansi.fg.white} ERROR ${ansi.reset} ${message}`;
    if (error) formattedMessage += ` - ${error}`;
    
    console.log(`${this.getTimestamp()} ${formattedMessage}`);
  }

  databaseError(message: string, code?: string) {
    const formattedMessage = `${ansi.bg.red}${ansi.fg.white} DB ERROR ${ansi.reset} [${code}] ${message}`;
    console.log(`${this.getTimestamp()} ${formattedMessage}`);
  }

  debug(message: string) {
    const formattedMessage = `${ansi.fg.magenta}🔍 DEBUG${ansi.reset} ${message}`;
    console.log(`${this.getTimestamp()} ${formattedMessage}`);
  }

  raw(message: string) {
    console.log(`${message}${ansi.reset}`);
  }


  getTimestamp() {
    const now = new Date();
    return `${ansi.fg.white}${now.toISOString()}${ansi.reset}`;
  }
}

const logger = new Logger();
export default logger;