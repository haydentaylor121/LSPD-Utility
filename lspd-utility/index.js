const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');
require('dotenv').config();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const REQUEST_CHANNEL_ID = '1525941201847713932'; // Channel where request embeds are posted
const PING_ROLE_ID = '1524811810119876728';      // Role pinged on a new request
const EXPIRY_MS = 2 * 60 * 60 * 1000;             // 2 hours

// Role requirements per training type. Empty array = open to everyone.
// Replace the placeholder role IDs with the real role IDs that should be
// allowed to request Sergeant / Command ride-alongs.
const ROLE_REQUIREMENTS = {
  basic_ride_along: [],
  uof_retraining: [],
  basic_training: [],
  sergeant_ride_along: ['1524811592657666188'],
  command_ride_along: ['1524811465557803168'],
};

// Dropdown options — order matches the requested layout.
const TRAINING_OPTIONS = [
  { value: 'basic_ride_along',     label: 'Basic Ride Along',         description: 'Request a basic ride-along' },
  { value: 'uof_retraining',       label: 'Use of Force Retraining',   description: 'Request use of force retraining' },
  { value: 'basic_training',       label: 'Basic Training',           description: 'Request basic training' },
  { value: 'sergeant_ride_along',  label: 'Sergeant Ride Along',       description: 'Request a Sergeant ride-along' },
  { value: 'command_ride_along',   label: 'Command Ride Along',       description: 'Request a Command ride-along' },
];

const LABEL_MAP = Object.fromEntries(TRAINING_OPTIONS.map((o) => [o.value, o.label]));

// In-memory tracking of active requests: requestMessageId -> request data
const activeRequests = new Map();

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// ---------------------------------------------------------------------------
// Embeds
// ---------------------------------------------------------------------------
function buildPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('LSPD | Ride-Along & Training Requests')
    .setColor(0x2b4d8a)
    .setDescription(
      'Welcome to the Los Santos Police Department training request system!\n' +
      'To request a training, use the dropdown below to select the type of training you need.\n\n' +
      '**Options Available**\n' +
      '• Basic Training\n' +
      '• Use of Force Retraining\n' +
      '• Basic Ride Along\n' +
      '• Sergeant Ride Along\n' +
      '• Command Ride Along\n\n' +
      '*Note: Some ride-alongs may require specific roles. Only ride-alongs you are eligible for will appear in the dropdown.*\n\n' +
      'If you feel that your instructor was misbehaving please open an internal affairs report in ⁠🎫︱𝐓𝐢𝐜𝐤𝐞𝐭𝐬\n' +
      'Use the dropdown below to get started!'
    );
}

function buildPanelSelectMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('lspd_training_select')
    .setPlaceholder('Select a training or ride-along...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(TRAINING_OPTIONS.map((o) => ({
      label: o.label,
      value: o.value,
      description: o.description,
    })));
  return new ActionRowBuilder().addComponents(menu);
}

function buildRequestEmbed(user, typeLabel, expiresAt) {
  return new EmbedBuilder()
    .setTitle('LSPD Request')
    .setColor(0xf5a623)
    .addFields(
      { name: 'Requester', value: `${user} (${user.id})` },
      { name: 'Requested', value: typeLabel },
      { name: 'Status', value: '⏳ Pending' },
      { name: 'Expires', value: `<t:${expiresAt}:R> (<t:${expiresAt}:f>)` },
    );
}

function buildAcceptRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lspd_accept_request')
      .setLabel('👍 Accept')
      .setStyle(ButtonStyle.Success)
  );
}

function buildSubmittedEmbed(typeLabel) {
  return new EmbedBuilder()
    .setTitle('Training Request Submitted')
    .setColor(0x2b4d8a)
    .setDescription(`Your training request for **${typeLabel}** has been submitted successfully.`);
}

function buildAcceptedEmbed(typeLabel) {
  return new EmbedBuilder()
    .setTitle('Training Request Accepted')
    .setColor(0x2ecc71)
    .setDescription(`Your training request for **${typeLabel}** has been accepted please attend the training.`);
}

function buildExpiredEmbed(user) {
  return new EmbedBuilder()
    .setTitle('LSPD Request Update')
    .setColor(0xe74c3c)
    .setDescription(
      `Hello ${user}! Your request from 2 hours ago has been canceled.\n\n` +
      '**Reason:** Automatic time out after 2 hours from request\n\n' +
      'Please make another request.'
    );
}

