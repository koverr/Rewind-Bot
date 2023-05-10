import 'dotenv/config';
import fetch from 'node-fetch';
import { verifyKey } from 'discord-interactions';

export function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf, encoding) {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');

    const isValidRequest = verifyKey(
      buf,
      signature,
      timestamp,
      clientKey
    );
    if (!isValidRequest) {
      res.status(401).send('Bad request signature');
      throw new Error('Bad request signature');
    }
  };
}

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use node-fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent':
        'RewindBot (https://github.com/koverr/Rewind-Bot, 1.0.0)',
    },
    ...options,
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

export async function InstallGuildCommands(appId, guildId, commands) {
  // API endpoint to overwrite guild commands
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;

  try {
    await DiscordRequest(endpoint, {
      method: 'PUT',
      body: commands,
    });
  } catch (err) {
    console.error(err);
  }
}

export async function StartThreadWithMessage(
  channelId,
  messageId,
  user1,
  user2,
  game
) {
  const endpoint = `channels/${channelId}/messages/${messageId}/threads`;

  try {
    const res = await DiscordRequest(endpoint, {
      method: 'POST',
      body: {
        name: `${user1} & ${user2} ${game} Veto Thread`,
        auto_archive_duration: 60,
      },
    });
    return res.json();
  } catch (err) {
    console.error(err);
  }
}

export async function GetUser(userId) {
  const endpoint = `users/${userId}`;

  try {
    const res = await DiscordRequest(endpoint, {
      method: 'GET',
    });
    return res.json();
  } catch (err) {
    console.error(err);
  }
}

export async function CreateMessage(channelId, content) {
  const endpoint = `channels/${channelId}/messages`;

  try {
    return await DiscordRequest(endpoint, {
      method: 'POST',
      body: content,
    });
  } catch (err) {
    console.error(err);
  }
}

// Might not be usable
export async function CreateFollowUpMessage(applicationId, interactionToken, content) {
  const endpoint = `webhooks/${applicationId}/${interactionToken}`;

  try {
    await DiscordRequest(endpoint, {
      method: 'POST',
      body: content,
    });
  } catch (err) {
    console.error(err);
  }
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = [
    '😭',
    '😄',
    '😌',
    '🤓',
    '😎',
    '😤',
    '🤖',
    '😶‍🌫️',
    '🌏',
    '📸',
    '💿',
    '👋',
    '🌊',
    '✨',
  ];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
