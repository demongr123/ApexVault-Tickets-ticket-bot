module.exports = {
  guildId: process.env.GUILD_ID,

  brandName: "ApexVault Tickets",
  brandColor: 0x6D90DD,
  logoUrl:
    "https://cdn.discordapp.com/attachments/1481730964727140433/1482488647726010378/E43C36D7-3FAF-42AB-8196-CB949F642AB2.png",

  // Role που παίρνει ο user όταν ανοίγει ticket και βγαίνει όταν το κλείνει
  buyerRoleId: "1482494453070565518",

  // Role που γίνεται ping όταν ανοίγει ticket
  pingUserId: "1312762550815035414"

  ticketPanel: {
    title: "Welcome to ApexVault Tickets",
    description:
      "Need assistance? Select one of the options below to open a ticket with our team."
  },

  ticketOptions: [
    {
      label: "Purchase",
      description: "Open a purchase ticket",
      value: "purchase",
      emoji: "🛒",
      categoryId: "1482494630137172130"
    },
    {
      label: "Replacement",
      description: "Request a replacement",
      value: "replacement",
      emoji: "♻️",
      categoryId: "1482496663221309672"
    },
    {
      label: "Pre Order",
      description: "Open a pre order ticket",
      value: "pre_order",
      emoji: "📦",
      categoryId: "1482496792468652133"
    },
    {
      label: "Issues",
      description: "Report an issue",
      value: "issues",
      emoji: "⚠️",
      categoryId: "1482496868515581962"
    },
    {
      label: "Exchange",
      description: "Open an exchange ticket",
      value: "exchange",
      emoji: "🔄",
      categoryId: "1482496947758829578"
    }
  ]
};
