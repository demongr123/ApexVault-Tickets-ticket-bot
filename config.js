module.exports = {
  guildId: process.env.GUILD_ID,

  // Το role που θα γίνεται ping όταν ανοίγει ticket
  supportRoleId: "1480671765909733472",

  // Βάλε εδώ category ID αν θες όλα τα tickets να μπαίνουν σε συγκεκριμένη κατηγορία
  ticketsCategoryId: "1480671767453499498",

  // Το κανάλι όπου θα κάνεις το /ticket-setup
  panelChannelId: "1480671767453499499",

  ticketPanel: {
    title: "Welcome to Niro Market",
    description:
      "Need assistance? Select a category below to connect with our dedicated team. We're here to help you with any questions or inquiries you may have."
  },

  ticketOptions: [
    {
      label: "Questions",
      description: "To ask your general queries",
      value: "questions",
      emoji: "❓"
    },
    {
      label: "Purchase",
      description: "Purchase Ticket",
      value: "purchase",
      emoji: "🛒"
    },
    {
      label: "Support",
      description: "Support for product",
      value: "support",
      emoji: "🛠️"
    },
    {
      label: "Replacement",
      description: "Replacement for your product",
      value: "replacement",
      emoji: "♻️"
    },
    {
      label: "Giveaway winner",
      description: "Invite reward/giveaway winner",
      value: "giveaway_winner",
      emoji: "🎉"
    }
  ]
};
