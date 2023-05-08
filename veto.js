import 'dotenv/config';
import {
  InteractionResponseType,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import { VETO_JOIN_BUTTON_ID } from './constants.js';
import {
  DiscordRequest,
  GetUser,
  StartThreadWithMessage,
} from './utils.js';
import { getGames } from './data/games.js';

// Store for in-progress games. In production, you'd want to use a DB
const activeVetos = {};
export function getActiveVetos() {
  return activeVetos;
}

export function doStartVeto(id, req, res) {
  // The captain who requested the veto
  const user1 = req.body.member.user.id;
  // The captain the requester chose
  const user2 = req.body.data.options[0].value;
  //TODO: Don't allow same user, send ephemeral message
  //   if (user1 === user2) {
  //   }

  // User's game choice
  const gameId = req.body.data.options[1].value;
  const vetoId = `${[user1, user2].sort()}-${gameId}`;

  // Create active veto session using message ID as the veto ID
  // const game = getGames().find((game) => game.id === gameId);
  activeVetos[vetoId] = {
    id: vetoId,
    initUser: user1,
    joinUser: user2,
    // modes: [...game.modes],
  };

  // Start a thread with Captains and GMs
  // StartThreadWithMessage(
  //   process.env.BOT_LAND_GENERAL_ID,
  //   id,
  //   user1,
  //   user2,
  //   gameId
  // );

  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Hey <@${user2}>, <@${user1}> wants to start a map veto thread for a ${gameId} series, choose heads or tails to start the coinflip 🪙`,
      components: [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            {
              type: MessageComponentTypes.BUTTON,
              // Append the game ID to use later on
              custom_id: `${VETO_JOIN_BUTTON_ID}${vetoId}/heads`,
              label: 'Heads',
              style: ButtonStyleTypes.SECONDARY,
            },
            {
              type: MessageComponentTypes.BUTTON,
              // Append the game ID to use later on
              custom_id: `${VETO_JOIN_BUTTON_ID}${vetoId}/tails`,
              label: 'Tails',
              style: ButtonStyleTypes.SECONDARY,
            },
          ],
        },
      ],
    },
  });
}

export async function doStartVetoThread(componentId, req, res) {
  const [vetoId, choice] = componentId
    .replace(VETO_JOIN_BUTTON_ID, '')
    .split('/');
  const [users, gameId] = vetoId.split('-');
  const game = getGames().find((game) => game.id === gameId);
  const interactionUser = req.body.member.user.id;
  const veto = getActiveVetos()[vetoId];
  const initUser = await GetUser(veto.initUser);
  const joinUser = await GetUser(veto.joinUser);

  if (!isValidVetoInteraction(veto, interactionUser)) return;
  console.log('Veto session found, and expected user interacted');

  const headUser = choice === 'heads' ? joinUser : initUser;
  const tailUser = choice === 'tails' ? joinUser : initUser;
  const coinflip = Math.random() < 0.5 ? 'heads' : 'tails';
  const coinflipWinner = coinflip === 'heads' ? headUser : tailUser;

  try {
    await res.send({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: `${game.name} vetos between <@${veto.initUser}> and <@${veto.joinUser}> in progress!

Heads: <@${headUser.id}> | Tails: <@${tailUser.id}>

The flip was ${coinflip}! <@${coinflipWinner.id}> selecting Team A or B...`,
        components: [],
      },
    });
    const channel = await StartThreadWithMessage(
      req.body.channel_id,
      req.body.message.id,
      initUser.username,
      joinUser.username,
      gameId,
      coinflipWinner
    );
    //TODO: Send message to coinflip winner
  } catch (err) {
    console.error('Error sending message', err);
  }
}

function isValidVetoInteraction(veto, interactionUser) {
  if (!veto) {
    console.log('Veto session not found');
    //TODO: Send ephemeral message to user
    return false;
  }

  if (veto.joinUser !== interactionUser) {
    console.log('Unexpected user interaction');
    if (veto.initUser === interactionUser) {
      console.log('User is the veto initiator');
      //TODO: Send ephemeral message to user
    } else {
      console.log('User is not part of the veto');
      //TODO: Send ephemeral message to user
    }
    return false;
  }
  return true;
}
