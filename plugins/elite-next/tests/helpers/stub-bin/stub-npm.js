// Fake `npm` used by tests — see tests/helpers/run-hook.js for the env-var contract.
function envInt(name, def) {
  return process.env[name] !== undefined ? parseInt(process.env[name], 10) : def;
}

const cmd = process.argv[2]; // "test"
if (cmd !== "test") {
  process.stderr.write(`stub-npm: no stub configured for "${cmd}"\n`);
  process.exit(1);
}

const status = envInt("STUB_NPM_TEST_STATUS", 0);
const stdout = process.env.STUB_NPM_TEST_STDOUT || "";
const stderr = process.env.STUB_NPM_TEST_STDERR || "";
const sleepMs = envInt("STUB_NPM_TEST_SLEEP_MS", 0);

function finish() {
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  process.exit(status);
}

if (sleepMs > 0) {
  setTimeout(finish, sleepMs);
} else {
  finish();
}
