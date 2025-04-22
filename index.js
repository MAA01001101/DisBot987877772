const dotenv = require('dotenv');
dotenv.config();

const {
  Client,
  GatewayIntentBits,
  Events,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const DOWNVOTE_EMOJI = '👎';
const DOWNVOTE_THRESHOLD = 3;

// Cache to track deleted messages
const deletedMessages = [];

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Register the slash command
  const commands = [
    new SlashCommandBuilder()
      .setName('who')
      .setDescription('Show users whose messages were deleted due to downvotes')
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔁 Registering slash command...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID, '1298407554044399688'), // Make sure to set CLIENT_ID in your .env
      { body: commands }
    );
    console.log('✅ Slash command registered.');
  } catch (err) {
    console.error('❌ Error registering slash command:', err);
  }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('❌ Failed to fetch reaction:', error);
      return;
    }
  }

  if (user.bot) return;

  if (reaction.emoji.name === DOWNVOTE_EMOJI && reaction.count >= DOWNVOTE_THRESHOLD) {
    try {
      await reaction.message.delete();
      deletedMessages.push({
        user: reaction.message.author.tag,
        content: reaction.message.content,
        timestamp: reaction.message.createdAt,
      });
      console.log(
        `🗑️ Deleted message from ${reaction.message.author.tag} at ${reaction.message.createdAt}`
      );
    } catch (error) {
      console.error('❌ Could not delete message:', error);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'who') {
    if (deletedMessages.length === 0) {
      await interaction.reply('No messages have been deleted yet.');
    } else {
      const output = deletedMessages
        .map(
          (msg, i) =>
            `**${i + 1}.** ${msg.user} — *${msg.timestamp.toLocaleString()}*`
        )
        .join('\n');
      await interaction.reply({
        content: `🧾 Deleted Messages Log:\n${output}`,
        ephemeral: true,
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
