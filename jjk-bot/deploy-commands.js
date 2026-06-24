require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs   = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "src", "commands");
const carpetas = fs.readdirSync(commandsPath);

for (const carpeta of carpetas) {
  const carpetaPath = path.join(commandsPath, carpeta);
  if (!fs.statSync(carpetaPath).isDirectory()) continue;

  const archivos = fs.readdirSync(carpetaPath).filter((f) => f.endsWith(".js"));
  for (const archivo of archivos) {
    const filePath = path.join(carpetaPath, archivo);
    const command  = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
      console.log(`[Deploy] Preparado: /${command.data.name}`);
    }
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\n📡 Registrando ${commands.length} comandos slash...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log(`✅ Se registraron ${data.length} comandos slash exitosamente.`);
  } catch (err) {
    console.error("❌ Error al registrar comandos:", err);
    process.exit(1);
  }
})();
