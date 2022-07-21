/**
 * @typedef {import("../../types/node/playerTypes").Player} PlayerTypes.Player
 */

const tz = require("timezone-js"),
    tzdata = require("tzdata"),

    Challenge = require("../models/challenge"),
    DiscordJs = require("discord.js"),
    Player = require("../models/player"),
    pjson = require("../../package.json"),
    Rating = require("../models/rating"),
    Time = require("../../public/js/common/time"),
    Warning = require("../errors/warning"),

    idParse = /^<@!?(?<id>[0-9]+)>$/,
    idMessageParse = /^<@!?(?<id>[0-9]+)> (?<command>[^ ]+)(?: (?<newMessage>.+))?$/,
    statParse = /^<@!?(?<id>[0-9]+)> (?<depth>0|[1-9][0-9]*) (?<timeHours>0|[1-9][0-9]*):(?<timeMinutes>[0-5][0-9]):(?<timeSeconds>[0-5][0-9])(?: (?<completed>completed))?$/,
    twoIdParse = /^<@!?(?<id1>[0-9]+)> <@!?(?<id2>[0-9]+)>$/;

/** @type {typeof import(".")} */
let Discord;

setTimeout(() => {
    Discord = require(".");
}, 0);

//   ###                                          #
//  #   #                                         #
//  #       ###   ## #   ## #    ###   # ##    ## #   ###
//  #      #   #  # # #  # # #      #  ##  #  #  ##  #
//  #      #   #  # # #  # # #   ####  #   #  #   #   ###
//  #   #  #   #  # # #  # # #  #   #  #   #  #  ##      #
//   ###    ###   #   #  #   #   ####  #   #   ## #  ####
/**
 * A class that handles commands given by chat.
 */
