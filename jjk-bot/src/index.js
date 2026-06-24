require("dotenv").config();

const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const fs   = require("fs");
const path = require("path");
const { initDb } = require("./database/db");

// ─── Crear cliente ──────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.GuildMember],
});

client.commands = new Collection();

// ─── Cargar comandos de forma dinámica ──────────────────────────────────────
const commandsPath = path.join(__dirname, "commands");
const carpetas = fs.readdirSync(commandsPath);

for (const carpeta of carpetas) {
  const carpetaPath = path.join(commandsPath, carpeta);
  if (!fs.statSync(carpetaPath).isDirectory()) continue;

  const archivos = fs.readdirSync(carpetaPath).filter((f) => f.endsWith(".js"));
  for (const archivo of archivos) {
    const filePath = path.join(carpetaPath, archivo);
    const command  = require(filePath);

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      console.log(`[Commands] Cargado: /${command.data.name}`);
    } else {
      console.warn(`[Commands] Falta data/execute en: ${filePath}`);
    }
  }
}

// ─── Cargar eventos de forma dinámica ───────────────────────────────────────
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"));

for (const archivo of eventFiles) {
  const filePath = path.join(eventsPath, archivo);
  const event    = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`[Events] Registrado: ${event.name}`);
}

// ─── Inicializar DB y conectar ───────────────────────────────────────────────
(async () => {
  try {
    await initDb();
    console.log("[DB] Base de datos inicializada.");
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error("[FATAL] No se pudo iniciar el bot:", err);
    process.exit(1);
  }
})();
