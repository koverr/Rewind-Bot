import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
} from 'discord-interactions';
import { VerifyDiscordRequest, getRandomEmoji } from './utils.js';
import {
  doStartVeto,
  doStartVetoThread,
  doTeamSelect,
  doVetoHelp,
} from './veto.js';
import {
  TEAM_SELECT_BUTTON_ID,
  VETO_JOIN_BUTTON_ID,
} from './constants.js';

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

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, channel, data } = req.body;

  // Handle interaction types
  switch (type) {
    case InteractionType.PING:
      return res.send({ type: InteractionResponseType.PONG });

    case InteractionType.APPLICATION_COMMAND:
      // Get command name
      switch (data.name) {
        case 'test':
          doTest(res);
          break;
        case 'veto':
          // Don't allow vetos outside of a server text channel
          if (channel.type === 0) {
            doStartVeto(req, res);
          } else {
            await res.send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content:
                  'You can only start veto sessions in a server text channel',
                flags: InteractionResponseFlags.EPHEMERAL,
              },
            });
          }
          break;
        case 'veto-help':
          doVetoHelp(res);
          break;
      }
      break;

    case InteractionType.MESSAGE_COMPONENT:
      // custom_id set in payload when sending message component
      const componentId = data.custom_id;

      if (componentId.startsWith(VETO_JOIN_BUTTON_ID)) {
        await doStartVetoThread(componentId, req, res);
      }
      if (componentId.startsWith(TEAM_SELECT_BUTTON_ID)) {
        await doTeamSelect(componentId, req, res);
      }
      break;
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

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
