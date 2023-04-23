import 'dotenv/config';
import { getRPSChoices } from './game.js';
import {
  capitalize,
  InstallGlobalCommands,
  InstallGuildCommands,
} from './utils.js';
import { getGames } from './data/games.js';

// Get the game choices from game.js
function createGameCommandChoices() {
  const choices = getGames();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

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
  name: 'veto',
  description: 'Setup what maps will be played in a Best of 5 series',
  options: [
    {
      type: 3,
      name: 'game',
      description: 'The game to create a series for',
      required: true,
      choices: createGameCommandChoices(),
    },
  ],
  type: 1,
};

// const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, [TEST_COMMAND]);
InstallGuildCommands(
  process.env.APP_ID,
  process.env.BOT_LAND_GUILD_ID,
  [MAP_VETO_COMMAND]
);
