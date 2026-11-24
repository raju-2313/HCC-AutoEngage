import "dotenv/config";
import { Client, GatewayIntentBits, PermissionFlagsBits } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
  const botMember = await guild.members.fetchMe();
  const channel = await guild.channels.fetch("1538470372918165587");

  console.log(
    "Bot roles:",
    botMember.roles.cache.map((r) => `${r.name} (${r.id})`),
  );
  console.log("\nChannel permission overwrites:");
  channel.permissionOverwrites.cache.forEach((ow) => {
    console.log(`  Overwrite for ID ${ow.id} (type: ${ow.type}):`);
    console.log(`    Allow: ${ow.allow.toArray().join(", ") || "none"}`);
    console.log(`    Deny:  ${ow.deny.toArray().join(", ") || "none"}`);
  });

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
