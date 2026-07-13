import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("punishment")
        .setDescription("Issue a punishment")

        .addSubcommand(sub =>
            sub
                .setName("issue")
                .setDescription("Issue a punishment")

                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("Member receiving the punishment")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("punishment")
                        .setDescription("Punishment type")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("length")
                        .setDescription("Length")
                        .setRequired(true)
                )

                .addAttachmentOption(option =>
                    option
                        .setName("evidence")
                        .setDescription("Evidence")
                        .setRequired(false)
                )
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    category: "moderation",

    async execute(interaction, config, client) {

        if (interaction.options.getSubcommand() === "issue") {

            const member =
                interaction.options.getUser("member");

            const punishment =
                interaction.options.getString("punishment");

            const reason =
                interaction.options.getString("reason");

            const length =
                interaction.options.getString("length");

            const evidence =
                interaction.options.getAttachment("evidence");

            await interaction.reply({
                content:
                    `Punishment created for ${member.tag}`,
                ephemeral: true
            });

        }

    }

};
