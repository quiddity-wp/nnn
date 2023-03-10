const DiscordJs = require("discord.js"),
    Log = require("@roncli/node-application-insights-logger"),
    util = require("util"),

    Commands = require("./commands"),
    Exception = require("../errors/exception"),
    Warning = require("../errors/warning"),

    commands = new Commands(),
    discord = new DiscordJs.Client({
        intents: [
            DiscordJs.GatewayIntentBits.DirectMessages,
            DiscordJs.GatewayIntentBits.Guilds,
            DiscordJs.GatewayIntentBits.GuildMembers,
            DiscordJs.GatewayIntentBits.GuildMessages,
            DiscordJs.GatewayIntentBits.GuildPresences,
            DiscordJs.GatewayIntentBits.MessageContent
        ]
    }),
    messageParse = /^!(?<cmd>[^ ]+)(?: +(?<args>.*[^ ]))? *$/;

let readied = false;

/** @type {DiscordJs.Guild} */
let guild;

require("../extensions/discordJs.GuildMember.extensions");

//  ####     #                                    #
//   #  #                                         #
//   #  #   ##     ###    ###    ###   # ##    ## #
//   #  #    #    #      #   #  #   #  ##  #  #  ##
//   #  #    #     ###   #      #   #  #      #   #
//   #  #    #        #  #   #  #   #  #      #  ##
//  ####    ###   ####    ###    ###   #       ## #
/**
 * A static class that handles all Discord.js interctions.
 */
class Discord {
    //       #                             ##
    //       #                              #
    //  ##   ###    ###  ###   ###    ##    #     ###
    // #     #  #  #  #  #  #  #  #  # ##   #    ##
    // #     #  #  # ##  #  #  #  #  ##     #      ##
    //  ##   #  #   # #  #  #  #  #   ##   ###   ###
    /**
     * Returns the channels on the server.
     * @returns {DiscordJs.Collection<string, DiscordJs.GuildBasedChannel>} The channels.
     */
    static get channels() {
        if (guild) {
            return guild.channels.cache;
        }

        return new DiscordJs.Collection();
    }

    //  #
    //
    // ##     ##    ##   ###
    //  #    #     #  #  #  #
    //  #    #     #  #  #  #
    // ###    ##    ##   #  #
    /**
     * Returns the guild's icon.
     * @returns {string} The URL of the icon.
     */
    static get icon() {
        if (discord && discord.ws && discord.ws.status === 0) {
            return discord.user.avatarURL();
        }

        return void 0;
    }

    //  #       #
    //          #
    // ##     ###
    //  #    #  #
    //  #    #  #
    // ###    ###
    /**
     * Returns the server ID.
     * @returns {string} The ID of the server.
     */
    static get id() {
        if (guild) {
            return guild.id;
        }

        return void 0;
    }

    //         #                 #
    //         #                 #
    //  ###   ###    ###  ###   ###   #  #  ###
    // ##      #    #  #  #  #   #    #  #  #  #
    //   ##    #    # ##  #      #    #  #  #  #
    // ###      ##   # #  #       ##   ###  ###
    //                                      #
    /**
     * Sets up Discord events.  Should only ever be called once.
     * @returns {void}
     */
    static startup() {
        discord.on("ready", () => {
            Log.verbose("Connected to Discord.");

            guild = discord.guilds.cache.find((g) => g.name === process.env.DISCORD_GUILD);

            if (!readied) {
                readied = true;
            }
        });

        discord.on("disconnect", (ev) => {
            Log.error("Disconnected from Discord.", {err: ev instanceof Error ? ev : new Error(util.inspect(ev))});
        });

        discord.on("messageCreate", (message) => {
            Discord.message(message.author, message.content, message.channel);
        });

        discord.on("guildMemberRemove", async (member) => {
            if (member.guild && member.guild.name === process.env.DISCORD_GUILD) {
                try {
                    await member.setActive(false);
                } catch (err) {
                    Log.error(`There was a problem with ${member.displayName} leaving the server.`, {err});
                }
            }
        });

        discord.on("guildMemberUpdate", async (/** @type {DiscordJs.GuildMember} */ oldMember, newMember) => {
            if (newMember.guild && newMember.guild.name === process.env.DISCORD_GUILD) {
                if (oldMember.displayName === newMember.displayName) {
                    return;
                }

                try {
                    await newMember.updateName(oldMember);
                } catch (err) {
                    Log.error(`There was a problem with ${oldMember.displayName} changing their name to ${newMember.displayName}.`, {err});
                }
            }
        });


        discord.on("error", (err) => {
            if (err.message === "read ECONNRESET") {
                // Swallow this error, see https://github.com/discordjs/discord.js/issues/3043#issuecomment-465543902
                return;
            }

            Log.error("Discord error.", {err});
        });
    }

