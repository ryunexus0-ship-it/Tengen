const { embedError } = require("../utils/embeds");

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(message, client) {
    // Ignorar bots y mensajes sin prefijo
    if (message.author.bot) return;
    if (!message.content.startsWith(client.PREFIX)) return;

    // Parsear comando y argumentos
    const args        = message.content.slice(client.PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return; // Silencioso si no existe el comando

    // Crear un objeto compatible con interaction para reutilizar los mismos execute()
    // Usamos un adaptador liviano que simula la API de ChatInputCommandInteraction
    const fakeInteraction = buildFakeInteraction(message, args, command);

    try {
      await command.execute(fakeInteraction, client);
    } catch (err) {
      console.error(`[Prefix] Error en +${commandName}:`, err);
      message.reply({ embeds: [embedError("Hubo un error al ejecutar este comando.")] }).catch(() => {});
    }
  },
};

/**
 * Construye un objeto que imita ChatInputCommandInteraction
 * para que los comandos slash puedan ejecutarse con prefijo.
 *
 * Limitaciones: no soporta subcomandos, autocomplete, ni select menus.
 * Para opciones, parsea argumentos posicionales en el orden en que
 * están declarados en command.data.options.
 */
function buildFakeInteraction(message, args, command) {
  // Mapa de opciones parseadas: nombre -> valor
  const optionValues = {};
  const options      = command.data.options ?? [];

  options.forEach((opt, index) => {
    const raw = args[index];
    if (raw === undefined) return;

    switch (opt.type) {
      case 4: // INTEGER
        optionValues[opt.name] = parseInt(raw, 10);
        break;
      case 10: // NUMBER
        optionValues[opt.name] = parseFloat(raw);
        break;
      case 6: { // USER — puede ser mención o ID
        const id = raw.replace(/[<@!>]/g, "");
        optionValues[opt.name] = message.guild?.members.cache.get(id)?.user ?? null;
        optionValues[`__member_${opt.name}`] = message.guild?.members.cache.get(id) ?? null;
        break;
      }
      default: // STRING y otros
        // Si es el último argumento string, unir el resto
        if (index === options.length - 1 && opt.type === 3) {
          optionValues[opt.name] = args.slice(index).join(" ");
        } else {
          optionValues[opt.name] = raw;
        }
    }
  });

  let _replied = false;
  let _deferred = false;

  const sendReply = async (payload) => {
    if (_replied) {
      return message.channel.send(payload).catch(() => {});
    }
    _replied = true;
    return message.reply(payload).catch(() => {});
  };

  return {
    // ── Identidad ────────────────────────────────────────────────────────
    commandName: command.data.name,
    user:        message.author,
    member:      message.member,
    guild:       message.guild,
    channel:     message.channel,
    guildId:     message.guildId,
    channelId:   message.channelId,
    client:      message.client,

    // ── Estado ───────────────────────────────────────────────────────────
    get replied()  { return _replied; },
    get deferred() { return _deferred; },

    isChatInputCommand: () => true,

    // ── Opciones ─────────────────────────────────────────────────────────
    options: {
      getString:  (name) => optionValues[name] ?? null,
      getInteger: (name) => optionValues[name] ?? null,
      getNumber:  (name) => optionValues[name] ?? null,
      getBoolean: (name) => {
        const v = optionValues[name];
        if (v === undefined || v === null) return null;
        return v === "true" || v === "1" || v === "si" || v === "yes";
      },
      getUser:   (name) => optionValues[name] ?? null,
      getMember: (name) => optionValues[`__member_${name}`] ?? null,
      getSubcommand: () => null,
    },

    // ── Respuestas ───────────────────────────────────────────────────────
    reply:   async (payload) => sendReply(sanitizePayload(payload)),
    followUp: async (payload) => message.channel.send(sanitizePayload(payload)).catch(() => {}),
    editReply: async (payload) => {
      // No tenemos referencia al mensaje enviado, ignoramos silenciosamente
    },
    deferReply: async () => {
      _deferred = true;
    },
  };
}

/**
 * Elimina flags de Discord que no aplican en mensajes normales (e.g. ephemeral).
 */
function sanitizePayload(payload) {
  if (typeof payload !== "object" || payload === null) return payload;
  const clean = { ...payload };
  delete clean.ephemeral;
  delete clean.flags;
  return clean;
}
