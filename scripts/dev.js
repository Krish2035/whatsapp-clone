const { spawn, exec } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

// Terminal ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

console.log(`
${colors.green}${colors.bold}======================================================================
  📱 WhatsApp Clone - Starting All Website Services
======================================================================${colors.reset}
  ${colors.bold}🌐 Frontend Web App:${colors.reset}       ${colors.cyan}http://localhost:3000${colors.reset}
  ${colors.bold}⚙️  Backend API & Sockets:${colors.reset}  ${colors.cyan}http://localhost:5000${colors.reset}
  ${colors.bold}📚 API Documentation:${colors.reset}      ${colors.cyan}http://localhost:5000/api/docs${colors.reset}
  ${colors.bold}🐳 Docker Production Stack:${colors.reset} ${colors.yellow}docker compose up -d${colors.reset}
${colors.gray}----------------------------------------------------------------------
  Press Ctrl + C anytime to stop all services cleanly.
======================================================================${colors.reset}
`);

const children = [];

function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    try {
      exec(`taskkill /pid ${pid} /T /F`, () => {});
    } catch (e) {}
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (e) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (err) {}
    }
  }
}

let isShuttingDown = false;
function cleanExit() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${colors.yellow}[SYSTEM] Shutting down all website services...${colors.reset}`);
  for (const child of children) {
    if (child && child.pid) {
      killProcessTree(child.pid);
    }
  }
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
process.on('exit', () => {
  for (const child of children) {
    if (child && child.pid) {
      killProcessTree(child.pid);
    }
  }
});

function prefixStream(stream, prefix, color) {
  let buffer = '';
  stream.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${color}${prefix}${colors.reset} ${line}`);
      }
    }
  });
}

function startService(name, cwd, commandString, color) {
  const child = spawn(commandString, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  children.push(child);

  prefixStream(child.stdout, `[${name}]`, color);
  prefixStream(child.stderr, `[${name}]`, colors.red);

  child.on('error', (err) => {
    console.error(`${colors.red}[${name}] Failed to start: ${err.message}${colors.reset}`);
  });

  child.on('close', (code) => {
    if (!isShuttingDown && code !== 0 && code !== null) {
      console.log(`${colors.yellow}[${name}] Exited with code ${code}${colors.reset}`);
    }
  });

  return child;
}

// 1. Start Backend Server
startService('BACKEND', backendDir, 'npm run dev', colors.cyan);

// 2. Start Frontend Web App
startService('FRONTEND', frontendDir, 'npm run dev', colors.green);