// ---------------------------------------------------------------------------
// Slash command registration
// ---------------------------------------------------------------------------
const commands = [
  new SlashCommandBuilder()
    .setName('setup-panel')
    .setDescription('Post the LSPD training request panel')
    .setDefaultMemberPermissions(0) // Admin / manage-guild only
    .toJSON(),
];

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('Registered guild commands (instant).');
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('Registered global commands (may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('Failed to register slash commands:', err);
  }
});

// ---------------------------------------------------------------------------
// Interaction handling
// ---------------------------------------------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-panel') {
      await handleSetupPanel(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'lspd_training_select') {
      await handleSelect(interaction);
    } else if (interaction.isButton() && interaction.customId === 'lspd_accept_request') {
      await handleAccept(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (interaction.isRepliable() && !interaction.replied) {
      interaction.reply({ content: 'Something went wrong processing that request.', ephemeral: true }).catch(() => {});
    }
  }
});

async function handleSetupPanel(interaction) {
  await interaction.channel.send({
    embeds: [buildPanelEmbed()],
    components: [buildPanelSelectMenu()],
  });
  await interaction.reply({ content: 'Panel posted.', ephemeral: true });
}

async function handleSelect(interaction) {
  const type = interaction.values[0];
  const typeLabel = LABEL_MAP[type];
  const requiredRoles = ROLE_REQUIREMENTS[type] || [];

  // Role eligibility check
  const member = interaction.member;
  if (requiredRoles.length && !requiredRoles.some((r) => member.roles.cache.has(r))) {
    return interaction.reply({
      content: 'You are not eligible for this ride-along. Only roles with the required permissions can request it.',
      ephemeral: true,
    });
  }

  const expiresAt = Math.floor((Date.now() + EXPIRY_MS) / 1000);
  const channel = await client.channels.fetch(REQUEST_CHANNEL_ID);

  const requestMsg = await channel.send({
    content: `<@&${PING_ROLE_ID}>`,
    embeds: [buildRequestEmbed(interaction.user, typeLabel, expiresAt)],
    components: [buildAcceptRow()],
  });

  // DM: submitted confirmation
  try {
    await interaction.user.send({ embeds: [buildSubmittedEmbed(typeLabel)] });
  } catch (err) {
    console.warn(`Could not DM ${interaction.user.tag} (submitted):`, err.message);
  }

  // Schedule expiry
  const timeout = setTimeout(() => expireRequest(requestMsg.id), EXPIRY_MS);
  activeRequests.set(requestMsg.id, {
    userId: interaction.user.id,
    typeLabel,
    timeout,
    expiresAt,
    channelId: channel.id,
  });

  await interaction.reply({ content: 'Your training request has been submitted!', ephemeral: true });
}

async function handleAccept(interaction) {
  const msgId = interaction.message.id;
  const req = activeRequests.get(msgId);

  if (!req) {
    return interaction.reply({ content: 'This request is no longer active or has already expired.', ephemeral: true });
  }

  clearTimeout(req.timeout);
  activeRequests.delete(msgId);

  // DM the requester: accepted
  try {
    const user = await client.users.fetch(req.userId);
    await user.send({ embeds: [buildAcceptedEmbed(req.typeLabel)] });
  } catch (err) {
    console.warn(`Could not DM ${req.userId} (accepted):`, err.message);
  }

  // Update the request embed to Accepted
  const updated = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0x2ecc71)
    .spliceFields(2, 1, { name: 'Status', value: `✅ Accepted by ${interaction.user}` });

  await interaction.update({ embeds: [updated], components: [] });
}

async function expireRequest(msgId) {
  const req = activeRequests.get(msgId);
  if (!req) return;
  activeRequests.delete(msgId);

  // DM the requester: expired
  try {
    const user = await client.users.fetch(req.userId);
    await user.send({ embeds: [buildExpiredEmbed(user)] });
  } catch (err) {
    console.warn(`Could not DM ${req.userId} (expired):`, err.message);
  }

  // Update the request embed to Expired
  try {
    const channel = await client.channels.fetch(req.channelId);
    const msg = await channel.messages.fetch(msgId);
    const updated = EmbedBuilder.from(msg.embeds[0])
      .setColor(0xe74c3c)
      .spliceFields(2, 1, { name: 'Status', value: '⌛ Expired' });
    await msg.edit({ embeds: [updated], components: [] });
  } catch (err) {
    console.warn('Could not edit expired request message:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
client.login(process.env.DISCORD_TOKEN);