class Commands {
    //       #                 #      ##   #           ##    ##                            ###      #  ####         #            #
    //       #                 #     #  #  #            #     #                             #       #  #                         #
    //  ##   ###    ##    ##   # #   #     ###    ###   #     #     ##   ###    ###   ##    #     ###  ###   #  #  ##     ###   ###    ###
    // #     #  #  # ##  #     ##    #     #  #  #  #   #     #    # ##  #  #  #  #  # ##   #    #  #  #      ##    #    ##      #    ##
    // #     #  #  ##    #     # #   #  #  #  #  # ##   #     #    ##    #  #   ##   ##     #    #  #  #      ##    #      ##    #      ##
    //  ##   #  #   ##    ##   #  #   ##   #  #   # #  ###   ###    ##   #  #  #      ##   ###    ###  ####  #  #  ###   ###      ##  ###
    //                                                                          ###
    /**
     * Checks to ensure a challenge exists.
     * @param {number} id The ID of the challenge.
     * @param {DiscordJs.GuildMember} member The pilot sending the command.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise<Challenge>} A promise that resolves with the challenge.
     */
    static async checkChallengeIdExists(id, member, channel) {
        let challenge;
        try {
            challenge = await Challenge.get(id);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        if (!challenge) {
            await Discord.queue(`Sorry, ${member}, but that was an invalid challenge ID.`, channel);
            throw new Warning("Invalid challenge ID.");
        }

        return challenge;
    }

    //       #                 #      ##   #           ##    ##                            ###           ##                 #    #                         #
    //       #                 #     #  #  #            #     #                             #           #  #               # #                             #
    //  ##   ###    ##    ##   # #   #     ###    ###   #     #     ##   ###    ###   ##    #     ###   #      ##   ###    #    ##    ###   # #    ##    ###
    // #     #  #  # ##  #     ##    #     #  #  #  #   #     #    # ##  #  #  #  #  # ##   #    ##     #     #  #  #  #  ###    #    #  #  ####  # ##  #  #
    // #     #  #  ##    #     # #   #  #  #  #  # ##   #     #    ##    #  #   ##   ##     #      ##   #  #  #  #  #  #   #     #    #     #  #  ##    #  #
    //  ##   #  #   ##    ##   #  #   ##   #  #   # #  ###   ###    ##   #  #  #      ##   ###   ###     ##    ##   #  #   #    ###   #     #  #   ##    ###
    //                                                                          ###
    /**
     * Checks to ensure the challenge is confirmed.
     * @param {Challenge} challenge The challenge.
     * @param {DiscordJs.GuildMember} member The pilot sending the command.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise} A promise that resolves when the check has completed.
     */
    static async checkChallengeIsConfirmed(challenge, member, channel) {
        if (!challenge.confirmedTime) {
            await Discord.queue(`Sorry, ${member}, but this match has not yet been confirmed.`, channel);
            throw new Warning("Match was not yet confirmed.");
        }
    }

    //       #                 #      ##   #           ##    ##                            ###           ##                 #    #                         #   ##         #  #         #       #           #
    //       #                 #     #  #  #            #     #                             #           #  #               # #                             #  #  #        #  #                 #           #
    //  ##   ###    ##    ##   # #   #     ###    ###   #     #     ##   ###    ###   ##    #     ###   #      ##   ###    #    ##    ###   # #    ##    ###  #  #  ###   #  #   ##   ##     ###   ##    ###
    // #     #  #  # ##  #     ##    #     #  #  #  #   #     #    # ##  #  #  #  #  # ##   #    ##     #     #  #  #  #  ###    #    #  #  ####  # ##  #  #  #  #  #  #  #  #  #  #   #    #  #  # ##  #  #
    // #     #  #  ##    #     # #   #  #  #  #  # ##   #     #    ##    #  #   ##   ##     #      ##   #  #  #  #  #  #   #     #    #     #  #  ##    #  #  #  #  #      ##   #  #   #    #  #  ##    #  #
    //  ##   #  #   ##    ##   #  #   ##   #  #   # #  ###   ###    ##   #  #  #      ##   ###   ###     ##    ##   #  #   #    ###   #     #  #   ##    ###   ##   #      ##    ##   ###    ###   ##    ###
    //                                                                          ###
    /**
     * Checks to ensure the challenge is confirmed or voided.
     * @param {Challenge} challenge The challenge.
     * @param {DiscordJs.GuildMember} member The pilot sending the command.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise} A promise that resolves when the check has completed.
     */
    static async checkChallengeIsConfirmedOrVoided(challenge, member, channel) {
        if (!challenge.confirmedTime && !challenge.voidTime) {
            await Discord.queue(`Sorry, ${member}, but this match has not yet been confirmed or voided.`, channel);
            throw new Warning("Match was not yet confirmed or voided.");
        }
    }

    //       #                 #      ##   #           ##    ##                            ###          #  #         #     ##                 #    #                         #
    //       #                 #     #  #  #            #     #                             #           ## #         #    #  #               # #                             #
    //  ##   ###    ##    ##   # #   #     ###    ###   #     #     ##   ###    ###   ##    #     ###   ## #   ##   ###   #      ##   ###    #    ##    ###   # #    ##    ###
    // #     #  #  # ##  #     ##    #     #  #  #  #   #     #    # ##  #  #  #  #  # ##   #    ##     # ##  #  #   #    #     #  #  #  #  ###    #    #  #  ####  # ##  #  #
    // #     #  #  ##    #     # #   #  #  #  #  # ##   #     #    ##    #  #   ##   ##     #      ##   # ##  #  #   #    #  #  #  #  #  #   #     #    #     #  #  ##    #  #
    //  ##   #  #   ##    ##   #  #   ##   #  #   # #  ###   ###    ##   #  #  #      ##   ###   ###    #  #   ##     ##   ##    ##   #  #   #    ###   #     #  #   ##    ###
    //                                                                          ###
    /**
     * Checks to ensure the challenge is not confirmed.
     * @param {Challenge} challenge The challenge.
     * @param {DiscordJs.GuildMember} member The pilot sending the command.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise} A promise that resolves when the check has completed.
     */
    static async checkChallengeIsNotConfirmed(challenge, member, channel) {
        if (challenge.confirmedTime) {
            await Discord.queue(`Sorry, ${member}, but this match has already been confirmed.`, channel);
            throw new Warning("Match was already confirmed.");
        }
    }

    //       #                 #      ##   #           ##    ##                            ###          #  #         #    #  #         #       #           #
    //       #                 #     #  #  #            #     #                             #           ## #         #    #  #                 #           #
    //  ##   ###    ##    ##   # #   #     ###    ###   #     #     ##   ###    ###   ##    #     ###   ## #   ##   ###   #  #   ##   ##     ###   ##    ###
    // #     #  #  # ##  #     ##    #     #  #  #  #   #     #    # ##  #  #  #  #  # ##   #    ##     # ##  #  #   #    #  #  #  #   #    #  #  # ##  #  #
    // #     #  #  ##    #     # #   #  #  #  #  # ##   #     #    ##    #  #   ##   ##     #      ##   # ##  #  #   #     ##   #  #   #    #  #  ##    #  #
    //  ##   #  #   ##    ##   #  #   ##   #  #   # #  ###   ###    ##   #  #  #      ##   ###   ###    #  #   ##     ##   ##    ##   ###    ###   ##    ###
    //                                                                          ###
    /**
     * Checks to ensure the challenge is not voided.
     * @param {Challenge} challenge The challenge.
     * @param {DiscordJs.GuildMember} member The pilot sending the command.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise} A promise that resolves when the check has completed.
     */
    static async checkChallengeIsNotVoided(challenge, member, channel) {
        if (challenge.voidTime) {
            await Discord.queue(`Sorry, ${member}, but this match is voided.`, channel);
            throw new Warning("Match was voided.");
        }
    }

    //       #                 #      ##   #           ##    ##                            ###          #  #         #       #           #
    //       #                 #     #  #  #            #     #                             #           #  #                 #           #
    //  ##   ###    ##    ##   # #   #     ###    ###   #     #     ##   ###    ###   ##    #     ###   #  #   ##   ##     ###   ##    ###
    // #     #  #  # ##  #     ##    #     #  #  #  #   #     #    # ##  #  #  #  #  # ##   #    ##     #  #  #  #   #    #  #  # ##  #  #
    // #     #  #  ##    #     # #   #  #  #  #  # ##   #     #    ##    #  #   ##   ##     #      ##    ##   #  #   #    #  #  ##    #  #
    //  ##   #  #   ##    ##   #  #   ##   #  #   # #  ###   ###    ##   #  #  #      ##   ###   ###     ##    ##   ###    ###   ##    ###
    //                                                                          ###
    /**
     * Checks to ensure the challenge is voided.
     * @param {Challenge} challenge The challenge.
     * @param {DiscordJs.GuildMember} member The pilot sending the command.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise} A promise that resolves when the check has completed.
     */
    static async checkChallengeIsVoided(challenge, member, channel) {
        if (!challenge.voidTime) {
            await Discord.queue(`Sorry, ${member}, but this match is not voided.`, channel);
            throw new Warning("Match was not voided.");
        }
    }

    //       #                 #      ##   #           ##    ##                            #  #         #          #     ###    #                ###           ##          #
    //       #                 #     #  #  #            #     #                            ####         #          #      #                       #           #  #         #
    //  ##   ###    ##    ##   # #   #     ###    ###   #     #     ##   ###    ###   ##   ####   ###  ###    ##   ###    #    ##    # #    ##    #     ###    #     ##   ###
    // #     #  #  # ##  #     ##    #     #  #  #  #   #     #    # ##  #  #  #  #  # ##  #  #  #  #   #    #     #  #   #     #    ####  # ##   #    ##       #   # ##   #
    // #     #  #  ##    #     # #   #  #  #  #  # ##   #     #    ##    #  #   ##   ##    #  #  # ##   #    #     #  #   #     #    #  #  ##     #      ##   #  #  ##     #
    //  ##   #  #   ##    ##   #  #   ##   #  #   # #  ###   ###    ##   #  #  #      ##   #  #   # #    ##   ##   #  #   #    ###   #  #   ##   ###   ###     ##    ##     ##
    //                                                                          ###
    /**
     * Checks to ensure the challenge match time is set.
     * @param {Challenge} challenge The challenge.
     * @param {DiscordJs.GuildMember} member The pilot sending the command.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise} A promise that resolves when the check has completed.
     */
    static async checkChallengeMatchTimeIsSet(challenge, member, channel) {
        if (!challenge.matchTime) {
            await Discord.queue(`Sorry, ${member}, but the time for this match has not been set yet.`, channel);
            throw new Warning("Match time not set.");
        }
    }

    //       #                 #      ##   #                             ##    ###           ##   #           ##    ##                            ###
    //       #                 #     #  #  #                              #     #           #  #  #            #     #                            #  #
    //  ##   ###    ##    ##   # #   #     ###    ###  ###   ###    ##    #     #     ###   #     ###    ###   #     #     ##   ###    ###   ##   #  #   ##    ##   # #
    // #     #  #  # ##  #     ##    #     #  #  #  #  #  #  #  #  # ##   #     #    ##     #     #  #  #  #   #     #    # ##  #  #  #  #  # ##  ###   #  #  #  #  ####
    // #     #  #  ##    #     # #   #  #  #  #  # ##  #  #  #  #  ##     #     #      ##   #  #  #  #  # ##   #     #    ##    #  #   ##   ##    # #   #  #  #  #  #  #
    //  ##   #  #   ##    ##   #  #   ##   #  #   # #  #  #  #  #   ##   ###   ###   ###     ##   #  #   # #  ###   ###    ##   #  #  #      ##   #  #   ##    ##   #  #
    //                                                                                                                                 ###
    /**
     * Checks to ensure a channel is a challenge room, returning the challenge room.
     * @param {DiscordJs.TextChannel} channel The channel.
     * @param {DiscordJs.GuildMember} member The pilot sending the command.
     * @returns {Promise<Challenge>} A promise that resolves with the challenge.
     */
    static async checkChannelIsChallengeRoom(channel, member) {
        try {
            return await Challenge.getByChannel(channel);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }
    }

    //       #                 #      ##   #                             ##    ###           ##          ##
    //       #                 #     #  #  #                              #     #           #  #        #  #
    //  ##   ###    ##    ##   # #   #     ###    ###  ###   ###    ##    #     #     ###   #  #  ###    #     ##   ###   # #    ##   ###
    // #     #  #  # ##  #     ##    #     #  #  #  #  #  #  #  #  # ##   #     #    ##     #  #  #  #    #   # ##  #  #  # #   # ##  #  #
    // #     #  #  ##    #     # #   #  #  #  #  # ##  #  #  #  #  ##     #     #      ##   #  #  #  #  #  #  ##    #     # #   ##    #
    //  ##   #  #   ##    ##   #  #   ##   #  #   # #  #  #  #  #   ##   ###   ###   ###     ##   #  #   ##    ##   #      #     ##   #
    /**
     * Checks to ensure a channel is a challenge room.
     * @param {DiscordJs.TextChannel} channel The channel.
     * @returns {boolean} Whether the channel is on the correct server.
     */
    static checkChannelIsOnServer(channel) {
        return channel.type === DiscordJs.ChannelType.GuildText && channel.guild.name === process.env.DISCORD_GUILD;
    }

    //       #                 #     #  #               ###                                  #
    //       #                 #     #  #               #  #                                 #
    //  ##   ###    ##    ##   # #   ####   ###   ###   #  #   ###  ###    ###  # #    ##   ###    ##   ###    ###
    // #     #  #  # ##  #     ##    #  #  #  #  ##     ###   #  #  #  #  #  #  ####  # ##   #    # ##  #  #  ##
    // #     #  #  ##    #     # #   #  #  # ##    ##   #     # ##  #     # ##  #  #  ##     #    ##    #       ##
    //  ##   #  #   ##    ##   #  #  #  #   # #  ###    #      # #  #      # #  #  #   ##     ##   ##   #     ###
    /**
     * Checks to ensure a command has parameters.
     * @param {string} message The message sent.
     * @param {DiscordJs.GuildMember} member The member sending the command.
     * @param {string} text The text to display if parameters are found.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise<boolean>} A promise that returns with whether the check passed.
     */
    static async checkHasParameters(message, member, text, channel) {
        if (!message) {
            await Discord.queue(`Sorry, ${member}, but this command cannot be used by itself.  ${text}`, channel);
            return false;
        }

        return true;
    }

    //       #                 #     #  #              #                 ####         #            #
    //       #                 #     ####              #                 #                         #
    //  ##   ###    ##    ##   # #   ####   ##   # #   ###    ##   ###   ###   #  #  ##     ###   ###    ###
    // #     #  #  # ##  #     ##    #  #  # ##  ####  #  #  # ##  #  #  #      ##    #    ##      #    ##
    // #     #  #  ##    #     # #   #  #  ##    #  #  #  #  ##    #     #      ##    #      ##    #      ##
    //  ##   #  #   ##    ##   #  #  #  #   ##   #  #  ###    ##   #     ####  #  #  ###   ###      ##  ###
    /**
     * Checks to ensure the member exists, and returns the member.
     * @param {string} message The message sent.
     * @param {DiscordJs.GuildMember} member The member sending the command.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise<DiscordJs.GuildMember>} A promise that resolves with the member.
     */
    static async checkMemberExists(message, member, channel) {
        let checkMember;
        if (idParse.test(message)) {
            const {groups: {id}} = idParse.exec(message);

            checkMember = Discord.findGuildMemberById(id);
        } else {
            checkMember = Discord.findGuildMemberByDisplayName(message);
        }

        if (!checkMember) {
            await Discord.queue(`Sorry, ${member ? `${member}, ` : ""}but I can't find that person on this server.`, channel);
            throw new Warning("Member not found.");
        }

        return checkMember;
    }

    //       #                 #     #  #              #                 ###          ###          ##   #           ##    ##
    //       #                 #     ####              #                  #            #          #  #  #            #     #
    //  ##   ###    ##    ##   # #   ####   ##   # #   ###    ##   ###    #     ###    #    ###   #     ###    ###   #     #     ##   ###    ###   ##
    // #     #  #  # ##  #     ##    #  #  # ##  ####  #  #  # ##  #  #   #    ##      #    #  #  #     #  #  #  #   #     #    # ##  #  #  #  #  # ##
    // #     #  #  ##    #     # #   #  #  ##    #  #  #  #  ##    #      #      ##    #    #  #  #  #  #  #  # ##   #     #    ##    #  #   ##   ##
    //  ##   #  #   ##    ##   #  #  #  #   ##   #  #  ###    ##   #     ###   ###    ###   #  #   ##   #  #   # #  ###   ###    ##   #  #  #      ##
    //                                                                                                                                       ###
    /**
     * Checks to ensure the member is in the challenge.
     * @param {Challenge} challenge The challenge to check.
     * @param {DiscordJs.GuildMember} member The member to check.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise} A promise that resolves when the member has been checked.
     */
    static async checkMemberIsInChallenge(challenge, member, channel) {
        if (member.id !== challenge.players.challengingPlayer.discordId && member.id !== challenge.players.challengedPlayer.discordId) {
            await Discord.queue(`Sorry, ${member}, but you are not part of this challenge.`, channel);
            throw new Warning("Member is not in this challenge.");
        }
    }

    //       #                 #     #  #              #                 ###           ##
    //       #                 #     ####              #                  #           #  #
    //  ##   ###    ##    ##   # #   ####   ##   # #   ###    ##   ###    #     ###   #  #  #  #  ###    ##   ###
    // #     #  #  # ##  #     ##    #  #  # ##  ####  #  #  # ##  #  #   #    ##     #  #  #  #  #  #  # ##  #  #
    // #     #  #  ##    #     # #   #  #  ##    #  #  #  #  ##    #      #      ##   #  #  ####  #  #  ##    #
    //  ##   #  #   ##    ##   #  #  #  #   ##   #  #  ###    ##   #     ###   ###     ##   ####  #  #   ##   #
    /**
     * Checks to ensure the member is the owner of the server.
     * @param {DiscordJs.GuildMember} member The member to check.
     * @returns {void}
     */
    static checkMemberIsOwner(member) {
        if (!Discord.isOwner(member)) {
            throw new Warning("Owner permission required to perform this command.");
        }
    }

    //       #                 #     #  #              #                    #         #                   #
    //       #                 #     ####              #                    #                             #
    //  ##   ###    ##    ##   # #   ####   ##   # #   ###    ##   ###      #   ##   ##    ###    ##    ###
    // #     #  #  # ##  #     ##    #  #  # ##  ####  #  #  # ##  #  #     #  #  #   #    #  #  # ##  #  #
    // #     #  #  ##    #     # #   #  #  ##    #  #  #  #  ##    #     #  #  #  #   #    #  #  ##    #  #
    //  ##   #  #   ##    ##   #  #  #  #   ##   #  #  ###    ##   #      ##    ##   ###   #  #   ##    ###
    /**
     * Checks to ensure the member has joined the league.
     * @param {DiscordJs.GuildMember} checkMember The member to check.
     * @param {DiscordJs.GuildMember} member The member to reply to.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @param {string} text The text to display on failure.
     * @returns {Promise<PlayerTypes.Player>} A promise that resolves with the player that joined.
     */
    static async checkMemberJoined(checkMember, member, channel, text) {
        let player;
        try {
            player = await Player.getByDiscordId(checkMember.id);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        if (!player || !player.active) {
            await Discord.queue(text, channel);
            throw new Warning(`${checkMember.displayName} hasn't joined the league.`);
        }

        return player;
    }

    //       #                 #     #  #        ####         #            #     #                 ##   #           ##    ##
    //       #                 #     ## #        #                         #                      #  #  #            #     #
    //  ##   ###    ##    ##   # #   ## #   ##   ###   #  #  ##     ###   ###   ##    ###    ###  #     ###    ###   #     #     ##   ###    ###   ##
    // #     #  #  # ##  #     ##    # ##  #  #  #      ##    #    ##      #     #    #  #  #  #  #     #  #  #  #   #     #    # ##  #  #  #  #  # ##
    // #     #  #  ##    #     # #   # ##  #  #  #      ##    #      ##    #     #    #  #   ##   #  #  #  #  # ##   #     #    ##    #  #   ##   ##
    //  ##   #  #   ##    ##   #  #  #  #   ##   ####  #  #  ###   ###      ##  ###   #  #  #      ##   #  #   # #  ###   ###    ##   #  #  #      ##
    //                                                                                       ###                                             ###
    /**
     * Checks to ensure no challenge exists between two members.
     * @param {PlayerTypes.Player} player1 The first player to check.
     * @param {PlayerTypes.Player} player2 The second player to check.
     * @param {DiscordJs.GuildMember} member The member sending the command.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise} A promise that resolves when the check is complete.
     */
    static async checkNoExistingChallenge(player1, player2, member, channel) {
        let challenge;
        try {
            challenge = await Challenge.find(player1, player2);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        if (challenge) {
            await Discord.queue(`Sorry, ${member}, but you already have a pending challenge!  Visit ${challenge.channel} to get started.`, channel);
            throw new Warning("Invalid time zone.");
        }
    }

    //       #                 #     #  #        ###                                  #
    //       #                 #     ## #        #  #                                 #
    //  ##   ###    ##    ##   # #   ## #   ##   #  #   ###  ###    ###  # #    ##   ###    ##   ###    ###
    // #     #  #  # ##  #     ##    # ##  #  #  ###   #  #  #  #  #  #  ####  # ##   #    # ##  #  #  ##
    // #     #  #  ##    #     # #   # ##  #  #  #     # ##  #     # ##  #  #  ##     #    ##    #       ##
    //  ##   #  #   ##    ##   #  #  #  #   ##   #      # #  #      # #  #  #   ##     ##   ##   #     ###
    /**
     * Checks to ensure a command has no parameters.
     * @param {string} message The message sent.
     * @param {DiscordJs.GuildMember} member The member sending the command.
     * @param {string} text The text to display if parameters are found.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise<boolean>} A promise that returns with whether the check passed.
     */
    static async checkNoParameters(message, member, text, channel) {
        if (message) {
            await Discord.queue(`Sorry, ${member ? `${member}, ` : ""}but this command does not take any parameters.  ${text}`, channel);
            return false;
        }

        return true;
    }

    //       #                 #     ###    #                                        ###          #  #        ##     #       #
    //       #                 #      #                                               #           #  #         #             #
    //  ##   ###    ##    ##   # #    #    ##    # #    ##   ####   ##   ###    ##    #     ###   #  #   ###   #    ##     ###
    // #     #  #  # ##  #     ##     #     #    ####  # ##    #   #  #  #  #  # ##   #    ##     #  #  #  #   #     #    #  #
    // #     #  #  ##    #     # #    #     #    #  #  ##     #    #  #  #  #  ##     #      ##    ##   # ##   #     #    #  #
    //  ##   #  #   ##    ##   #  #   #    ###   #  #   ##   ####   ##   #  #   ##   ###   ###     ##    # #  ###   ###    ###
    /**
     * Checks to ensure a time zone is valid.
     * @param {string} message The message sent.
     * @param {DiscordJs.GuildMember} member The player sending the command.
     * @param {DiscordJs.TextChannel} channel The channel to reply on.
     * @returns {Promise<string>} A promise that resolves with the time in the specified time zone.
     */
    static async checkTimezoneIsValid(message, member, channel) {
        if (!tzdata.zones[message]) {
            await Discord.queue(`Sorry, ${member}, but that time zone is not recognized.  Please note that this command is case sensitive.  See #timezone-faq for a complete list of time zones.`, channel);
            throw new Warning("Invalid time zone.");
        }

        let time;
        try {
            time = new Date().toLocaleString("en-US", {timeZone: message, hour12: true, hour: "numeric", minute: "2-digit", timeZoneName: "short"});
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but that time zone is not recognized.  Please note that this command is case sensitive.  See #timezone-faq for a complete list of time zones.`, channel);
            throw new Warning("Invalid time zone.");
        }

        return time;
    }

    //         #                ##           #
    //                           #           #
    //  ###   ##    # #   #  #   #     ###  ###    ##
    // ##      #    ####  #  #   #    #  #   #    # ##
    //   ##    #    #  #  #  #   #    # ##   #    ##
    // ###    ###   #  #   ###  ###    # #    ##   ##
    /**
     * Simulates other users making a command.
     * @param {DiscordJs.GuildMember} member The guild member initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async simulate(member, channel, message) {
        await Commands.checkMemberIsOwner(member);

        if (!idMessageParse.test(message)) {
            return false;
        }

        const {groups: {id, command, newMessage}} = idMessageParse.exec(message);
        if (Object.getOwnPropertyNames(Commands.prototype).filter((p) => typeof Commands.prototype[p] === "function" && p !== "constructor").indexOf(command) === -1) {
            throw new Warning("Invalid command.");
        }

        const newMember = await Discord.findGuildMemberById(id);
        if (!newMember) {
            throw new Warning("User does not exist on the server.");
        }

        return await this[command](newMember, channel, newMessage) || void 0;
    }

    // #           ##
    // #            #
    // ###    ##    #    ###
    // #  #  # ##   #    #  #
    // #  #  ##     #    #  #
    // #  #   ##   ###   ###
    //                   #
    /**
     * Replies with a URL to the bot's help page.
     * @param {DiscordJs.GuildMember} member The guild member initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async help(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        if (message) {
            return false;
        }

        await Discord.queue(`${member}, see the about page https://${process.env.DOMAIN}/about.`, channel);
        return true;
    }

    //                           #
    //
    // # #    ##   ###    ###   ##     ##   ###
    // # #   # ##  #  #  ##      #    #  #  #  #
    // # #   ##    #       ##    #    #  #  #  #
    //  #     ##   #     ###    ###    ##   #  #
    /**
     * Replies with the current version of the bot.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async version(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        if (message) {
            return false;
        }

        await Discord.queue(`Ukko.  One wizard.  Millions of volts.  I'm right behind you!  By roncli, Version ${pjson.version}.  Project is open source, visit https://github.com/roncli/nnn.`, channel);
        return true;
    }

    //             #             #     #
    //             #                   #
    // #  #   ##   ###    ###   ##    ###    ##
    // #  #  # ##  #  #  ##      #     #    # ##
    // ####  ##    #  #    ##    #     #    ##
    // ####   ##   ###   ###    ###     ##   ##
    /**
     * Replies with OTL's Website URL.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async website(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        if (message) {
            return false;
        }

        await Discord.queue(`Visit our website at https://${process.env.DOMAIN} for player standings, matches, and stats!`, channel);
        return true;
    }

    //  #     #
    //  #
    // ###   ##    # #    ##   ####   ##   ###    ##
    //  #     #    ####  # ##    #   #  #  #  #  # ##
    //  #     #    #  #  ##     #    #  #  #  #  ##
    //   ##  ###   #  #   ##   ####   ##   #  #   ##
    /**
     * Sets a player's time zone.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async timezone(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        if (message) {
            const time = await Commands.checkTimezoneIsValid(message, member, channel);

            try {
                await member.setTimezone(message);
            } catch (err) {
                await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
                throw err;
            }

            await Discord.queue(`${member}, your time zone has been set to ${message}, where the current local time is ${time}.`, channel);
            return true;
        }

        try {
            await member.clearTimezone();
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        await Discord.queue(`${member}, your time zone has been cleared.`, channel);
        return true;
    }

    //   #          #

    //   #    ##   ##    ###
    //   #   #  #   #    #  #
    //   #   #  #   #    #  #
    // # #    ##   ###   #  #
    //  #
    /**
     * Lets a player join the league.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async join(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!join` by itself to join the Nation.", channel)) {
            return false;
        }

        try {
            await member.setActive(true);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        await Discord.queue(`${member}, you are now part of the Noita Nemesis Nation.  You may \`!part\` at any time to leave the Nation.  Good luck!`, channel);
        return true;
    }

    //                    #
    //                    #
    // ###    ###  ###   ###
    // #  #  #  #  #  #   #
    // #  #  # ##  #      #
    // ###    # #  #       ##
    // #
    /**
     * Lets a player part the league.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async part(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!part` by itself to leave the Nation.", channel)) {
            return false;
        }

        try {
            await member.setActive(false);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        await Discord.queue(`${member}, you have left the Noita Nemesis Nation.  You may \`!join\` at any time to return to the Nation.`, channel);
        return true;
    }

    //       #           ##    ##
    //       #            #     #
    //  ##   ###    ###   #     #     ##   ###    ###   ##
    // #     #  #  #  #   #     #    # ##  #  #  #  #  # ##
    // #     #  #  # ##   #     #    ##    #  #   ##   ##
    //  ##   #  #   # #  ###   ###    ##   #  #  #      ##
    //                                            ###
    /**
     * Issue a challenge.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async challenge(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        if (!await Commands.checkHasParameters(message, member, "Use `!challenge` followed by the player you would like to challenge.", channel)) {
            return false;
        }

        const challengingPlayer = await Commands.checkMemberJoined(member, member, channel, `Sorry, ${member}, but you must \`!join\` the Nation first.`),
            challengedMember = await Commands.checkMemberExists(message, member, channel),
            challengedPlayer = await Commands.checkMemberJoined(challengedMember, member, channel, `Sorry, ${member}, but ${challengedMember} isn't currently active.  They must \`!join\` the Nation before you can challenge them.`);

        await Commands.checkNoExistingChallenge(challengingPlayer, challengedPlayer, member, channel);

        let challenge;
        try {
            challenge = await Challenge.create(challengingPlayer, challengedPlayer);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        await Discord.queue(`${member}, your challenge to ${challengedMember} has been created in ${challenge.channel}.  Good luck, Noita!`, channel);

        return true;
    }

    //  #     #
    //  #
    // ###   ##    # #    ##
    //  #     #    ####  # ##
    //  #     #    #  #  ##
    //   ##  ###   #  #   ##
    /**
     * Display the time of the match in the challenge room.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async time(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        let challenge;

        if (message) {
            const challengeId = +message || 0;

            challenge = await Commands.checkChallengeIdExists(challengeId, member, channel);
        } else {
            challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
            if (!challenge) {
                return false;
            }
        }

        await Commands.checkChallengeIsNotVoided(challenge, member, channel);
        await Commands.checkChallengeIsNotConfirmed(challenge, member, channel);

        let player;
        try {
            player = await Player.getByDiscordId(member.id);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        const timezone = (player ? player.timezone : void 0) || process.env.DEFAULT_TIMEZONE;

        if (challenge.matchTime) {
            if (message) {
                await Discord.queue(`${member}, the match between **${challenge.players.challengingPlayer.name}** and **${challenge.players.challengedPlayer.name}** ${challenge.matchTime > new Date() ? "is" : "was"} scheduled to take place ${challenge.matchTime.toLocaleString("en-US", {timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"})}.`, channel);
            } else {
                await Discord.queue(`${member}, this match ${challenge.matchTime > new Date() ? "is" : "was"} scheduled to take place ${challenge.matchTime.toLocaleString("en-US", {timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"})}.`, channel);
            }
        } else {
            await Discord.queue(`${member}, this match has not yet been scheduled.`, channel);
        }

        return true;
    }

    //                          #       #
    //                          #       #
    //  ##    ##   #  #  ###   ###    ###   ##   #  #  ###
    // #     #  #  #  #  #  #   #    #  #  #  #  #  #  #  #
    // #     #  #  #  #  #  #   #    #  #  #  #  ####  #  #
    //  ##    ##    ###  #  #    ##   ###   ##   ####  #  #
    /**
     * Display the countdown to the match in the challenge room.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async countdown(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        let challenge;

        if (message) {
            const challengeId = +message || 0;

            challenge = await Commands.checkChallengeIdExists(challengeId, member, channel);
        } else {
            challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
            if (!challenge) {
                return false;
            }
        }

        await Commands.checkChallengeIsNotVoided(challenge, member, channel);
        await Commands.checkChallengeIsNotConfirmed(challenge, member, channel);

        if (challenge.matchTime) {
            const difference = challenge.matchTime.getTime() - new Date().getTime(),
                days = Math.floor(Math.abs(difference) / (24 * 60 * 60 * 1000)),
                hours = Math.floor(Math.abs(difference) / (60 * 60 * 1000) % 24),
                minutes = Math.floor(Math.abs(difference) / (60 * 1000) % 60 % 60),
                seconds = Math.floor(Math.abs(difference) / 1000 % 60);

            if (message) {
                if (difference > 0) {
                    await Discord.queue(`${member}, the match between **${challenge.players.challengingPlayer.name}** and **${challenge.players.challengedPlayer.name}** is scheduled to begin in ${days > 0 ? `${days} day${days === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 || minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}, ` : ""}${`${seconds} second${seconds === 1 ? "" : "s"}`}.`, channel);
                } else {
                    await Discord.queue(`${member}, the match between **${challenge.players.challengingPlayer.name}** and **${challenge.players.challengedPlayer.name}** was scheduled to begin ${days > 0 ? `${days} day${days === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 || minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}, ` : ""}${`${seconds} second${seconds === 1 ? "" : "s"} `} ago.`, channel);
                }
            } else if (difference > 0) {
                await Discord.queue(`${member}, this match is scheduled to begin in ${days > 0 ? `${days} day${days === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 || minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}, ` : ""}${`${seconds} second${seconds === 1 ? "" : "s"}`}.`, channel);
            } else {
                await Discord.queue(`${member}, this match was scheduled to begin ${days > 0 ? `${days} day${days === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 || minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}, ` : ""}${`${seconds} second${seconds === 1 ? "" : "s"} `} ago.`, channel);
            }
        } else {
            await Discord.queue(`${member}, this match has not yet been scheduled.`, channel);
        }

        return true;
    }

    //                                        #     #     #
    //                                        #     #
    //  ###   #  #   ###   ###   ##    ###   ###   ###   ##    # #    ##
    // ##     #  #  #  #  #  #  # ##  ##      #     #     #    ####  # ##
    //   ##   #  #   ##    ##   ##      ##    #     #     #    #  #  ##
    // ###     ###  #     #      ##   ###      ##    ##  ###   #  #   ##
    //               ###   ###
    /**
     * Suggest a time for a challenge.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async suggesttime(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        let date = new Date(new Date().setDate(new Date().getDate() + 1));
        if (!await Commands.checkHasParameters(message, member, `Use \`!suggesttime\` followed by the date and time you want to suggest playing.  For example, \`!suggesttime ${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours() % 12 || 12}:00 ${date.getHours() < 12 ? "AM" : "PM"}\``, channel)) {
            return false;
        }

        await Commands.checkMemberIsInChallenge(challenge, member, channel);
        await Commands.checkChallengeIsNotVoided(challenge, member, channel);
        await Commands.checkChallengeIsNotConfirmed(challenge, member, channel);

        message = message.replace(/-/g, "/");

        const timezone = (member.id === challenge.players.challengingPlayer.discordId ? challenge.players.challengingPlayer : challenge.players.challengedPlayer).timezone || process.env.DEFAULT_TIMEZONE;

        date = void 0;
        if (message.toLowerCase() === "now") {
            date = new Date();
            date = new Date(date.getTime() + (300000 - date.getTime() % 300000));
        } else {
            try {
                date = new Date(new tz.Date(message, timezone).getTime());
            } catch (err) {
                await Discord.queue(`Sorry, ${member}, but I couldn't parse that date and time.`, channel);
                throw new Warning("Invalid date.");
            }

            if (!date || isNaN(date.valueOf())) {
                await Discord.queue(`Sorry, ${member}, but I couldn't parse that date and time.`, channel);
                throw new Warning("Invalid date.");
            }

            if (date.getFullYear() === 2001 && message.indexOf("2001") === -1) {
                date = new Date(new tz.Date(`${message} ${new Date().getFullYear()}`, timezone).getTime());
                if (date < new Date()) {
                    date = new Date(new tz.Date(`${message} ${new Date().getFullYear() + 1}`, timezone).getTime());
                }
            }

            if (date < new Date()) {
                await Discord.queue(`Sorry, ${member}, but that date is in the past.`, channel);
                throw new Warning("Date is in the past.");
            }

            if (date.getTime() - new Date().getTime() > 28 * 24 * 60 * 60 * 1000) {
                await Discord.queue(`Sorry, ${member}, but you cannot schedule a match that far into the future.`, channel);
                throw new Warning("Date too far into the future.");
            }
        }

        try {
            await challenge.suggestTime(member, date);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //                     #    #                 #     #
    //                    # #                     #
    //  ##    ##   ###    #    ##    ###   # #   ###   ##    # #    ##
    // #     #  #  #  #  ###    #    #  #  ####   #     #    ####  # ##
    // #     #  #  #  #   #     #    #     #  #   #     #    #  #  ##
    //  ##    ##   #  #   #    ###   #     #  #    ##  ###   #  #   ##
    /**
     * Suggest a time for a challenge.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async confirmtime(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!confirmtime` by itself to confirm a suggested time.", channel)) {
            return false;
        }

        await Commands.checkMemberIsInChallenge(challenge, member, channel);
        await Commands.checkChallengeIsNotVoided(challenge, member, channel);
        await Commands.checkChallengeIsNotConfirmed(challenge, member, channel);

        if (!challenge.suggestedTime) {
            const date = new Date(new Date().setDate(new Date().getDate() + 1));
            await Discord.queue(`Sorry, ${member}, but no one has suggested a time yet.  Use \`!suggesttime\` followed by the date and time you want to suggest playing.  For example, \`!suggesttime ${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours() % 12 || 12}:${date.getMinutes()} ${date.getHours() < 12 ? "AM" : "PM"}\``, channel);
            throw new Warning("No suggested time to confirm.");
        }

        if (member.id === challenge.suggestedByPlayer.discordId) {
            await Discord.queue(`Sorry, ${member}, but you can't confirm your own suggested time.`, channel);
            throw new Warning("Attempt to confirm own suggested time.");
        }

        challenge.confirmTime();

        return true;
    }

    //                                #
    //                                #
    // ###    ##   ###    ##   ###   ###
    // #  #  # ##  #  #  #  #  #  #   #
    // #     ##    #  #  #  #  #      #
    // #      ##   ###    ##   #       ##
    //             #
    /**
     * Reports a loss for a challenge.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async report(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!report` by itself to report that you lost the challenge.", channel)) {
            return false;
        }

        await Commands.checkMemberIsInChallenge(challenge, member, channel);
        await Commands.checkChallengeIsNotVoided(challenge, member, channel);
        await Commands.checkChallengeIsNotConfirmed(challenge, member, channel);
        await Commands.checkChallengeMatchTimeIsSet(challenge, member, channel);

        if (challenge.matchTime.getTime() > new Date().getTime() + 300000) {
            await Discord.queue(`Sorry, ${member}, but this match hasn't happened yet.`, channel);
            throw new Warning("Tried to report before match time.");
        }

        try {
            await challenge.reportMatch(member);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //                     #    #
    //                    # #
    //  ##    ##   ###    #    ##    ###   # #
    // #     #  #  #  #  ###    #    #  #  ####
    // #     #  #  #  #   #     #    #     #  #
    //  ##    ##   #  #   #    ###   #     #  #
    /**
     * Confirms a win for a challenge.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async confirm(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!confirm` by itself to confirm that you won the challenge.", channel)) {
            return false;
        }

        await Commands.checkMemberIsInChallenge(challenge, member, channel);
        await Commands.checkChallengeIsNotVoided(challenge, member, channel);
        await Commands.checkChallengeIsNotConfirmed(challenge, member, channel);

        if (!challenge.reportTime) {
            await Discord.queue(`Sorry, ${member}, but this match hasn't been reported yet.  Use the \`!report\` command if you meant to report a loss for the match.`, channel);
            throw new Warning("Match not reported.");
        }

        if (member.id === challenge.players.challengingPlayer.discordId ? challenge.stats.challengedPlayer.won : challenge.stats.challengingPlayer.won) {
            await Discord.queue(`Sorry, ${member}, but you can't confirm your own report.`, channel);
            throw new Warning("Can't confirm own report.");
        }

        await challenge.confirmMatch(member);

        return true;
    }

    //                          #          #
    //                          #          #
    // ###    ##   # #    ###  ###    ##   ###
    // #  #  # ##  ####  #  #   #    #     #  #
    // #     ##    #  #  # ##   #    #     #  #
    // #      ##   #  #   # #    ##   ##   #  #
    /**
     * Requests a rematch.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async rematch(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!confirm` by itself to confirm that you won the challenge.", channel)) {
            return false;
        }

        await Commands.checkMemberIsInChallenge(challenge, member, channel);
        await Commands.checkChallengeIsNotVoided(challenge, member, channel);
        await Commands.checkChallengeIsConfirmed(challenge, member, channel);

        if (challenge.rematchedTime) {
            await Discord.queue(`Sorry, ${member}, but a rematch has already been created for this match.`, channel);
            throw new Warning("A rematch already exists.");
        }

        if (challenge.rematchRequestedByPlayer && challenge.rematchRequestedByPlayer.discordId === member.id) {
            await Discord.queue(`Sorry, ${member}, but you can't confirm your own rematch.`, channel);
            throw new Warning("Tried to confirm own rematch.");
        }

        try {
            if (challenge.rematchRequestedByPlayer) {
                challenge.createRematch();
            } else {
                challenge.requestRematch(member);
            }
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //                                      #
    //                                      #
    //  ##    ##   # #   # #    ##   ###   ###
    // #     #  #  ####  ####  # ##  #  #   #
    // #     #  #  #  #  #  #  ##    #  #   #
    //  ##    ##   #  #  #  #   ##   #  #    ##
    /**
     * Adds a comment to a match.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async comment(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkHasParameters(message, member, "Use `!comment` followed by the comment you'd like to leave on the match.", channel)) {
            return false;
        }

        await Commands.checkMemberIsInChallenge(challenge, member, channel);
        await Commands.checkChallengeIsNotVoided(challenge, member, channel);

        if (!challenge.matchTime || challenge.matchTime.getTime() > new Date().getTime() + 300000) {
            await Discord.queue(`Sorry, ${member}, but this match hasn't happened yet.`, channel);
            throw new Warning("Tried to comment before match time.");
        }

        try {
            challenge.setComment(member, message);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //                    #
    //                    #
    // ###    ##   #  #  ###
    // #  #  # ##   ##    #
    // #  #  ##     ##    #
    // #  #   ##   #  #    ##
    /**
     * Displays upcoming matches.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async next(member, channel, message) {
        if (message && message.toLowerCase() !== "time") {
            await Discord.queue(`Sorry, ${member ? `${member}, ` : ""}but you must use \`!next\` by itself to get the list of upcoming matches as a countdown, or \`!next time\` to get the list with dates and times.`, channel);
            return false;
        }

        const matches = await Challenge.getUpcoming();

        if (matches.length === 0) {
            await Discord.queue("There are no matches currently scheduled.", channel);
            return true;
        }

        const msg = Discord.embedBuilder({
            title: "Noita Nemesis Nation Schedule",
            fields: []
        });

        if (message === "time") {
            const player = await Player.getByDiscordId(member.id),
                timezone = player ? player.timezone : process.env.DEFAULT_TIMEZONE;

            for (const [index, match] of matches.entries()) {
                msg.addFields({name: `${index === 0 ? "Upcoming Matches:\n" : ""}${match.challengingPlayerName} vs ${match.challengedPlayerName}`, value: `Begins at ${match.matchTime.toLocaleString("en-US", {timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"})}.`});
            }
        } else {
            matches.forEach((match, index) => {
                const difference = match.matchTime.getTime() - new Date().getTime(),
                    days = Math.floor(Math.abs(difference) / (24 * 60 * 60 * 1000)),
                    hours = Math.floor(Math.abs(difference) / (60 * 60 * 1000) % 24),
                    minutes = Math.floor(Math.abs(difference) / (60 * 1000) % 60 % 60),
                    seconds = Math.floor(Math.abs(difference) / 1000 % 60);

                if (difference > 0) {
                    msg.addFields({name: `${index === 0 ? "Upcoming Matches:\n" : ""}${match.challengingPlayerName} vs ${match.challengedPlayerName}`, value: `Begins in ${days > 0 ? `${days} day${days === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 || minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}, ` : ""}${`${seconds} second${seconds === 1 ? "" : "s"}`}.`});
                } else {
                    msg.addFields({name: `${index === 0 ? "Upcoming Matches:\n" : ""}${match.challengingPlayerName} vs ${match.challengedPlayerName}`, value: `Began ${days > 0 ? `${days} day${days === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 || minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}, ` : ""}${`${seconds} second${seconds === 1 ? "" : "s"}`} ago.`});
                }
            });
        }

        await Discord.richQueue(msg, channel);

        return true;
    }

    //                                #
    //                                #
    // # #   #  #  ###    ##   #  #  ###
    // ####  #  #  #  #  # ##   ##    #
    // #  #   # #  #  #  ##     ##    #
    // #  #    #   #  #   ##   #  #    ##
    //        #
    /**
     * Displays upcoming matches for the user.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async mynext(member, channel, message) {
        if (message && message.toLowerCase() !== "time") {
            await Discord.queue(`Sorry, ${member ? `${member}, ` : ""}but you must use \`!mynext\` by itself to get the list of your upcoming matches as a countdown, or \`!mynext time\` to get the list with dates and times.`, channel);
            return false;
        }

        const matches = await Challenge.getUpcoming(member);

        if (matches.length === 0) {
            await Discord.queue("You have matches currently scheduled.", channel);
            return true;
        }

        const msg = Discord.embedBuilder({
            title: `Noita Nemesis Nation Schedule for ${member.displayName}`,
            fields: []
        });

        if (message === "time") {
            const player = await Player.getByDiscordId(member.id),
                timezone = player ? player.timezone : process.env.DEFAULT_TIMEZONE;

            for (const [index, match] of matches.entries()) {
                msg.addFields({name: `${index === 0 ? "Upcoming Matches:\n" : ""}${match.challengingPlayerName} vs ${match.challengedPlayerName}`, value: `Begins at ${match.matchTime.toLocaleString("en-US", {timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"})}.`});
            }
        } else {
            matches.forEach((match, index) => {
                const difference = match.matchTime.getTime() - new Date().getTime(),
                    days = Math.floor(Math.abs(difference) / (24 * 60 * 60 * 1000)),
                    hours = Math.floor(Math.abs(difference) / (60 * 60 * 1000) % 24),
                    minutes = Math.floor(Math.abs(difference) / (60 * 1000) % 60 % 60),
                    seconds = Math.floor(Math.abs(difference) / 1000 % 60);

                if (difference > 0) {
                    msg.addFields({name: `${index === 0 ? "Upcoming Matches:\n" : ""}${match.challengingPlayerName} vs ${match.challengedPlayerName}`, value: `Begins in ${days > 0 ? `${days} day${days === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 || minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}, ` : ""}${`${seconds} second${seconds === 1 ? "" : "s"}`}.`});
                } else {
                    msg.addFields({name: `${index === 0 ? "Upcoming Matches:\n" : ""}${match.challengingPlayerName} vs ${match.challengedPlayerName}`, value: `Began ${days > 0 ? `${days} day${days === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}, ` : ""}${days > 0 || hours > 0 || minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}, ` : ""}${`${seconds} second${seconds === 1 ? "" : "s"}`} ago.`});
                }
            });
        }

        await Discord.richQueue(msg, channel);

        return true;
    }

    //         #           #
    //         #           #
    //  ###   ###    ###  ###    ###
    // ##      #    #  #   #    ##
    //   ##    #    # ##   #      ##
    // ###      ##   # #    ##  ###
    /**
     * Displays season stats for a player.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async stats(member, channel, message) {
        let statsMember;
        if (message) {
            statsMember = await Commands.checkMemberExists(message, member, channel);
        } else {
            statsMember = member;
        }

        if (!statsMember) {
            return false;
        }

        let player;
        try {
            player = await Player.getByDiscordId(statsMember.id);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        if (!player) {
            await Discord.queue(`Sorry, ${member}, but ${statsMember.id === member.id ? "you have" : `${statsMember} has`} not played any matches.`, channel);
            return true;
        }

        let stats;
        try {
            stats = await Player.getStatsForRecentSeason(player._id);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        if (!stats || stats.games === 0) {
            await Discord.queue(`Sorry, ${member}, but ${statsMember.id === member.id ? "you have" : `${statsMember} has`} not played any matches.`, channel);
            return true;
        }

        let rating;
        try {
            rating = await Rating.getForPlayerBySeason(player, stats.season);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        await Discord.richQueue(Discord.embedBuilder({
            title: `Stats for ${statsMember.displayName} for season ${stats.season}`,
            description: `Rank ${rating.rank}\nRating ${rating.rating}\n${stats.games} Game${stats.games === 1 ? "" : "s"}`,
            fields: [
                {
                    name: `**${stats.won} Win${stats.won === 1 ? "" : "s"}**`,
                    value: `${stats.won === 0 ? "N/A" : `Avg Depth: ${stats.wonDepth.toFixed(0)}\nAvg Time: ${Time.formatTimespan(stats.wonTime)}`}`,
                    inline: true
                },
                {
                    name: `**${stats.lost} Loss${stats.lost === 1 ? "" : "es"}**`,
                    value: `${stats.lost === 0 ? "N/A" : `Avg Depth: ${stats.lossDepth.toFixed(0)}\nAvg Time: ${Time.formatTimespan(stats.lossTime)}`}`,
                    inline: true
                }
            ]
        }), channel);

        return true;
    }

    //                          #                       #          #
    //                          #                       #          #
    //  ##   ###    ##    ###  ###    ##   # #    ###  ###    ##   ###
    // #     #  #  # ##  #  #   #    # ##  ####  #  #   #    #     #  #
    // #     #     ##    # ##   #    ##    #  #  # ##   #    #     #  #
    //  ##   #      ##    # #    ##   ##   #  #   # #    ##   ##   #  #
    /**
     * Creates a match.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async creatematch(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        if (!twoIdParse.test(message)) {
            return false;
        }

        const {groups: {id1, id2}} = twoIdParse.exec(message);

        let player1, player2;
        try {
            player1 = await Player.getByDiscordId(id1);
            player2 = await Player.getByDiscordId(id2);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        if (!player1) {
            await Discord.queue(`Sorry, ${member}, but <@${id1}> is not a member of the Nation.`, channel);
            throw new Warning("Player is not in the league.");
        }

        if (!player2) {
            await Discord.queue(`Sorry, ${member}, but <@${id2}> is not a member of the Nation.`, channel);
            throw new Warning("Player is not in the league.");
        }

        if (!player1.active) {
            await Discord.queue(`Sorry, ${member}, but <@${id1}> is not currently active.`, channel);
            throw new Warning("Player is not currently active.");
        }

        if (!player2.active) {
            await Discord.queue(`Sorry, ${member}, but <@${id2}> is not currently active.`, channel);
            throw new Warning("Player is not currently active.");
        }

        let challenge;
        try {
            challenge = await Challenge.create(player1, player2);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        await Discord.queue(`${challenge.channel} has been created for the challenge between <@${id1}> and <@${id2}>.`, channel);

        return true;
    }

    //  #     #     #    ##
    //  #           #     #
    // ###   ##    ###    #     ##
    //  #     #     #     #    # ##
    //  #     #     #     #    ##
    //   ##  ###     ##  ###    ##
    /**
     * Sets the title for a challenge.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async title(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        await Commands.checkChallengeIsNotVoided(challenge, member, channel);

        try {
            await challenge.setTitle(message);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //                     #
    //                     #
    // ###    ##    ###   ###    ###    ##    ###   ###    ##   ###
    // #  #  #  #  ##      #    ##     # ##  #  #  ##     #  #  #  #
    // #  #  #  #    ##    #      ##   ##    # ##    ##   #  #  #  #
    // ###    ##   ###      ##  ###     ##    # #  ###     ##   #  #
    // #
    /**
     * Sets the match to the postseason.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async postseason(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!postseason` by itself to set this match to the postseason.", channel)) {
            return false;
        }

        await Commands.checkChallengeIsNotVoided(challenge, member, channel);

        try {
            challenge.setPostseason(true);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //                         ##
    //                          #
    // ###    ##    ###  #  #   #     ###  ###    ###    ##    ###   ###    ##   ###
    // #  #  # ##  #  #  #  #   #    #  #  #  #  ##     # ##  #  #  ##     #  #  #  #
    // #     ##     ##   #  #   #    # ##  #       ##   ##    # ##    ##   #  #  #  #
    // #      ##   #      ###  ###    # #  #     ###     ##    # #  ###     ##   #  #
    //              ###
    /**
     * Sets the match to the regular season.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async regularseason(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!regularseason` by itself to set this match to the regular season.", channel)) {
            return false;
        }

        await Commands.checkChallengeIsNotVoided(challenge, member, channel);

        try {
            challenge.setPostseason(false);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //   #                            #     #
    //  # #                           #
    //  #     ##   ###    ##    ##   ###   ##    # #    ##
    // ###   #  #  #  #  #     # ##   #     #    ####  # ##
    //  #    #  #  #     #     ##     #     #    #  #  ##
    //  #     ##   #      ##    ##     ##  ###   #  #   ##
    /**
     * Forces the match time for a challenge.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async forcetime(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkHasParameters(message, member, "Use `!forcetime` followed by the date and time to force the match to.", channel)) {
            return false;
        }

        await Commands.checkChallengeIsNotVoided(challenge, member, channel);

        message = message.replace(/-/g, "/");

        const timezone = (member.id === challenge.players.challengingPlayer.discordId ? challenge.players.challengingPlayer : challenge.players.challengedPlayer).timezone || process.env.DEFAULT_TIMEZONE;

        let date;
        if (message.toLowerCase() === "now") {
            date = new Date();
            date = new Date(date.getTime() + (300000 - date.getTime() % 300000));
        } else {
            try {
                date = new Date(new tz.Date(message, timezone).getTime());
            } catch (err) {
                await Discord.queue(`Sorry, ${member}, but I couldn't parse that date and time.`, channel);
                throw new Warning("Invalid date.");
            }

            if (!date || isNaN(date.valueOf())) {
                await Discord.queue(`Sorry, ${member}, but I couldn't parse that date and time.`, channel);
                throw new Warning("Invalid date.");
            }

            if (date.getFullYear() === 2001 && message.indexOf("2001") === -1) {
                date = new Date(new tz.Date(`${message} ${new Date().getFullYear()}`, timezone).getTime());
                if (date < new Date()) {
                    date = new Date(new tz.Date(`${message} ${new Date().getFullYear() + 1}`, timezone).getTime());
                }
            }

            if (date.getTime() - new Date().getTime() > 28 * 24 * 60 * 60 * 1000) {
                await Discord.queue(`Sorry, ${member}, but you cannot schedule a match that far into the future.`, channel);
                throw new Warning("Date too far into the future.");
            }
        }

        try {
            await challenge.setTime(date);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //               #           #
    //               #
    //  ###    ##   ###   #  #  ##    ###   ###    ##   ###
    // ##     # ##   #    #  #   #    #  #  #  #  # ##  #  #
    //   ##   ##     #    ####   #    #  #  #  #  ##    #
    // ###     ##     ##  ####  ###   #  #  #  #   ##   #
    /**
     * Sets the winner of the match.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async setwinner(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkHasParameters(message, member, "Use `!setwinner` followed by the winner of the match.", channel)) {
            return false;
        }

        await Commands.checkChallengeIsNotVoided(challenge, member, channel);

        if (!idParse.test(message)) {
            return false;
        }

        const {groups: {id}} = idParse.exec(message);

        if (challenge.players.challengingPlayer.discordId !== id && challenge.players.challengedPlayer.discordId !== id) {
            await Discord.queue(`Sorry, ${member}, but <@${id}> is not a player in this match.`, channel);
            throw new Warning("Player not part of the match.");
        }

        if (!challenge.matchTime) {
            await Discord.queue(`Sorry, ${member}, but the match time for this match has not yet been set.`, channel);
            throw new Warning("Match time not set.");
        }

        try {
            challenge.setWinner(challenge.player(await Discord.findUserById(id)));
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //               #            #           #
    //               #            #           #
    //  ###    ##   ###    ###   ###    ###  ###
    // ##     # ##   #    ##      #    #  #   #
    //   ##   ##     #      ##    #    # ##   #
    // ###     ##     ##  ###      ##   # #    ##
    /**
     * Sets a player's stat in a challenge.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async setstat(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkHasParameters(message, member, "Use `!setstat` followed by the name of the person whose stats are being added, the depth in meters, the time in h:mm:ss format, and `completed` if they completed the run.", channel)) {
            return false;
        }

        await Commands.checkChallengeIsNotVoided(challenge, member, channel);

        if (!statParse.test(message)) {
            return false;
        }

        const {groups: {id, depth, timeHours, timeMinutes, timeSeconds, completed}} = statParse.exec(message),
            time = +timeHours * 3600 + +timeMinutes * 60 + +timeSeconds;

        if (challenge.players.challengingPlayer.discordId !== id && challenge.players.challengedPlayer.discordId !== id) {
            await Discord.queue(`Sorry, ${member}, but <@${id}> is not a player in this match.`, channel);
            throw new Warning("Player not part of the match.");
        }

        try {
            challenge.setStat(challenge.player(await Discord.findUserById(id)), +depth, time, !!completed);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //                                             #           #
    //                                             #           #
    // ###    ##   # #    ##   # #    ##    ###   ###    ###  ###
    // #  #  # ##  ####  #  #  # #   # ##  ##      #    #  #   #
    // #     ##    #  #  #  #  # #   ##      ##    #    # ##   #
    // #      ##   #  #   ##    #     ##   ###      ##   # #    ##
    /**
     * Removes a player's stat in a challenge.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async removestat(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkHasParameters(message, member, "Use `!removestat` followed by the name of the person whose stats are being removed.", channel)) {
            return false;
        }

        await Commands.checkChallengeIsNotVoided(challenge, member, channel);

        if (!idParse.test(message)) {
            return false;
        }

        const {groups: {id}} = idParse.exec(message);

        if (challenge.players.challengingPlayer.discordId !== id && challenge.players.challengedPlayer.discordId !== id) {
            await Discord.queue(`Sorry, ${member}, but <@${id}> is not a player in this match.`, channel);
            throw new Warning("Player not part of the match.");
        }

        try {
            challenge.removeStat(challenge.player(await Discord.findUserById(id)));
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //              #       #
    //                      #
    // # #    ##   ##     ###   ###   ###  # #    ##
    // # #   #  #   #    #  #  #  #  #  #  ####  # ##
    // # #   #  #   #    #  #   ##   # ##  #  #  ##
    //  #     ##   ###    ###  #      # #  #  #   ##
    //                          ###
    /**
     * Voids a game.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async voidgame(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!voidgame` by itself to void this match.", channel)) {
            return false;
        }

        await Commands.checkChallengeIsNotVoided(challenge, member, channel);

        try {
            challenge.void(true);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //                          #       #
    //                                  #
    // #  #  ###   # #    ##   ##     ###   ###   ###  # #    ##
    // #  #  #  #  # #   #  #   #    #  #  #  #  #  #  ####  # ##
    // #  #  #  #  # #   #  #   #    #  #   ##   # ##  #  #  ##
    //  ###  #  #   #     ##   ###    ###  #      # #  #  #   ##
    //                                      ###
    /**
     * Unoids a game.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async unvoidgame(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!unvoidgame` by itself to restore this match.", channel)) {
            return false;
        }

        await Commands.checkChallengeIsVoided(challenge, member, channel);

        try {
            challenge.void(false);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }

    //       ##
    //        #
    //  ##    #     ##    ###    ##    ###   ###  # #    ##
    // #      #    #  #  ##     # ##  #  #  #  #  ####  # ##
    // #      #    #  #    ##   ##     ##   # ##  #  #  ##
    //  ##   ###    ##   ###     ##   #      # #  #  #   ##
    //                                 ###
    /**
     * Closes a game.
     * @param {DiscordJs.GuildMember} member The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async closegame(member, channel, message) {
        if (!Commands.checkChannelIsOnServer(channel)) {
            return false;
        }

        await Commands.checkMemberIsOwner(member);

        const challenge = await Commands.checkChannelIsChallengeRoom(channel, member);
        if (!challenge) {
            return false;
        }

        if (!await Commands.checkNoParameters(message, member, "Use `!closegame` by itself to close this match.", channel)) {
            return false;
        }

        await Commands.checkChallengeIsConfirmedOrVoided(challenge, member, channel);

        try {
            challenge.close(member);
        } catch (err) {
            await Discord.queue(`Sorry, ${member}, but there was a server error.  An admin will be notified about this.`, channel);
            throw err;
        }

        return true;
    }
}

module.exports = Commands;
