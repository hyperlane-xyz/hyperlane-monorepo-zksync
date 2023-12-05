#! /usr/bin/env node
import figlet from 'figlet';
import yargs from 'yargs';

import { errorRed } from './logger.js';
import { chainsCommand } from './src/commands/chains.js';
import { configCommand } from './src/commands/config.js';
import { deployCommand } from './src/commands/deploy.js';
import { sendCommand } from './src/commands/send.js';
import { statusCommand } from './src/commands/status.js';
import { VERSION } from './src/version.js';

// From yargs code:
const MISSING_PARAMS_ERROR = 'Not enough non-option arguments';

try {
  await yargs(process.argv.slice(2))
    .scriptName('hyperlane')
    .command(chainsCommand)
    .command(configCommand)
    .command(deployCommand)
    .command(sendCommand)
    .command(statusCommand)
    .version(VERSION)
    .demandCommand()
    .strict()
    .help()
    .fail((msg, err, yargs) => {
      if (msg && !msg.includes(MISSING_PARAMS_ERROR)) errorRed('Error: ' + msg);
      console.log(figlet.textSync('Hyperlane', { font: 'ANSI Shadow' }));
      yargs.showHelp();
      if (err) errorRed(err.toString());
      process.exit(1);
    }).argv;
} catch (error: any) {
  errorRed('Error: ' + error.message);
}
