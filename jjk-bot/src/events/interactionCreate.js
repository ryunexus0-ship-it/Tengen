const { embedError } = require("../utils/embeds");

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(interaction, client) {
    // Solo manejamos slash commands aquí
    // Los botones de tienda/spin se manejan dentro del colector del comando
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.warn(`[Commands] Comando desconocido: ${interaction.commandName}`);
      return interaction.reply({
        embeds: [embedError(`Comando \`/${interaction.commandName}\` no encontrado.`)],
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`[Commands] Error en /${interaction.commandName}:`, err);

      const respuestaError = {
        embeds: [embedError("Hubo un error al ejecutar este comando. Por favor intenta de nuevo.")],
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(respuestaError).catch(() => {});
      } else {
        await interaction.reply(respuestaError).catch(() => {});
      }
    }
  },
};
