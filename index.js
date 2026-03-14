require("dotenv").config();

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

// -------------------- WEB SERVER FOR RENDER --------------------
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("ApexVault Tickets bot is running.");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

// -------------------- DISCORD CLIENT --------------------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// -------------------- CONFIG --------------------
const SUPPORT_ROLE_ID = "1482491328259428523";
const BUYER_ROLE_ID = "1482494453070565518";
const BRAND_COLOR = 0x6D90DD;
const LOGO_URL =
  "https://cdn.discordapp.com/attachments/1481730964727140433/1482488647726010378/E43C36D7-3FAF-42AB-8196-CB949F642AB2.png";

const CATEGORY_IDS = {
  purchase: "1482494630137172130",
  replacement: "1482496663221309672",
  preorder: "1482496792468652133",
  issues: "1482496868515581962",
  exchange: "1482496947758829578"
};

// -------------------- TICKET OPTIONS --------------------
const ticketOptions = [
  {
    label: "Purchase",
    description: "Open a purchase ticket",
    value: "purchase",
    emoji: "🛒"
  },
  {
    label: "Replacement",
    description: "Replacement request",
    value: "replacement",
    emoji: "♻️"
  },
  {
    label: "Pre Order",
    description: "Pre order support",
    value: "preorder",
    emoji: "📦"
  },
  {
    label: "Issues",
    description: "Report an issue",
    value: "issues",
    emoji: "⚠️"
  },
  {
    label: "Exchange",
    description: "Exchange request",
    value: "exchange",
    emoji: "🔄"
  }
];

// -------------------- SLASH COMMANDS --------------------
const commands = [
  new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("Send the ApexVault Tickets panel")
    .toJSON()
];

// -------------------- HELPERS --------------------
function normalizeName(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 20);
}

function getTicketOption(value) {
  return ticketOptions.find((x) => x.value === value);
}

function findOpenTicketByUser(guild, userId) {
  return guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildText &&
      ch.topic &&
      ch.topic.includes(`ticket-owner:${userId}`)
  );
}

async function addBuyerRole(member) {
  if (!member || member.roles.cache.has(BUYER_ROLE_ID)) return;
  await member.roles.add(BUYER_ROLE_ID).catch((error) => {
    console.error("Failed to add buyer role:", error);
  });
}

async function removeBuyerRole(member) {
  if (!member || !member.roles.cache.has(BUYER_ROLE_ID)) return;
  await member.roles.remove(BUYER_ROLE_ID).catch((error) => {
    console.error("Failed to remove buyer role:", error);
  });
}

// -------------------- READY --------------------
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Slash commands deployed.");
  } catch (error) {
    console.error("Failed to deploy slash commands:", error);
  }
});

// -------------------- INTERACTIONS --------------------
client.on("interactionCreate", async (interaction) => {
  try {
    // ---------- /ticket-setup ----------
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== "ticket-setup") return;

      const panelEmbed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setAuthor({
          name: "ApexVault Tickets",
          iconURL: LOGO_URL
        })
        .setTitle("Welcome to ApexVault Tickets")
        .setDescription(
          [
            "**Need assistance?**",
            "",
            "**Select a category below to open a ticket with our team.**",
            "**Please choose the option that best matches your issue.**"
          ].join("\n")
        )
        .setThumbnail(LOGO_URL)
        .setImage(LOGO_URL)
        .setFooter({
          text: "ApexVault Tickets Support System",
          iconURL: LOGO_URL
        })
        .setTimestamp();

      const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("Open a ticket")
        .addOptions(
          ticketOptions.map((option) => ({
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

    // ---------- SELECT MENU ----------
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== "ticket_select") return;

      const selectedValue = interaction.values[0];
      const selectedOption = getTicketOption(selectedValue);

      if (!selectedOption) {
        await interaction.reply({
          content: "Invalid ticket option.",
          ephemeral: true
        });
        return;
      }

      const existingChannel = findOpenTicketByUser(
        interaction.guild,
        interaction.user.id
      );

      if (existingChannel) {
        await interaction.reply({
          content: `You already have an open ticket: ${existingChannel}\nPlease close your current ticket before opening a new one.`,
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members
        .fetch(interaction.user.id)
        .catch(() => null);

      await addBuyerRole(member);

      const channelName = `ticket-${normalizeName(
        selectedOption.label
      )}-${normalizeName(interaction.user.username)}`;

      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: CATEGORY_IDS[selectedValue] || null,
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
            id: SUPPORT_ROLE_ID,
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
              PermissionsBitField.Flags.ManageMessages
            ]
          }
        ]
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setAuthor({
          name: "ApexVault Tickets",
          iconURL: LOGO_URL
        })
        .setTitle(`${selectedOption.emoji} ${selectedOption.label} Ticket`)
        .setDescription(
          [
            "**Thank you for contacting ApexVault Tickets.**",
            "",
            `**Opened By:** ${interaction.user.tag}`,
            `**Reason:** ${selectedOption.label}`,
            "",
            "**Please describe your issue and wait for a staff response.**"
          ].join("\n")
        )
        .setThumbnail(LOGO_URL)
        .setImage(LOGO_URL)
        .setFooter({
          text: "ApexVault Tickets System",
          iconURL: LOGO_URL
        })
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger);

      const buttons = new ActionRowBuilder().addComponents(closeButton);

      await ticketChannel.send({
        content: `<@&${SUPPORT_ROLE_ID}> ${interaction.user}`,
        embeds: [ticketEmbed],
        components: [buttons]
      });

      await interaction.reply({
        content: `Your ticket has been created: ${ticketChannel}`,
        ephemeral: true
      });

      return;
    }

    // ---------- CLOSE BUTTON ----------
    if (interaction.isButton()) {
      if (interaction.customId !== "close_ticket") return;

      const topic = interaction.channel.topic || "";
      const ownerMatch = topic.match(/ticket-owner:(\d+)/);
      const ownerId = ownerMatch ? ownerMatch[1] : null;

      const ownerMember = ownerId
        ? await interaction.guild.members.fetch(ownerId).catch(() => null)
        : null;

      await removeBuyerRole(ownerMember);

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
      await interaction
        .followUp({
          content: "An error occurred while processing this action.",
          ephemeral: true
        })
        .catch(() => {});
    } else {
      await interaction
        .reply({
          content: "An error occurred while processing this action.",
          ephemeral: true
        })
        .catch(() => {});
    }
  }
});

// -------------------- LOGIN --------------------
client.login(process.env.TOKEN);
