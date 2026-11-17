import "dotenv/config";
import { Client, GatewayIntentBits, PermissionFlagsBits } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
  const botMember = await guild.members.fetchMe();
  console.log("Bot Guild Permissions:");
  console.log(
    "  Administrator:",
    botMember.permissions.has(PermissionFlagsBits.Administrator),
  );
  console.log(
    "  ManageChannels:",
    botMember.permissions.has(PermissionFlagsBits.ManageChannels),
  );
  console.log(
    "  ManageRoles:",
    botMember.permissions.has(PermissionFlagsBits.ManageRoles),
  );

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
