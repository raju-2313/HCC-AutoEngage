import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
  console.log("Guild:", guild.name);
  console.log("\nRoles:");
  guild.roles.cache.forEach((r) => {
    console.log(
      `  ${r.name.padEnd(25)} | ID: ${r.id} | Position: ${r.position} | Perms: ${r.permissions.bitfield}`,
    );
  });
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
