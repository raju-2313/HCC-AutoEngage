import "dotenv/config";
import { Client, GatewayIntentBits, PermissionFlagsBits } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
  const botMember = await guild.members.fetchMe();
  const channel = await guild.channels.fetch("1538470372918165587");

  const perms = channel.permissionsFor(botMember);
  const canSend = perms.has(PermissionFlagsBits.SendMessages);
  const canEmbed = perms.has(PermissionFlagsBits.EmbedLinks);
  const canMention = perms.has(PermissionFlagsBits.MentionEveryone);

  console.log(
    JSON.stringify(
      {
        canSend,
        canEmbed,
        canMention,
        ready: canSend && canEmbed && canMention,
        botRoles: botMember.roles.cache.map((r) => r.name),
      },
      null,
      2,
    ),
  );

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