    //                                      #
    //                                      #
    //  ##    ##   ###   ###    ##    ##   ###
    // #     #  #  #  #  #  #  # ##  #      #
    // #     #  #  #  #  #  #  ##    #      #
    //  ##    ##   #  #  #  #   ##    ##     ##
    /**
     * Connects to Discord.
     * @returns {Promise} A promise that resolves once Discord is connected.
     */
    static async connect() {
        Log.verbose("Connecting to Discord...");

        try {
            await discord.login();
            Log.verbose("Connected.");
        } catch (err) {
            Log.error("Error connecting to Discord, will automatically retry.", {err});
        }
    }

    //  #            ##                                  #             #
    //              #  #                                 #             #
    // ##     ###   #      ##   ###   ###    ##    ##   ###    ##    ###
    //  #    ##     #     #  #  #  #  #  #  # ##  #      #    # ##  #  #
    //  #      ##   #  #  #  #  #  #  #  #  ##    #      #    ##    #  #
    // ###   ###     ##    ##   #  #  #  #   ##    ##     ##   ##    ###
    /**
     * Determines whether the bot is connected to Discord.
     * @returns {boolean} Whether the bot is connected to Discord.
     */
    static isConnected() {
        return discord && discord.ws && guild ? discord.ws.status === 0 : false;
    }

    // # #    ##    ###    ###    ###   ###   ##
    // ####  # ##  ##     ##     #  #  #  #  # ##
    // #  #  ##      ##     ##   # ##   ##   ##
    // #  #   ##   ###    ###     # #  #      ##
    //                                  ###
    /**
     * Parses a message.
     * @param {DiscordJs.User} user The user who sent the message.
     * @param {string} message The text of the message.
     * @param {DiscordJs.TextBasedChannel} channel The channel the message was sent on.
     * @returns {Promise} A promise that resolves when the message is parsed.
     */
    static async message(user, message, channel) {
        const member = guild.members.cache.find((m) => m.id === user.id);

        for (const text of message.split("\n")) {
            if (!messageParse.test(text)) {
                continue;
            }

            const {groups: {cmd, args}} = messageParse.exec(text),
                command = cmd.toLocaleLowerCase();

            if (Object.getOwnPropertyNames(Commands.prototype).filter((p) => typeof Commands.prototype[p] === "function" && p !== "constructor").indexOf(command) !== -1) {
                let success;
                try {
                    success = await commands[command](member, channel, args);
                } catch (err) {
                    if (err instanceof Warning) {
                        Log.warn(`${channel} ${member}: ${text} - ${err.message || err}`);
                    } else if (err instanceof Exception) {
                        Log.error(`${channel} ${member}: ${text} - ${err.message}`, {err: err.innerError});
                    } else {
                        Log.error(`${channel} ${member}: ${text}`, {err});
                    }

                    return;
                }

                if (success) {
                    Log.verbose(`${channel} ${member}: ${text}`);
                }
            }
        }
    }

    //  ###  #  #   ##   #  #   ##
    // #  #  #  #  # ##  #  #  # ##
    // #  #  #  #  ##    #  #  ##
    //  ###   ###   ##    ###   ##
    //    #
    /**
     * Queues a message to be sent.
     * @param {string} message The message to be sent.
     * @param {DiscordJs.TextChannel|DiscordJs.DMChannel|DiscordJs.GuildMember} channel The channel to send the message to.
     * @returns {Promise<DiscordJs.Message>} A promise that resolves with the sent message.
     */
    static async queue(message, channel) {
        if (channel.id === discord.user.id) {
            return void 0;
        }

        let msg;
        try {
            msg = await Discord.richQueue(new DiscordJs.EmbedBuilder({description: message}), channel);
        } catch {}
        return msg;
    }

