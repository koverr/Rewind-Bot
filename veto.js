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
import { getGames } from './games.js';

// Store for in-progress games. In production, you'd want to use a DB
const activeVetos = {};
export function getActiveVetos() {
  return activeVetos;
}

export function doStartVeto(req, res) {
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

  if (!isValidVetoInteraction(veto, interactionUser, res)) return;

  console.log('Veto session found, and expected user interacted');

  const headUser = choice === 'heads' ? joinUser : initUser;
  const tailUser = choice === 'tails' ? joinUser : initUser;
  const coinflip = Math.random() < 0.5 ? 'heads' : 'tails';
  const coinflipWinner = coinflip === 'heads' ? headUser : tailUser;
  const coinflipLoser = coinflip === 'heads' ? tailUser : headUser;
  // Add to veto session
  veto.coinflipWinner = coinflipWinner.id;
  veto.coinflipLoser = coinflipLoser.id;

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
    // Wait a second so above edit doesn't f up the connected thread in the UI
    await new Promise((r) => setTimeout(r, 1000));
    const channel = await StartThreadWithMessage(
      req.body.channel_id,
      req.body.message.id,
      initUser.username,
      joinUser.username,
      gameId
    );
    //TODO: Refactor this to create "session status" message in thread
    // that will be updated as the veto progresses
    // then send ephemeral messages to each user while updating
    // the start of thread message and status message
    //
    // Maybe refactor into a DM only bot?
    await CreateMessage(channel.id, {
      content: `<@${coinflipWinner.id}>, select Team A or B. Try \`/veto-help\` to learn what this means.`,
      components: [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            {
              type: MessageComponentTypes.BUTTON,
              custom_id: `${TEAM_SELECT_BUTTON_ID}${vetoId}/a`,
              label: 'Team 🅰️',
              style: ButtonStyleTypes.SECONDARY,
            },
            {
              type: MessageComponentTypes.BUTTON,
              custom_id: `${TEAM_SELECT_BUTTON_ID}${vetoId}/b`,
              label: 'Team 🅱️',
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

export async function doTeamSelect(componentId, req, res) {
  const [vetoId, choice] = componentId
    .replace(TEAM_SELECT_BUTTON_ID, '')
    .split('/');
  const [users, gameId] = vetoId.split('-');
  const game = getGames().find((game) => game.id === gameId);
  const interactionUser = req.body.member.user.id;
  const veto = activeVetos[vetoId];
  const coinflipWinner = await GetUser(veto.coinflipWinner);
  const coinflipLoser = await GetUser(veto.coinflipLoser);

  if (veto.coinflipWinner !== interactionUser) {
    console.log('Unexpected user interaction');
    res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'You are not the coinflip winner, goofball 😜',
        flags: InteractionResponseFlags.EPHEMERAL,
      },
    });
    return;
  }

  // Add map and mode info to veto session
  veto.modes = [...game.modes];
  veto.mapset = [];

  // Team selected, start with veto process
  if (choice === 'a') {
    // will behave differently with status and ephemeral messages
    // await res.send({
    //   type: InteractionResponseType.UPDATE_MESSAGE,
    //   data: {
    //     content: `<@${veto.coinflipWinner}> selected Team A... waiting on their ${veto.modes[0]}`
    //   }
    // })
  }
}

function isValidVetoInteraction(veto, interactionUser, res) {
  if (!veto) {
    console.log('Veto session not found');
    res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Veto session not found',
        flags: InteractionResponseFlags.EPHEMERAL,
      },
    });
    return false;
  }
  if (veto.joinUser !== interactionUser) {
    console.log('Unexpected user interaction');
    if (veto.initUser === interactionUser) {
      console.log('User is the veto initiator');
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "You can't join your own veto request, silly 😜.",
          flags: InteractionResponseFlags.EPHEMERAL,
        },
      });
    } else {
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Mind your own business 😉',
          flags: InteractionResponseFlags.EPHEMERAL,
        },
      });
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
