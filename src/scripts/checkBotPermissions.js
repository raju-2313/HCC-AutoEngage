import 'dotenv/config';
import { Client, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
  if (!guild) {
    console.error('Guild not found');
    process.exit(1);
  }

  const announcementChannelId = '1538470372918165587';
  const announcementChannel = await guild.channels.fetch(announcementChannelId).catch(() => null);

  if (!announcementChannel) {
    console.error(`Channel ${announcementChannelId} not found in guild!`);
  } else {
    console.log(`Found channel: ${announcementChannel.name} (${announcementChannel.id}), type: ${announcementChannel.type}`);
    const botMember = await guild.members.fetchMe();
    const permissions = announcementChannel.permissionsFor(botMember);
    console.log('Bot permissions in announcement channel:');
    console.log('  ViewChannel:', permissions.has(PermissionFlagsBits.ViewChannel));
    console.log('  SendMessages:', permissions.has(PermissionFlagsBits.SendMessages));
    console.log('  EmbedLinks:', permissions.has(PermissionFlagsBits.EmbedLinks));
    console.log('  MentionEveryone:', permissions.has(PermissionFlagsBits.MentionEveryone));
    console.log('  SendMessagesInThreads:', permissions.has(PermissionFlagsBits.SendMessagesInThreads));
  }

  // Also check general channel
  const generalChannel = await guild.channels.fetch('1538470672722952303').catch(() => null);
  if (generalChannel) {
    const botMember = await guild.members.fetchMe();
    const perms = generalChannel.permissionsFor(botMember);
    console.log('\nBot permissions in general channel:');
    console.log('  SendMessages:', perms.has(PermissionFlagsBits.SendMessages));
    console.log('  MentionEveryone:', perms.has(PermissionFlagsBits.MentionEveryone));
  }

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
