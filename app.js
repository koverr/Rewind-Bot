import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { VerifyDiscordRequest, getRandomEmoji } from './utils.js';
import {
  doStartVeto,
  doStartVetoThread,
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
          break;
        case 'veto':
          if (id) {
            doStartVeto(id, req, res);
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
        await doSelectTeam(componentId, req, res);
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
