const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { COLORS } = require("../../utils/embeds");

const COMANDOS = [
  {
    categoria: "📋 Personaje",
    items: [
      { nombre: "registro",        args: "nombre:<nombre>",          desc: "Crea tu personaje." },
      { nombre: "perfil",          args: "[usuario]",                desc: "Muestra la ficha de un personaje." },
      { nombre: "usar-skillpoint", args: "stat:<stat>",              desc: "Sube un stat gastando 1 Skill Point." },
    ],
  },
  {
    categoria: "🎰 Spins",
    items: [
      { nombre: "spin-raza",    args: "",  desc: "Obtén o rerollea tu raza." },
      { nombre: "spin-tecnica", args: "",  desc: "Obtén o rerollea tu técnica maldita." },
    ],
  },
  {
    categoria: "🏪 Tiendas",
    items: [
      { nombre: "tienda",    args: "", desc: "Tienda general (usa monedas)." },
      { nombre: "tienda-pm", args: "", desc: "Tienda de Puntos Malditos." },
      { nombre: "inventario", args: "", desc: "Muestra tu inventario." },
    ],
  },
  {
    categoria: "🛡️ Staff",
    items: [
      { nombre: "ajustar-stats",  args: "usuario:<@> stat:<stat> valor:<n>", desc: "Modifica un stat directamente." },
      { nombre: "ajustar-rango",  args: "usuario:<@> rango:<rango>",         desc: "Cambia el rango de un usuario." },
      { nombre: "dar-dinero",     args: "usuario:<@> cantidad:<n>",           desc: "Da o quita monedas." },
      { nombre: "dar-pm",         args: "usuario:<@> cantidad:<n>",           desc: "Da o quita Puntos Malditos." },
      { nombre: "setup-roles",    args: "",                                   desc: "Crea todos los roles del servidor." },
    ],
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ayuda")
    .setDescription("Muestra todos los comandos disponibles."),

  async execute(interaction) {
    const lineas = [];

    for (const categoria of COMANDOS) {
      lineas.push(`**${categoria.categoria}**`);
      for (const cmd of categoria.items) {
        const uso = cmd.args ? ` ${cmd.args}` : "";
        lineas.push(`› \`+${cmd.nombre}${uso}\`  —  ${cmd.desc}`);
      }
      lineas.push("");
    }

    lineas.push("*También puedes usar `/comando` para todos los comandos de slash.*");

    const embed = new EmbedBuilder()
      .setColor(COLORS.principal)
      .setTitle("📖 Comandos de Tengen")
      .setDescription(lineas.join("\n"))
      .setFooter({ text: "Tengen · Prefijo: +" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