    //          #   #     #
    //          #         #
    //  ##    ###  ##    ###
    // # ##  #  #   #     #
    // ##    #  #   #     #
    //  ##    ###  ###     ##
    /**
     * Edits a message.
     * @param {DiscordJs.Message} message The posted message to edit.
     * @param {string} text The text to change the posted message to.
     * @returns {Promise} A promise that resolves when the message is edited.
     */
    static async edit(message, text) {
        await Discord.richEdit(message, new DiscordJs.EmbedBuilder({description: text}));
    }

    //             #              #  ###          #    ##       #
    //             #              #  #  #               #       #
    //  ##   # #   ###    ##    ###  ###   #  #  ##     #     ###   ##   ###
    // # ##  ####  #  #  # ##  #  #  #  #  #  #   #     #    #  #  # ##  #  #
    // ##    #  #  #  #  ##    #  #  #  #  #  #   #     #    #  #  ##    #
    //  ##   #  #  ###    ##    ###  ###    ###  ###   ###    ###   ##   #
    /**
     * Gets a new DiscordJs EmbedBuilder object.
     * @param {DiscordJs.EmbedData} [options] The options to pass.
     * @returns {DiscordJs.EmbedBuilder} The EmbedBuilder object.
     */
    static embedBuilder(options) {
        return new DiscordJs.EmbedBuilder(options);
    }

    //        #          #      ##
    //                   #     #  #
    // ###   ##     ##   ###   #  #  #  #   ##   #  #   ##
    // #  #   #    #     #  #  #  #  #  #  # ##  #  #  # ##
    // #      #    #     #  #  ## #  #  #  ##    #  #  ##
    // #     ###    ##   #  #   ##    ###   ##    ###   ##
    //                            #
    /**
     * Queues a rich embed message to be sent.
     * @param {DiscordJs.EmbedBuilder} embed The message to be sent.
     * @param {DiscordJs.TextChannel|DiscordJs.DMChannel|DiscordJs.GuildMember} channel The channel to send the message to.
     * @returns {Promise<DiscordJs.Message>} A promise that resolves with the sent message.
     */
    static async richQueue(embed, channel) {
        if (channel.id === discord.user.id) {
            return void 0;
        }

        embed.setFooter({text: embed.data && embed.data.footer ? embed.data.footer.text : "Noita Nemesis Nation", iconURL: Discord.icon});

        if (embed && embed.data && embed.data.fields) {
            embed.data.fields.forEach((field) => {
                if (field.value && field.value.length > 1024) {
                    field.value = field.value.substring(0, 1024);
                }
            });
        }

        if (!embed.data || !embed.data.color) {
            embed.setColor(0x5c9bbf);
        }

        if (!embed.data || !embed.data.timestamp) {
            embed.setTimestamp(new Date());
        }

        let msg;
        try {
            const msgSend = await channel.send({embeds: [embed]});

            if (msgSend instanceof Array) {
                msg = msgSend[0];
            } else {
                msg = msgSend;
            }
        } catch {}
        return msg;
    }

    //        #          #     ####     #   #     #
    //                   #     #        #         #
    // ###   ##     ##   ###   ###    ###  ##    ###
    // #  #   #    #     #  #  #     #  #   #     #
    // #      #    #     #  #  #     #  #   #     #
    // #     ###    ##   #  #  ####   ###  ###     ##
    /**
     * Edits a rich embed message.
     * @param {DiscordJs.Message} message The posted message to edit.
     * @param {DiscordJs.EmbedBuilder} embed The message to change the posted message to.
     * @returns {Promise} A promise that resolves when the message is edited.
     */
    static async richEdit(message, embed) {
        embed.setFooter({text: embed.data && embed.data.footer ? embed.data.footer.text : "", iconURL: Discord.icon});

        if (embed && embed.data && embed.data.fields) {
            embed.data.fields.forEach((field) => {
                if (field.value && field.value.length > 1024) {
                    field.value = field.value.substring(0, 1024);
                }
            });
        }

        embed.data.color = message.embeds[0].color;

        if (!embed.data || !embed.data.timestamp) {
            embed.setTimestamp(new Date());
        }

        await message.edit({embeds: [embed]});
    }

