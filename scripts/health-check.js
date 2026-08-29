const { spawnSync } = require('child_process');

function runCommand(command, args) {
  console.log(`\n> Running: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
  
  if (result.status !== 0) {
    console.error(`\n❌ Command failed with exit code ${result.status}`);
    process.exit(1);
  }
}

console.log('🏥 Starting Health Check...\n');

// 1. Type check
runCommand('npx', ['tsc', '--noEmit']);

// 2. Lint
runCommand('npm', ['run', 'lint']);

// 3. Tests
runCommand('npm', ['run', 'test']);

// 4. Security audit
runCommand('npm', ['audit', '--audit-level=high']);

console.log('\n✅ Health check passed successfully!');
