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
      { nombre: "spin-raza",    args: "[reroll:True]",  desc: "Obtén tu raza. Añade reroll:True para gastar 1 RR y volver a tirar." },
      { nombre: "spin-tecnica", args: "[reroll:True]",  desc: "Obtén tu técnica. Añade reroll:True para gastar 1 RR." },
    ],
  },
  {
    categoria: "🏪 Tiendas",
    items: [
      { nombre: "tienda",     args: "",               desc: "Muestra la tienda general (monedas)." },
      { nombre: "tienda-pm",  args: "",               desc: "Muestra la tienda de Puntos Malditos." },
      { nombre: "comprar",    args: "item:<nombre>",  desc: "Compra un ítem de cualquier tienda." },
      { nombre: "inventario", args: "",               desc: "Muestra tu inventario." },
    ],
  },
  {
    categoria: "🛡️ Staff",
    items: [
      { nombre: "ajustar-stats",  args: "usuario:<@> stat:<stat> valor:<n>", desc: "Modifica un stat directamente." },
      { nombre: "ajustar-rango",  args: "usuario:<@> rango:<rango>",         desc: "Cambia el rango de un usuario." },
      { nombre: "dar-dinero",     args: "usuario:<@> cantidad:<n>",           desc: "Da o quita monedas." },
      { nombre: "dar-pm",         args: "usuario:<@> cantidad:<n>",           desc: "Da o quita Puntos Malditos." },
      { nombre: "crear-item",     args: "nombre:<n> tienda:<t> precio:<p> tipo:<t>", desc: "Crea un ítem en la tienda." },
      { nombre: "limpiar-db",     args: "tabla:<tabla> confirmar:CONFIRMAR",  desc: "Limpia una tabla de la base de datos." },
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