    //                          #           ##   #                             ##
    //                          #          #  #  #                              #
    //  ##   ###    ##    ###  ###    ##   #     ###    ###  ###   ###    ##    #
    // #     #  #  # ##  #  #   #    # ##  #     #  #  #  #  #  #  #  #  # ##   #
    // #     #     ##    # ##   #    ##    #  #  #  #  # ##  #  #  #  #  ##     #
    //  ##   #      ##    # #    ##   ##    ##   #  #   # #  #  #  #  #   ##   ###
    /**
     * Creates a new channel on the Discord server.
     * @param {string} name The name of the channel.
     * @param {DiscordJs.GuildChannelTypes} type The type of channel to create.
     * @param {DiscordJs.PermissionOverwrites[]|DiscordJs.ChannelCreationOverwrites[]} [overwrites] The permissions that should overwrite the default permission set.
     * @param {string} [reason] The reason the channel is being created.
     * @returns {Promise<DiscordJs.TextChannel|DiscordJs.NewsChannel|DiscordJs.StageChannel|DiscordJs.VoiceChannel|DiscordJs.CategoryChannel>} The created channel.
     */
    static createChannel(name, type, overwrites, reason) {
        if (!guild) {
            return void 0;
        }
        return guild.channels.create({name, type, permissionOverwrites: overwrites, reason});
    }

    //                          #          ###         ##
    //                          #          #  #         #
    //  ##   ###    ##    ###  ###    ##   #  #   ##    #     ##
    // #     #  #  # ##  #  #   #    # ##  ###   #  #   #    # ##
    // #     #     ##    # ##   #    ##    # #   #  #   #    ##
    //  ##   #      ##    # #    ##   ##   #  #   ##   ###    ##
    /**
     * Creates a new role on the Discord server.
     * @param {DiscordJs.CreateRoleOptions} data The role data.
     * @returns {Promise<DiscordJs.Role>} A promise that resolves with the created role.
     */
    static createRole(data) {
        if (!guild) {
            return void 0;
        }
        return guild.roles.create(data);
    }

    //   #    #             #   ##   #                             ##    ###         ###      #
    //  # #                 #  #  #  #                              #    #  #         #       #
    //  #    ##    ###    ###  #     ###    ###  ###   ###    ##    #    ###   #  #   #     ###
    // ###    #    #  #  #  #  #     #  #  #  #  #  #  #  #  # ##   #    #  #  #  #   #    #  #
    //  #     #    #  #  #  #  #  #  #  #  # ##  #  #  #  #  ##     #    #  #   # #   #    #  #
    //  #    ###   #  #   ###   ##   #  #   # #  #  #  #  #   ##   ###   ###     #   ###    ###
    //                                                                          #
    /**
     * Finds a Discord channel by its ID.
     * @param {string} id The ID of the channel.
     * @returns {DiscordJs.GuildBasedChannel} The Discord channel.
     */
    static findChannelById(id) {
        if (!guild) {
            return void 0;
        }
        return guild.channels.cache.find((c) => c.id === id);
    }

    //   #    #             #   ##   #                             ##    ###         #  #
    //  # #                 #  #  #  #                              #    #  #        ## #
    //  #    ##    ###    ###  #     ###    ###  ###   ###    ##    #    ###   #  #  ## #   ###  # #    ##
    // ###    #    #  #  #  #  #     #  #  #  #  #  #  #  #  # ##   #    #  #  #  #  # ##  #  #  ####  # ##
    //  #     #    #  #  #  #  #  #  #  #  # ##  #  #  #  #  ##     #    #  #   # #  # ##  # ##  #  #  ##
    //  #    ###   #  #   ###   ##   #  #   # #  #  #  #  #   ##   ###   ###     #   #  #   # #  #  #   ##
    //                                                                          #
    /**
     * Finds a Discord channel by its name.
     * @param {string} name The name of the channel.
     * @returns {DiscordJs.GuildBasedChannel} The Discord channel.
     */
    static findChannelByName(name) {
        if (!guild) {
            return void 0;
        }
        return guild.channels.cache.find((c) => c.name === name);
    }

