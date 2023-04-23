import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import {
  VerifyDiscordRequest,
  getRandomEmoji,
  DiscordRequest,
} from './utils.js';
import { getShuffledOptions, getResult } from './game.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(
  express.json({
    verify: VerifyDiscordRequest(process.env.PUBLIC_KEY),
  })
);

const VETO_JOIN_HEADS_ID = 'heads_button_';
const VETO_JOIN_TAILS_ID = 'tails_button_';

// Store for in-progress games. In production, you'd want to use a DB
const activeVetos = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

  // Handle interaction types
  switch (type) {
    case InteractionType.PING:
      return res.send({ type: InteractionResponseType.PONG });

    case InteractionType.APPLICATION_COMMAND:
      // Get command name
      switch (data.name) {
        case 'test':
          doTest(res);
        case 'veto':
          if (id) {
            doStartVeto(id, req, res);
          }
      }
      return;

    case InteractionType.MESSAGE_COMPONENT:
  }

  if (type === InteractionType.MESSAGE_COMPONENT) {
    // custom_id set in payload when sending message component
    const componentId = data.custom_id;

    if (componentId.startsWith(VETO_JOIN_HEADS_ID)) {
      return doSelectTeam(componentId, req, res);
    } else if (componentId.startsWith('select_choice_')) {
      // get the associated game ID
      const gameId = componentId.replace('select_choice_', '');

      if (activeVetos[gameId]) {
        // Get user ID and object choice for responding user
        const userId = req.body.member.user.id;
        const objectName = data.values[0];
        // Calculate result from helper function
        const resultStr = getResult(activeVetos[gameId], {
          id: userId,
          objectName,
        });

        // Remove game from storage
        delete activeVetos[gameId];
        // Update message with token in request body
        const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;

        try {
          // Send results
          await res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: resultStr },
          });
          // Update ephemeral message
          await DiscordRequest(endpoint, {
            method: 'PATCH',
            body: {
              content: 'Nice choice ' + getRandomEmoji(),
              components: [],
            },
          });
        } catch (err) {
          console.error('Error sending message:', err);
        }
      }
    }
  }
});

function doTest(res) {
  // Send a message into the channel where command was triggered from
  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      // Fetches a random emoji to send from a helper function
      content: 'hello world ' + getRandomEmoji(),
    },
  });
}

function doStartVeto(id, req, res) {
  const userId = req.body.member.user.id;
  // User's game choice
  const gameName = req.body.data.options[0].value;

  // Create active veto session using message ID as the veto ID
  activeVetos[id] = {
    id: userId,
    gameName,
  };

  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Map veto start from <@${userId}>, choose heads or tails to join`,
      components: [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            {
              type: MessageComponentTypes.BUTTON,
              // Append the game ID to use later on
              custom_id: `${VETO_JOIN_HEADS_ID}${req.body.id}`,
              label: 'Heads',
              style: ButtonStyleTypes.SECONDARY,
            },
            {
              type: MessageComponentTypes.BUTTON,
              // Append the game ID to use later on
              custom_id: `${VETO_JOIN_TAILS_ID}${req.body.id}`,
              label: 'Tails',
              style: ButtonStyleTypes.SECONDARY,
            },
          ],
        },
      ],
    },
  });
}

async function doSelectTeam(componentId, req, res) {
  // get the associated game ID
  const gameId = componentId.replace(VETO_JOIN_HEADS_ID, '');
  // Delete message with token in request body
  const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;
  try {
    await res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Team A or Team B?',
        // Indicates it'll be an ephemeral message
        flags: InteractionResponseFlags.EPHEMERAL,
        components: [
          {
            type: MessageComponentTypes.ACTION_ROW,
            components: [
              {
                type: MessageComponentTypes.STRING_SELECT,
                // Append game ID
                custom_id: `select_choice_${gameId}`,
                options: getShuffledOptions(),
              },
            ],
          },
        ],
      },
    });
    // Delete previous message
    await DiscordRequest(endpoint, { method: 'DELETE' });
  } catch (err) {
    console.error('Error sending message:', err);
  }
}

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
