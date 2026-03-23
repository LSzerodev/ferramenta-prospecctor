import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];

function start(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] encerrado com codigo ${code}`);
    }
    shutdown(code ?? 0);
  });

  children.push(child);
}

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 250);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('api', process.execPath, [path.join(ROOT, 'src', 'server.js')], ROOT);
start('web', npmCommand, ['run', 'dev', '--prefix', 'web'], ROOT);