    //   #    #             #   ##          #    ##       #  #  #              #                 ###         ###    #                 ##                #  #
    //  # #                 #  #  #               #       #  ####              #                 #  #        #  #                      #                ## #
    //  #    ##    ###    ###  #     #  #  ##     #     ###  ####   ##   # #   ###    ##   ###   ###   #  #  #  #  ##     ###   ###    #     ###  #  #  ## #   ###  # #    ##
    // ###    #    #  #  #  #  # ##  #  #   #     #    #  #  #  #  # ##  ####  #  #  # ##  #  #  #  #  #  #  #  #   #    ##     #  #   #    #  #  #  #  # ##  #  #  ####  # ##
    //  #     #    #  #  #  #  #  #  #  #   #     #    #  #  #  #  ##    #  #  #  #  ##    #     #  #   # #  #  #   #      ##   #  #   #    # ##   # #  # ##  # ##  #  #  ##
    //  #    ###   #  #   ###   ###   ###  ###   ###    ###  #  #   ##   #  #  ###    ##   #     ###     #   ###   ###   ###    ###   ###    # #    #   #  #   # #  #  #   ##
    //                                                                                                  #                       #                  #
    /**
     * Returns the Discord user in the guild by their display name.
     * @param {string} displayName The display name of the Discord user.
     * @returns {DiscordJs.GuildMember} The guild member.
     */
    static findGuildMemberByDisplayName(displayName) {
        if (!guild) {
            return void 0;
        }
        return guild.members.cache.find((m) => m.displayName === displayName);
    }

    //   #    #             #   ##          #    ##       #  #  #              #                 ###         ###      #
    //  # #                 #  #  #               #       #  ####              #                 #  #         #       #
    //  #    ##    ###    ###  #     #  #  ##     #     ###  ####   ##   # #   ###    ##   ###   ###   #  #   #     ###
    // ###    #    #  #  #  #  # ##  #  #   #     #    #  #  #  #  # ##  ####  #  #  # ##  #  #  #  #  #  #   #    #  #
    //  #     #    #  #  #  #  #  #  #  #   #     #    #  #  #  #  ##    #  #  #  #  ##    #     #  #   # #   #    #  #
    //  #    ###   #  #   ###   ###   ###  ###   ###    ###  #  #   ##   #  #  ###    ##   #     ###     #   ###    ###
    //                                                                                                  #
    /**
     * Returns the Discord user in the guild by their Discord ID.
     * @param {string} id The ID of the Discord user.
     * @returns {DiscordJs.GuildMember} The guild member.
     */
    static findGuildMemberById(id) {
        if (!guild) {
            return void 0;
        }
        return guild.members.cache.find((m) => m.id === id);
    }

    //   #    #             #  ###         ##          ###         ###      #
    //  # #                 #  #  #         #          #  #         #       #
    //  #    ##    ###    ###  #  #   ##    #     ##   ###   #  #   #     ###
    // ###    #    #  #  #  #  ###   #  #   #    # ##  #  #  #  #   #    #  #
    //  #     #    #  #  #  #  # #   #  #   #    ##    #  #   # #   #    #  #
    //  #    ###   #  #   ###  #  #   ##   ###    ##   ###     #   ###    ###
    //                                                        #
    /**
     * Finds a Discord role by its ID.
     * @param {string} id The ID of the role.
     * @returns {DiscordJs.Role} The Discord role.
     */
    static findRoleById(id) {
        if (!guild) {
            return void 0;
        }
        return guild.roles.cache.find((r) => r.id === id);
    }

