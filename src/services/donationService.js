import { EmbedBuilder } from 'discord.js';

export const DONATION_CHANNEL_ID =
  process.env.DONATION_CHANNEL_ID || '1537075994320707724';

export const DONATION_PING_ROLE_ID =
  process.env.DONATION_PING_ROLE_ID || '1521628656173056082';

export const ACCENT_BLUE = 0x2e51a2;

export function buildDonationEmbed(
  submitter,
  nameCallsign,
  amount,
  reason,
  confirm,
  evidence,
) {
  const embed = new EmbedBuilder()
    .setColor(ACCENT_BLUE)
    .setTitle('New Donation')
    .addFields(
      {
        name: 'New donation from',
        value: `${nameCallsign} (${submitter})`,
        inline: false,
      },
      {
        name: 'Amount Donated',
        value: amount,
        inline: false,
      },
      {
        name: 'Reason for donation',
        value: reason,
        inline: false,
      },
      {
        name: 'Did they mean to do this?',
        value: confirm,
        inline: false,
      },
    );

  if (evidence) {
    const isImage =
      evidence.contentType &&
      evidence.contentType.startsWith('image/');

    if (isImage) {
      embed.setImage(evidence.url);
    }

    embed.addFields({
      name: 'Evidence',
      value: `[${evidence.name}](${evidence.url})`,
      inline: false,
    });
  } else {
    embed.addFields({
      name: 'Evidence',
      value: 'N/A',
      inline: false,
    });
  }

  return embed
    .setFooter({ text: `Submitted by ${submitter.tag}` })
    .setTimestamp();
}

export function buildDmEmbed(reply, reviewedBy) {
  return new EmbedBuilder()
    .setColor(ACCENT_BLUE)
    .setTitle('Donation Reply')
    .addFields(
      {
        name: 'Your Reply',
        value: reply,
        inline: false,
      },
      {
        name: 'Reviewed By',
        value: reviewedBy,
        inline: false,
      },
    )
    .setTimestamp();
}
