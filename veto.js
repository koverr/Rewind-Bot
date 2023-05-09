import 'dotenv/config';
import {
  InteractionResponseType,
  MessageComponentTypes,
  ButtonStyleTypes,
  InteractionResponseFlags,
} from 'discord-interactions';
import {
  TEAM_SELECT_BUTTON_ID,
  VETO_JOIN_BUTTON_ID,
} from './constants.js';
import {
  CreateMessage,
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
  const veto = activeVetos[vetoId];
  const initUser = await GetUser(veto.initUser);
  const joinUser = await GetUser(veto.joinUser);

  if (!isValidVetoInteraction(veto, interactionUser)) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        //TODO: Fix formatting
        content: 'You are not part of this veto',
        flags: InteractionResponseFlags.EPHEMERAL,
      },
    });
  }
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
      gameId
    );
    //TODO: Send message to coinflip winner
    await CreateMessage(channel.id, {
      content: `<@${coinflipWinner.id}>, select Team A or B. Try \`/veto help\` to learn what this means.`,
      components: [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            {
              type: MessageComponentTypes.BUTTON,
              custom_id: `${TEAM_SELECT_BUTTON_ID}${vetoId}/a`,
              label: '🅰️',
              style: ButtonStyleTypes.SECONDARY,
            },
            {
              type: MessageComponentTypes.BUTTON,
              custom_id: `${TEAM_SELECT_BUTTON_ID}${vetoId}/b`,
              label: '🅱️',
              style: ButtonStyleTypes.SECONDARY,
            },
          ],
        },
      ],
    });
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

export function doVetoHelp(res) {
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      //TODO: Fix formatting
      content: `MAP PICKS AND BANS

      1) Flip a coin. The winner decides whether they represent Team A or Team B.
      
      2) Team A bans one Hardpoint map, after which Team B bans another. Team A then selects the first Hardpoint map (Map 1), following which Team B selects the second (Map 4).
      
      3) Team B then selects the first Search and Destroy map to be banned. Team A then bans a second Search and Destroy map. Team B selects the first Search and Destroy map (Map 2) while Team A selects the second Search and Destroy map (Map 5).
      
      4) Finally, Team A bans a Control map, then Team B selects which map to play between the remaining two Control maps (Map 3).
      
      For all maps, the team that did NOT select the map may choose side. For example, since Team A selected Map 1, Team B will determine which side to start on for that map.
      
      Team A hosts Maps 1 and 3, Team B hosts Maps 2, 4, and 5.`,
      flags: InteractionResponseFlags.EPHEMERAL,
    },
  });
}
