const fs = require('fs');

const [,, logFile, ...args] = process.argv;

fs.appendFileSync(logFile, `${JSON.stringify({ args })}\n`);
