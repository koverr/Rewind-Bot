import 'dotenv/config';
import {
  capitalize,
  InstallGlobalCommands,
  InstallGuildCommands,
} from './utils.js';
import { getGames } from './data/games.js';

// Get the game choices from game.js
function createGameCommandChoices() {
  const commandChoices = [];
  getGames().forEach(function (choice) {
    commandChoices.push({
      name: capitalize(choice.name),
      value: choice.id,
    });
  });
  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
};

// Command containing options
const MAP_VETO_COMMAND = {
  type: 1,
  name: 'veto',
  description: 'Setup what maps will be played in a Best of 5 series',
  options: [
    {
      type: 6,
      name: 'captain',
      description: 'The captain to start the veto process with',
      required: true,
    },
    {
      type: 3,
      name: 'game',
      description: 'The game to create a series for',
      required: true,
      choices: createGameCommandChoices(),
    },
  ],
};

// const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, [TEST_COMMAND]);
InstallGuildCommands(
  process.env.APP_ID,
  process.env.BOT_LAND_GUILD_ID,
  [MAP_VETO_COMMAND]
);
