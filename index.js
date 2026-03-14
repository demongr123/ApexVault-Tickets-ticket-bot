const express = require("express");
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");
const config = require("./config");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send(`${config.brandName} bot is running.`);
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription(`Send the ${config.brandName} ticket panel`)
    .toJSON()
];

function normalizeName(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 20);
}

function getTicketOption(value) {
  return config.ticketOptions.find((x) => x.value === value);
}

function findOpenTicketByUser(guild, userId) {
  return guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildText &&
      ch.topic &&
      ch.topic.includes(`ticket-owner:${userId}`)
  );
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log("Slash commands deployed.");
  } catch (error) {
    console.error("Failed to deploy slash commands:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== "ticket-setup") return;

      const panelEmbed = new EmbedBuilder()
        .setColor(config.brandColor)
        .setAuthor({
          name: config.brandName,
          iconURL: config.logoUrl
        })
        .setTitle(config.ticketPanel.title)
        .setDescription(config.ticketPanel.description)
        .setThumbnail(config.logoUrl)
        .setFooter({
          text: `${config.brandName} Support System`,
          iconURL: config.logoUrl
        })
        .setTimestamp();

      const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("Open a ticket")
        .addOptions(
          config.ticketOptions.map((option) => ({
            label: option.label,
            description: option.description,
            value: option.value,
            emoji: option.emoji
          }))
        );

      const row = new ActionRowBuilder().addComponents(menu);

      await interaction.channel.send({
        embeds: [panelEmbed],
        components: [row]
      });

      await interaction.reply({
        content: "Ticket panel sent.",
        ephemeral: true
      });
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== "ticket_select") return;

      const selectedValue = interaction.values[0];
      const selectedOption = getTicketOption(selectedValue);

      if (!selectedOption) {
        await interaction.reply({ content: "Invalid ticket option.", ephemeral: true });
        return;
      }

      const existingChannel = findOpenTicketByUser(interaction.guild, interaction.user.id);
      if (existingChannel) {
        await interaction.reply({
          content: `You already have an open ticket: ${existingChannel}`,
          ephemeral: true
        });
        return;
      }

      const channelName = `ticket-${normalizeName(selectedOption.label)}-${normalizeName(
        interaction.user.username
      )}`;

      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: selectedOption.categoryId,
        topic: `ticket-owner:${interaction.user.id} | ticket-type:${selectedValue}`,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          },
          {
            id: config.pingRoleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages
            ]
          },
          {
            id: client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.ManageMessages,
              PermissionsBitField.Flags.ManageRoles
            ]
          }
        ]
      });

      const member = await interaction.guild.members.fetch(interaction.user.id);
      await member.roles.add(config.buyerRoleId).catch((error) => {
        console.error("Failed to add buyer role:", error);
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor(config.brandColor)
        .setAuthor({
          name: config.brandName,
          iconURL: config.logoUrl
        })
        .setTitle(`${selectedOption.emoji} ${selectedOption.label} Ticket`)
        .setDescription(
          [
            `**Thank you for contacting ${config.brandName}.**`,
            "",
            `**Opened By:** ${interaction.user.tag}`,
            `**Reason:** ${selectedOption.label}`,
            "",
            "**Please describe your issue and wait for a staff response.**"
          ].join("\n")
        )
        .setThumbnail(config.logoUrl)
        .setFooter({
          text: `${config.brandName} Ticket System`,
          iconURL: config.logoUrl
        })
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger);

      const buttons = new ActionRowBuilder().addComponents(closeButton);

      await ticketChannel.send({
        content: `<@&${config.pingRoleId}> ${interaction.user}`,
        embeds: [ticketEmbed],
        components: [buttons]
      });

      await interaction.reply({
        content: `Your ticket has been created: ${ticketChannel}`,
        ephemeral: true
      });
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId !== "close_ticket") return;

      const topic = interaction.channel.topic || "";
      const ownerMatch = topic.match(/ticket-owner:(\d+)/);
      const ownerId = ownerMatch ? ownerMatch[1] : null;

      if (!ownerId || interaction.user.id !== ownerId) {
        await interaction.reply({
          content: "Only the buyer who opened this ticket can close it.",
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members.fetch(ownerId).catch(() => null);
      if (member) {
        await member.roles.remove(config.buyerRoleId).catch((error) => {
          console.error("Failed to remove buyer role:", error);
        });
      }

      await interaction.reply({
        content: "This ticket will close in 5 seconds.",
        ephemeral: true
      });

      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (error) {
          console.error("Failed to delete ticket channel:", error);
        }
      }, 5000);
      return;
    }
  } catch (error) {
    console.error("Interaction error:", error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "An error occurred while processing this action.",
        ephemeral: true
      }).catch(() => {});
    } else {
      await interaction.reply({
        content: "An error occurred while processing this action.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);
