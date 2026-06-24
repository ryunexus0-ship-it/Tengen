const { query } = require("../database/db");
const tecnicasData = require("../../config/tecnicas");

module.exports = {
  name: "ready",
  once: true,

  async execute(client) {
    console.log(`✅ Bot conectado como: ${client.user.tag}`);
    console.log(`📡 Servidores: ${client.guilds.cache.size}`);

    // Sincronizar técnicas de la config a la base de datos
    try {
      for (const tecnica of tecnicasData) {
        await query(
          `INSERT INTO tecnicas (nombre, rareza, descripcion)
           VALUES ($1, $2, $3)
           ON CONFLICT (nombre) DO UPDATE
             SET rareza = EXCLUDED.rareza,
                 descripcion = EXCLUDED.descripcion`,
          [tecnica.nombre, tecnica.rareza, tecnica.descripcion]
        );
      }
      console.log(`[DB] ${tecnicasData.length} técnicas sincronizadas con la base de datos.`);
    } catch (err) {
      console.error("[DB] Error al sincronizar técnicas:", err);
    }

    client.user.setPresence({
      activities: [{ name: "JJK Rol | /registro  +registro", type: 0 }],
      status: "online",
    });
  },
};