    //   #    #             #  ###         ##          ###         #  #
    //  # #                 #  #  #         #          #  #        ## #
    //  #    ##    ###    ###  #  #   ##    #     ##   ###   #  #  ## #   ###  # #    ##
    // ###    #    #  #  #  #  ###   #  #   #    # ##  #  #  #  #  # ##  #  #  ####  # ##
    //  #     #    #  #  #  #  # #   #  #   #    ##    #  #   # #  # ##  # ##  #  #  ##
    //  #    ###   #  #   ###  #  #   ##   ###    ##   ###     #   #  #   # #  #  #   ##
    //                                                        #
    /**
     * Finds a Discord role by its name.
     * @param {string} name The name of the role.
     * @returns {DiscordJs.Role} The Discord role.
     */
    static findRoleByName(name) {
        if (!guild) {
            return void 0;
        }
        return guild.roles.cache.find((r) => r.name === name);
    }

    //   #    #             #  ###                #     ##   #                             ##    ###         #  #
    //  # #                 #   #                 #    #  #  #                              #    #  #        ## #
    //  #    ##    ###    ###   #     ##   #  #  ###   #     ###    ###  ###   ###    ##    #    ###   #  #  ## #   ###  # #    ##
    // ###    #    #  #  #  #   #    # ##   ##    #    #     #  #  #  #  #  #  #  #  # ##   #    #  #  #  #  # ##  #  #  ####  # ##
    //  #     #    #  #  #  #   #    ##     ##    #    #  #  #  #  # ##  #  #  #  #  ##     #    #  #   # #  # ##  # ##  #  #  ##
    //  #    ###   #  #   ###   #     ##   #  #    ##   ##   #  #   # #  #  #  #  #   ##   ###   ###     #   #  #   # #  #  #   ##
    //                                                                                                  #
    /**
     * Finds a Discord text channel by its name.
     * @param {string} name The name of the channel.
     * @returns {DiscordJs.TextChannel} The Discord text channel.
     */
    static findTextChannelByName(name) {
        if (!guild) {
            return void 0;
        }
        return /** @type {DiscordJs.TextChannel} */(guild.channels.cache.find((c) => c.name === name && c.type === DiscordJs.ChannelType.GuildText)); // eslint-disable-line no-extra-parens
    }

    //   #    #             #  #  #                     ###         ###      #
    //  # #                 #  #  #                     #  #         #       #
    //  #    ##    ###    ###  #  #   ###    ##   ###   ###   #  #   #     ###
    // ###    #    #  #  #  #  #  #  ##     # ##  #  #  #  #  #  #   #    #  #
    //  #     #    #  #  #  #  #  #    ##   ##    #     #  #   # #   #    #  #
    //  #    ###   #  #   ###   ##   ###     ##   #     ###     #   ###    ###
    //                                                         #
    /**
     * Finds a Discord user by user ID.
     * @param {string} id The user ID.
     * @returns {Promise<DiscordJs.User>} A promise that resolves with the user.
     */
    static findUserById(id) {
        return discord.users.fetch(id, {cache: false});
    }

    //              #    #  #
    //              #    ## #
    //  ###   ##   ###   ## #   ###  # #    ##
    // #  #  # ##   #    # ##  #  #  ####  # ##
    //  ##   ##     #    # ##  # ##  #  #  ##
    // #      ##     ##  #  #   # #  #  #   ##
    //  ###
    /**
     * Returns the user's display name if they are a guild member, or a username if they are a user.
     * @param {DiscordJs.GuildMember|DiscordJs.User} user The user to get the name for.
     * @returns {string} The name of the user.
     */
    static getName(user) {
        return user instanceof DiscordJs.GuildMember ? user.displayName : user.username;
    }

    //  #            ##
    //              #  #
    // ##     ###   #  #  #  #  ###    ##   ###
    //  #    ##     #  #  #  #  #  #  # ##  #  #
    //  #      ##   #  #  ####  #  #  ##    #
    // ###   ###     ##   ####  #  #   ##   #
    /**
     * Determines whether the user is the owner.
     * @param {DiscordJs.GuildMember} member The user to check.
     * @returns {boolean} Whether the user is the owner.
     */
    static isOwner(member) {
        return member && member.user.username === process.env.DISCORD_ADMIN_USERNAME && member.user.discriminator === process.env.DISCORD_ADMIN_DISCRIMINATOR;
    }
}

module.exports = Discord;
