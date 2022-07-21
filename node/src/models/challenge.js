/**
 * @typedef {import("../../types/node/challengeTypes").Challenge} ChallengeTypes.Challenge
 * @typedef {import("../../types/node/challengeTypes").ChallengeWithPlayers} ChallengeTypes.ChallengeWithPlayers
 * @typedef {import("../../types/node/challengeTypes").Match} ChallengeTypes.Match
 * @typedef {import("../../types/node/challengeTypes").Stats} ChallengeTypes.Stats
 * @typedef {import("../../types/node/challengeTypes").UpcomingChallenge} ChallengeTypes.UpcomingChallenge
 * @typedef {import("../../types/node/playerTypes").Player} PlayerTypes.Player
 */

const Db = require("../database/challenge"),
    DiscordJs = require("discord.js"),
    Exception = require("../errors/exception"),
    Player = require("./player"),
    Rating = require("./rating"),
    SeasonDb = require("../database/season"),
    Time = require("../../public/js/common/time"),

    channelParse = /^[0-9a-z]+-[0-9a-z]+-(?<id>[1-9][0-9]*)$/i,
    timezoneParse = /^[1-9][0-9]*, (?<timezoneName>.*)$/;

/** @type {typeof import("../discord")} */
let Discord;

setTimeout(() => {
    Discord = require("../discord");
}, 0);

//   ###   #              ##     ##
//  #   #  #               #      #
//  #      # ##    ###     #      #     ###   # ##    ## #   ###
//  #      ##  #      #    #      #    #   #  ##  #  #  #   #   #
//  #      #   #   ####    #      #    #####  #   #   ##    #####
//  #   #  #   #  #   #    #      #    #      #   #  #      #
//   ###   #   #   ####   ###    ###    ###   #   #   ###    ###
//                                                   #   #
//                                                    ###
/**
 * A class representing a challenge.
 */
class Challenge {
    //                          #
    //                          #
    //  ##   ###    ##    ###  ###    ##
    // #     #  #  # ##  #  #   #    # ##
    // #     #     ##    # ##   #    ##
    //  ##   #      ##    # #    ##   ##
    /**
     * Creates a new challenge and adds it to the database.
     * @param {PlayerTypes.Player} challengingPlayer The player issuing the challenge.
     * @param {PlayerTypes.Player} challengedPlayer The player receiving the challenge.
     * @returns {Promise<Challenge>} The created challenge.
     */
    static async create(challengingPlayer, challengedPlayer) {
        let challenge;
        try {
            challenge = await Db.add(challengingPlayer, challengedPlayer);
        } catch (err) {
            throw new Exception("There was a database error creating a challenge.", err);
        }

        const challengeObj = new Challenge(challenge);
        await challengeObj.setupPlayers();

        await Discord.createChannel(challengeObj.channelName, DiscordJs.ChannelType.GuildText, [
            {
                id: Discord.id,
                deny: ["ViewChannel"]
            }, {
                id: challengeObj.players.challengingPlayer.discordId,
                allow: ["ViewChannel"]
            }, {
                id: challengeObj.players.challengedPlayer.discordId,
                allow: ["ViewChannel"]
            }
        ], `${challengeObj.players.challengingPlayer.name} challenged ${challengeObj.players.challengedPlayer.name}.`);

        let challengesCategory = /** @type {DiscordJs.CategoryChannel} */ (Discord.findChannelByName("Challenges")); // eslint-disable-line no-extra-parens
        if (challengesCategory.children.cache.size >= 40) {
            const oldPosition = challengesCategory.position;
            await challengesCategory.setName("Old Challenges", "Exceeded 40 challenges.");
            challengesCategory = /** @type {DiscordJs.CategoryChannel} */ (await Discord.createChannel("Challenges", DiscordJs.ChannelType.GuildCategory, [], "Exceeded 40 challenges.")); // eslint-disable-line no-extra-parens
            await challengesCategory.setPosition(oldPosition + 1);
        }

        await challengeObj.channel.setParent(challengesCategory, {lockPermissions: false});
        await challengeObj.channel.setTopic(`${challengeObj.players.challengingPlayer.name} vs ${challengeObj.players.challengedPlayer.name} - View the pinned post for challenge information.`);

        await challengeObj.updatePinnedPost();

        return challengeObj;
    }

    //   #    #             #
    //  # #                 #
    //  #    ##    ###    ###
    // ###    #    #  #  #  #
    //  #     #    #  #  #  #
    //  #    ###   #  #   ###
    /**
     * Find a current challenge for two players.
     * @param {PlayerTypes.Player} player1 The first player.
     * @param {PlayerTypes.Player} player2 The second player.
     * @returns {Promise<Challenge>} A promise that resolves with the challenge found.
     */
    static async find(player1, player2) {
        let challenge;
        try {
            challenge = await Db.find(player1, player2);
        } catch (err) {
            throw new Exception("There was a database error creating a challenge.", err);
        }

        if (!challenge) {
            return void 0;
        }

        const challengeObj = new Challenge(challenge);
        challengeObj.setupPlayers();

        return challengeObj;
    }

    //              #
    //              #
    //  ###   ##   ###
    // #  #  # ##   #
    //  ##   ##     #
    // #      ##     ##
    //  ###
    /**
     * Gets a challenge from the database by its ID.
     * @param {number} id The challenge ID.
     * @returns {Promise<Challenge>} The challenge.
     */
    static async get(id) {
        let challenge;
        try {
            challenge = await Db.get(id);
        } catch (err) {
            throw new Exception("There was a database error getting a challenge.", err);
        }

        if (!challenge) {
            return void 0;
        }

        const challengeObj = new Challenge(challenge);
        await challengeObj.setupPlayers();

        return challengeObj;
    }

    //              #    ###          ##   #                             ##
    //              #    #  #        #  #  #                              #
    //  ###   ##   ###   ###   #  #  #     ###    ###  ###   ###    ##    #
    // #  #  # ##   #    #  #  #  #  #     #  #  #  #  #  #  #  #  # ##   #
    //  ##   ##     #    #  #   # #  #  #  #  #  # ##  #  #  #  #  ##     #
    // #      ##     ##  ###     #    ##   #  #   # #  #  #  #  #   ##   ###
    //  ###                     #
    /**
     * Gets a challenge from the database by its channel.
     * @param {DiscordJs.TextChannel} channel The channel.
     * @returns {Promise<Challenge>} The challenge.
     */
    static getByChannel(channel) {
        if (!channelParse.test(channel.name)) {
            return void 0;
        }

        const {groups: {id}} = channelParse.exec(channel.name);

        return Challenge.get(+id);
    }

    //              #    ###                  #   #                ####              #  #              #
    //              #    #  #                 #                    #                 ####              #
    //  ###   ##   ###   #  #   ##   ###    ###  ##    ###    ###  ###    ##   ###   ####   ##   # #   ###    ##   ###
    // #  #  # ##   #    ###   # ##  #  #  #  #   #    #  #  #  #  #     #  #  #  #  #  #  # ##  ####  #  #  # ##  #  #
    //  ##   ##     #    #     ##    #  #  #  #   #    #  #   ##   #     #  #  #     #  #  ##    #  #  #  #  ##    #
    // #      ##     ##  #      ##   #  #   ###  ###   #  #  #     #      ##   #     #  #   ##   #  #  ###    ##   #
    //  ###                                                   ###
    /**
     * Gets all pending challenges for a player.
     * @param {DiscordJs.GuildMember} member The member to get challenges for.
     * @returns {Promise<Challenge[]>} A promise that resolves with the challenges for a player.
     */
    static async getPendingForMember(member) {
        let player;
        try {
            player = await Player.getByDiscordId(member.id);
        } catch (err) {
            throw new Exception("There was a database error getting a pilot while retrieving pending challenges for a member.", err);
        }

        if (!player) {
            return [];
        }

        let challenges;
        try {
            challenges = await Db.getPendingForPlayer(player);
        } catch (err) {
            throw new Exception("There was a database error retrieving pending challenges for a member.", err);
        }

        const challengesObj = challenges.map((challenge) => {
            const challengeObj = new Challenge(challenge);
            return challengeObj;
        });

        for (const challengeObj of challengesObj) {
            await challengeObj.setupPlayers();
        }

        return challengesObj;
    }

    //              #    #  #         #          #                  ###          ##
    //              #    ####         #          #                  #  #        #  #
    //  ###   ##   ###   ####   ###  ###    ##   ###    ##    ###   ###   #  #   #     ##    ###   ###    ##   ###
    // #  #  # ##   #    #  #  #  #   #    #     #  #  # ##  ##     #  #  #  #    #   # ##  #  #  ##     #  #  #  #
    //  ##   ##     #    #  #  # ##   #    #     #  #  ##      ##   #  #   # #  #  #  ##    # ##    ##   #  #  #  #
    // #      ##     ##  #  #   # #    ##   ##   #  #   ##   ###    ###     #    ##    ##    # #  ###     ##   #  #
    //  ###                                                                #
    /**
     * Get the matches for the season.
     * @param {number} season The season.
     * @param {number} [page] The page number.
     * @returns {Promise<ChallengeTypes.Match[]>} The matches for the season.
     */
    static async getMatchesBySeason(season, page) {
        try {
            return await Db.getMatchesBySeason(season, page || 1, Challenge.matchesPerPage);
        } catch (err) {
            throw new Exception("There was a database error getting matches by season.", err);
        }
    }

    //              #    #  #                           #
    //              #    #  #
    //  ###   ##   ###   #  #  ###    ##    ##   # #   ##    ###    ###
    // #  #  # ##   #    #  #  #  #  #     #  #  ####   #    #  #  #  #
    //  ##   ##     #    #  #  #  #  #     #  #  #  #   #    #  #   ##
    // #      ##     ##   ##   ###    ##    ##   #  #  ###   #  #  #
    //  ###                    #                                    ###
    /**
     * Get upcoming challenges.
     * @param {DiscordJs.GuildMember} [member] The optional guild member to get upcoming matches for.
     * @returns {Promise<ChallengeTypes.UpcomingChallenge[]>} A promise that resolves with the upcoming challenges.
     */
    static async getUpcoming(member) {
        let player;

        if (member) {
            player = await Player.getByDiscordId(member.id);
        }

        try {
            return await Db.getUpcoming(player);
        } catch (err) {
            throw new Exception("There was a database error getting upcoming challenges.", err);
        }
    }

    //              #    #  #                           #                 ##            #   ##                     ##           #             #   ##                      #
    //              #    #  #                                            #  #           #  #  #                     #           #             #  #  #                     #
    //  ###   ##   ###   #  #  ###    ##    ##   # #   ##    ###    ###  #  #  ###    ###  #      ##   # #   ###    #     ##   ###    ##    ###  #      ##   #  #  ###   ###
    // #  #  # ##   #    #  #  #  #  #     #  #  ####   #    #  #  #  #  ####  #  #  #  #  #     #  #  ####  #  #   #    # ##   #    # ##  #  #  #     #  #  #  #  #  #   #
    //  ##   ##     #    #  #  #  #  #     #  #  #  #   #    #  #   ##   #  #  #  #  #  #  #  #  #  #  #  #  #  #   #    ##     #    ##    #  #  #  #  #  #  #  #  #  #   #
    // #      ##     ##   ##   ###    ##    ##   #  #  ###   #  #  #     #  #  #  #   ###   ##    ##   #  #  ###   ###    ##     ##   ##    ###   ##    ##    ###  #  #    ##
    //  ###                    #                                    ###                                      #
    /**
     * Gets the upcoming challenges as well as the count of completed challenges.
     * @param {number} season The season.
     * @returns {Promise<{upcoming: ChallengeTypes.Match[], totalCompleted: number}>} A promise that resolves with the upcoming challenges and the count of completed challenges for the specified season.
     */
    static async getUpcomingAndCompletedCount(season) {
        try {
            return await Db.getUpcomingAndCompletedCount(season);
        } catch (err) {
            throw new Exception("There was a database error getting upcoming challenges and completed challenge count.", err);
        }
    }

    //       #                             ##
    //       #                              #
    //  ##   ###    ###  ###   ###    ##    #
    // #     #  #  #  #  #  #  #  #  # ##   #
    // #     #  #  # ##  #  #  #  #  ##     #
    //  ##   #  #   # #  #  #  #  #   ##   ###
    /**
     * Gets the channel for the challenge.
     * @returns {DiscordJs.TextChannel} The Discord channel.
     */
    get channel() {
        return /** @type {DiscordJs.TextChannel} */(Discord.channels.find((c) => c.name.endsWith(`-${this._id}`))); // eslint-disable-line no-extra-parens
    }

    //       #                             ##    #  #
    //       #                              #    ## #
    //  ##   ###    ###  ###   ###    ##    #    ## #   ###  # #    ##
    // #     #  #  #  #  #  #  #  #  # ##   #    # ##  #  #  ####  # ##
    // #     #  #  # ##  #  #  #  #  ##     #    # ##  # ##  #  #  ##
    //  ##   #  #   # #  #  #  #  #   ##   ###   #  #   # #  #  #   ##
    /**
     * Gets the channel name for the challenge.
     * @returns {string} The channel name.
     */
    get channelName() {
        return `${Player.nameForDiscordChannel(this.players.challengingPlayer)}-${Player.nameForDiscordChannel(this.players.challengedPlayer)}-${this._id}`;
    }

    //                           #                       #
    //                           #                       #
    //  ##    ##   ###    ###   ###   ###   #  #   ##   ###    ##   ###
    // #     #  #  #  #  ##      #    #  #  #  #  #      #    #  #  #  #
    // #     #  #  #  #    ##    #    #     #  #  #      #    #  #  #
    //  ##    ##   #  #  ###      ##  #      ###   ##     ##   ##   #
    /**
     * Creates a new challenge.
     * @param {ChallengeTypes.ChallengeWithPlayers} options The options to create the challenge with.
     */
    constructor(options) {
        this._id = options._id;
        this.players = options.players;
        this.title = options.title;
        this.suggestedTime = options.suggestedTime;
        this.suggestedByPlayer = options.suggestedByPlayer;
        this.suggestedByPlayerId = options.suggestedByPlayerId;
        this.matchTime = options.matchTime;
        this.reportTime = options.reportTime;
        this.confirmedTime = options.confirmedTime;
        this.closeTime = options.closeTime;
        this.voidTime = options.voidTime;
        this.rematchedTime = options.rematchedTime;
        this.rematchRequestedByPlayerId = options.rematchRequestedByPlayerId;
        this.rematchRequestedByPlayer = options.rematchRequestedByPlayer;
        this.season = options.season;
        this.postseason = options.postseason;
        this.stats = options.stats;
    }

    //                     #    #                #  #         #          #
    //                    # #                    ####         #          #
    //  ##    ##   ###    #    ##    ###   # #   ####   ###  ###    ##   ###
    // #     #  #  #  #  ###    #    #  #  ####  #  #  #  #   #    #     #  #
    // #     #  #  #  #   #     #    #     #  #  #  #  # ##   #    #     #  #
    //  ##    ##   #  #   #    ###   #     #  #  #  #   # #    ##   ##   #  #
    /**
     * Confirms a win for a match.
     * @param {DiscordJs.GuildMember} member The player confirming the match.
     * @returns {Promise} A promise that resolves when the match has been confirmed.
     */
    async confirmMatch(member) {
        this.confirmedTime = new Date();

        try {
            await Db.confirmMatch(this);
        } catch (err) {
            throw new Exception("There was a database error confirming a match.", err);
        }

        try {
            const embed = Discord.embedBuilder({
                title: "Match Confirmed",
                description: `This match has been confirmed as a win for **${member}**.  Interested in playing another right now?  Use the \`!rematch\` command!`,
                fields: [
                    {
                        name: "Post a screenshot of the Game Over screen",
                        value: "Remember, matches are only official when each player posts a screen shot of the Game Over screen that includes statistics from the game."
                    },
                    {
                        name: "Add a match comment",
                        value: "Until the channel is removed, you can add a match comment with the `!comment` command.  It is best used to summarize what happened during your run!"
                    },
                    {
                        name: "This channel is now closed",
                        value: "No further match-related commands will be accepted.  If you need to adjust anything in this match, please notify an admin immediately.  This channel will be removed once the stats have been posted."
                    }
                ]
            });

            await Discord.richQueue(embed, this.channel);

            await Discord.queue(`The match at ${this.channel} has been confirmed.  Please add stats and close the channel.`, /** @type {DiscordJs.TextChannel} */(Discord.findChannelByName("nnnbot-alerts"))); // eslint-disable-line no-extra-parens

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error confirming a match.  Please resolve this manually as soon as possible.", err);
        }
    }

    //       ##
    //        #
    //  ##    #     ##    ###    ##
    // #      #    #  #  ##     # ##
    // #      #    #  #    ##   ##
    //  ##   ###    ##   ###     ##
    /**
     * Closes the match.
     * @param {DiscordJs.GuildMember} member The member closing the challenge.
     * @returns {Promise} A promise that resolves when the match is closed.
     */
    async close(member) {
        let season;
        if (this.matchTime) {
            try {
                season = (await SeasonDb.getFromDate(this.matchTime))._id - (this.postseason ? 1 : 0);
            } catch (err) {
                throw new Exception("There was a database error getting the season for this match.", err);
            }
        }

        this.closeTime = new Date();
        this.season = season;

        try {
            await Db.close(this);
        } catch (err) {
            throw new Exception("There was a database error closing a match.", err);
        }

        try {
            await this.channel.delete(`${member} closed the challenge.`);

            if (this.confirmedTime && !this.voidTime) {
                await Discord.richQueue(Discord.embedBuilder({
                    title: `${this.players.challengingPlayer.name} ${this.stats.challengingPlayer.won ? 1 : 0}-${this.stats.challengedPlayer.won ? 1 : 0} ${this.players.challengedPlayer.name}`,
                    description: `Played ${this.matchTime.toLocaleString("en-US", {timeZone: process.env.DEFAULT_TIMEZONE, month: "numeric", day: "numeric", year: "numeric", hour12: true, hour: "numeric", minute: "2-digit", timeZoneName: "short"})}`,
                    fields: [
                        {
                            name: `${this.players.challengingPlayer.name} Stats`,
                            value: `Depth: **${this.stats.challengingPlayer.depth}**\nTime: **${Time.formatTimespan(this.stats.challengingPlayer.time)}**${this.stats.challengingPlayer.completed ? "\n**Completed the game!**" : ""}`,
                            inline: true
                        }, {
                            name: `${this.players.challengedPlayer.name} Stats`,
                            value: `Depth: **${this.stats.challengedPlayer.depth}**\nTime: **${Time.formatTimespan(this.stats.challengedPlayer.time)}**${this.stats.challengedPlayer.completed ? "\n**Completed the game!**" : ""}`,
                            inline: true
                        }, {
                            name: "For match details, visit:",
                            value: `https://${process.env.DOMAIN}/match/${this._id}/${encodeURI(this.players.challengingPlayer.name)}/${encodeURI(this.players.challengedPlayer.name)}`,
                            inline: false
                        }
                    ]
                }), /** @type {DiscordJs.TextChannel} */(Discord.findChannelByName("match-results"))); // eslint-disable-line no-extra-parens
            }
        } catch (err) {
            throw new Exception("There was a critical Discord error closing a challenge.  Please resolve this manually as soon as possible.", err);
        }

        if (this.confirmedTime && !this.voidTime) {
            Rating.updateRatingsForSeasonFromChallenge(this.season);
        }
    }

    //                     #    #                ###    #
    //                    # #                     #
    //  ##    ##   ###    #    ##    ###   # #    #    ##    # #    ##
    // #     #  #  #  #  ###    #    #  #  ####   #     #    ####  # ##
    // #     #  #  #  #   #     #    #     #  #   #     #    #  #  ##
    //  ##    ##   #  #   #    ###   #     #  #   #    ###   #  #   ##
    /**
     * Confirms a suggested time.
     * @returns {Promise} A promise that resolves when the suggested time has been confirmed.
     */
    async confirmTime() {
        try {
            await Db.setTime(this, this.suggestedTime);
        } catch (err) {
            throw new Exception("There was a database error confirming a suggested time.", err);
        }

        this.matchTime = this.suggestedTime;
        this.suggestedTime = void 0;
        this.suggestedByPlayer = void 0;
        this.suggestedByPlayerId = void 0;

        try {
            const times = {};
            for (const member of this.channel.members.values()) {
                const player = await Player.getByDiscordId(member.id),
                    timezone = await player.timezone || process.env.DEFAULT_TIMEZONE,
                    yearWithTimezone = this.matchTime.toLocaleString("en-US", {timeZone: timezone, year: "numeric", timeZoneName: "long"});

                if (timezoneParse.test(yearWithTimezone)) {
                    const {groups: {timezoneName}} = timezoneParse.exec(yearWithTimezone);

                    if (timezoneName) {
                        times[timezoneName] = this.matchTime.toLocaleString("en-US", {timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"});
                    }
                }
            }

            const sortedTimes = Object.keys(times).map((tz) => ({timezone: tz, displayTime: times[tz], value: new Date(times[tz])})).sort((a, b) => {
                if (a.value.getTime() !== b.value.getTime()) {
                    return b.value.getTime() - a.value.getTime();
                }

                return a.timezone.localeCompare(b.timezone);
            });

            await Discord.richQueue(Discord.embedBuilder({
                description: "The time for this match has been set.",
                fields: sortedTimes.map((t) => ({name: t.timezone, value: t.displayTime}))
            }), this.channel);

            await Discord.richQueue(Discord.embedBuilder({
                title: `${this.players.challengingPlayer.name} vs ${this.players.challengedPlayer.name}`,
                description: `This match is scheduled for ${this.matchTime.toLocaleString("en-US", {timeZone: process.env.DEFAULT_TIMEZONE, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"})}`,
                fields: [
                    {
                        name: "Match Time",
                        value: `Use \`!time ${this._id}\` to get the time of this match in your own time zone, or \`!countdown ${this._id}\` to get the amount of time remaining until the start of the match.`
                    }
                ]
            }), /** @type {DiscordJs.TextChannel} */(Discord.findChannelByName("scheduled-matches"))); // eslint-disable-line no-extra-parens

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error confirming a time for a challenge.  Please resolve this manually as soon as possible.", err);
        }
    }

    //                          #          ###                      #          #
    //                          #          #  #                     #          #
    //  ##   ###    ##    ###  ###    ##   #  #   ##   # #    ###  ###    ##   ###
    // #     #  #  # ##  #  #   #    # ##  ###   # ##  ####  #  #   #    #     #  #
    // #     #     ##    # ##   #    ##    # #   ##    #  #  # ##   #    #     #  #
    //  ##   #      ##    # #    ##   ##   #  #   ##   #  #   # #    ##   ##   #  #
    /**
     * Creates a rematch.
     * @returns {Promise} A promise that resolves when the rematch is created.
     */
    async createRematch() {
        this.rematchedTime = new Date();

        try {
            await Db.createRematch(this);
        } catch (err) {
            throw new Exception("There was a database error marking a rematch as created.", err);
        }

        const challenge = await Challenge.create(this.players.challengingPlayer, this.players.challengedPlayer);

        try {
            await Discord.queue(`The rematch has been created!  Visit ${challenge.channel} to get started.`, this.channel);

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error creating a rematch.  Please resolve this manually as soon as possible.", err);
        }
    }

    //                                            #
    //                                            #
    //  ##   ###   ###    ##   ###    ##   ###   ###
    // #  #  #  #  #  #  #  #  #  #  # ##  #  #   #
    // #  #  #  #  #  #  #  #  #  #  ##    #  #   #
    //  ##   ###   ###    ##   #  #   ##   #  #    ##
    //       #     #
    /**
     * Gets the opponent player for the challenge.
     * @param {DiscordJs.GuildMember} member The guild member.
     * @returns {PlayerTypes.Player} The player.
     */
    opponent(member) {
        return member.id === this.players.challengingPlayer.discordId ? this.players.challengedPlayer : this.players.challengingPlayer;
    }

    //       ##
    //        #
    // ###    #     ###  #  #   ##   ###
    // #  #   #    #  #  #  #  # ##  #  #
    // #  #   #    # ##   # #  ##    #
    // ###   ###    # #    #    ##   #
    // #                  #
    /**
     * Gets the player for the challenge.
     * @param {DiscordJs.GuildMember | DiscordJs.User} member The guild member.
     * @returns {PlayerTypes.Player} The player.
     */
    player(member) {
        return member.id === this.players.challengingPlayer.discordId ? this.players.challengingPlayer : this.players.challengedPlayer;
    }

    //                                      ##    #           #
    //                                     #  #   #           #
    // ###    ##   # #    ##   # #    ##    #    ###    ###  ###
    // #  #  # ##  ####  #  #  # #   # ##    #    #    #  #   #
    // #     ##    #  #  #  #  # #   ##    #  #   #    # ##   #
    // #      ##   #  #   ##    #     ##    ##     ##   # #    ##
    /**
     * Removes a player's stats for a match.
     * @param {PlayerTypes.Player} player The player.
     * @returns {Promise} A promise that resolves when the stat has been removed.
     */
    async removeStat(player) {
        const challengingPlayer = player._id === this.players.challengingPlayerId;

        if (!this.stats) {
            this.stats = {
                challengingPlayer: {},
                challengedPlayer: {}
            };
        }

        if (challengingPlayer) {
            this.stats.challengingPlayer.depth = void 0;
            this.stats.challengingPlayer.time = void 0;
            this.stats.challengingPlayer.completed = void 0;
        } else {
            this.stats.challengedPlayer.depth = void 0;
            this.stats.challengedPlayer.time = void 0;
            this.stats.challengedPlayer.completed = void 0;
        }

        try {
            await Db.removeStat(this, challengingPlayer);
        } catch (err) {
            throw new Exception("There was a database error removing a stat.", err);
        }

        try {
            await Discord.queue(`Stats were removed for <@${player.discordId}>.`, this.channel);

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error removing stats for a match.  Please resolve this manually as soon as possible.", err);
        }
    }

    //                                #    #  #         #          #
    //                                #    ####         #          #
    // ###    ##   ###    ##   ###   ###   ####   ###  ###    ##   ###
    // #  #  # ##  #  #  #  #  #  #   #    #  #  #  #   #    #     #  #
    // #     ##    #  #  #  #  #      #    #  #  # ##   #    #     #  #
    // #      ##   ###    ##   #       ##  #  #   # #    ##   ##   #  #
    //             #
    /**
     * Reports a loss in a match.
     * @param {DiscordJs.GuildMember} member The player reporting the loss.
     * @returns {Promise} A promise that resolves when the match is reported.
     */
    async reportMatch(member) {
        this.reportTime = new Date();

        const challengingPlayerWon = member.id === this.players.challengedPlayer.discordId;

        if (this.stats) {
            this.stats.challengingPlayer.won = challengingPlayerWon;
            this.stats.challengedPlayer.won = !challengingPlayerWon;
        } else {
            const challengingPlayer = {won: challengingPlayerWon},
                challengedPlayer = {won: !challengingPlayerWon};

            this.stats = {
                challengingPlayer,
                challengedPlayer
            };
        }

        try {
            await Db.reportMatch(this, challengingPlayerWon);
        } catch (err) {
            throw new Exception("There was a database error confirming a suggested time.", err);
        }

        try {
            await Discord.queue(`${member} has reported this match as a loss.  <@${this.opponent(member).discordId}>, type \`!confirm\` to lock in the win!`, this.channel);

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error reporting a match.  Please resolve this manually as soon as possible.", err);
        }
    }

    //                                       #    ###                      #          #
    //                                       #    #  #                     #          #
    // ###    ##    ###  #  #   ##    ###   ###   #  #   ##   # #    ###  ###    ##   ###
    // #  #  # ##  #  #  #  #  # ##  ##      #    ###   # ##  ####  #  #   #    #     #  #
    // #     ##    #  #  #  #  ##      ##    #    # #   ##    #  #  # ##   #    #     #  #
    // #      ##    ###   ###   ##   ###      ##  #  #   ##   #  #   # #    ##   ##   #  #
    //                #
    /**
     * Requests a rematch.
     * @param {DiscordJs.GuildMember} member The member requesting the rematch.
     * @returns {Promise} A promise that resolves when the rematch has been requested.
     */
    async requestRematch(member) {
        this.rematchRequestedByPlayer = this.player(member);
        this.rematchRequestedByPlayerId = this.rematchRequestedByPlayer._id;

        try {
            await Db.requestRematch(this);
        } catch (err) {
            throw new Exception("There was a database error requesting a rematch.", err);
        }

        try {
            await Discord.queue(`${member} is requesting a rematch!  <@${this.opponent(member).discordId}>, do you accept?  The match will be scheduled immediately.  Use the \`!rematch\` command, and the new challenge will be created!`, this.channel);

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error requesting a rematch.  Please resolve this manually as soon as possible.", err);
        }
    }

    //               #     ##                                  #
    //               #    #  #                                 #
    //  ###    ##   ###   #      ##   # #   # #    ##   ###   ###
    // ##     # ##   #    #     #  #  ####  ####  # ##  #  #   #
    //   ##   ##     #    #  #  #  #  #  #  #  #  ##    #  #   #
    // ###     ##     ##   ##    ##   #  #  #  #   ##   #  #    ##
    /**
     * Sets a comment on a challenge.
     * @param {DiscordJs.GuildMember} member The member setting the comment.
     * @param {string} message The message.
     * @returns {Promise} A promise that resolves when the comment is set.
     */
    async setComment(member, message) {
        if (!this.stats) {
            this.stats = {
                challengingPlayer: {},
                challengedPlayer: {}
            };
        }

        const player = this.player(member);

        let useChallengingPlayer = false;
        if (player._id === this.players.challengingPlayerId) {
            this.stats.challengingPlayer.comment = message;
            useChallengingPlayer = true;
        } else {
            this.stats.challengedPlayer.comment = message;
        }

        try {
            await Db.setComment(this, useChallengingPlayer, message);
        } catch (err) {
            throw new Exception("There was a database error setting a match comment.", err);
        }

        await Discord.queue(`${member}, your comment has been recorded.`, this.channel);
    }

    //               #    ###                 #
    //               #    #  #                #
    //  ###    ##   ###   #  #   ##    ###   ###    ###    ##    ###   ###    ##   ###
    // ##     # ##   #    ###   #  #  ##      #    ##     # ##  #  #  ##     #  #  #  #
    //   ##   ##     #    #     #  #    ##    #      ##   ##    # ##    ##   #  #  #  #
    // ###     ##     ##  #      ##   ###      ##  ###     ##    # #  ###     ##   #  #
    /**
     * Sets the postseason of the challenge.
     * @param {boolean} postseason Whether to set the challenge to the postseason.
     * @returns {Promise} A promise that resolves when the postseason has been set.
     */
    async setPostseason(postseason) {
        try {
            await Db.setPostseason(this, postseason);
        } catch (err) {
            throw new Exception("There was a database error setting the postseason.", err);
        }

        try {
            await Discord.queue(`This match has been set to be a ${postseason ? "postseason" : "regular season"} match.`, this.channel);

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error setting the postseason.  Please resolve this manually as soon as possible.", err);
        }
    }

    //               #     ##    #           #
    //               #    #  #   #           #
    //  ###    ##   ###    #    ###    ###  ###
    // ##     # ##   #      #    #    #  #   #
    //   ##   ##     #    #  #   #    # ##   #
    // ###     ##     ##   ##     ##   # #    ##
    /**
     * Sets a player's stats for a match.
     * @param {PlayerTypes.Player} player The player.
     * @param {number} depth The depth, in meters.
     * @param {number} timeSeconds The time, in seconds.
     * @param {boolean} completed Whether they completed the game.
     * @returns {Promise} A promise that resolves when the stat has been set.
     */
    async setStat(player, depth, timeSeconds, completed) {
        const challengingPlayer = player._id === this.players.challengingPlayerId;

        if (!this.stats) {
            this.stats = {
                challengingPlayer: {},
                challengedPlayer: {}
            };
        }

        if (challengingPlayer) {
            this.stats.challengingPlayer.depth = depth;
            this.stats.challengingPlayer.time = timeSeconds;
            this.stats.challengingPlayer.completed = completed;
        } else {
            this.stats.challengedPlayer.depth = depth;
            this.stats.challengedPlayer.time = timeSeconds;
            this.stats.challengedPlayer.completed = completed;
        }

        try {
            await Db.setStat(this, challengingPlayer, depth, timeSeconds, completed);
        } catch (err) {
            throw new Exception("There was a database error setting a stat.", err);
        }

        try {
            await Discord.queue(`Stats were added for <@${player.discordId}>:\n**Depth**: ${depth}m\n**Time**: ${Time.formatTimespan(timeSeconds)}\n**Completed**: ${completed ? "Yes" : "No"}`, this.channel);

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error adding stats for a match.  Please resolve this manually as soon as possible.", err);
        }
    }

    //               #    ###    #
    //               #     #
    //  ###    ##   ###    #    ##    # #    ##
    // ##     # ##   #     #     #    ####  # ##
    //   ##   ##     #     #     #    #  #  ##
    // ###     ##     ##   #    ###   #  #   ##
    /**
     * Sets the time for the challenge.
     * @param {Date} date The date and time for the challenge.
     * @returns {Promise} A promise that resolves when the time has been set.
     */
    async setTime(date) {
        try {
            await Db.setTime(this, date);
        } catch (err) {
            throw new Exception("There was a database error setting a match time.", err);
        }

        this.matchTime = date;
        this.suggestedTime = void 0;
        this.suggestedByPlayer = void 0;
        this.suggestedByPlayerId = void 0;

        try {
            const times = {};
            for (const member of this.channel.members.values()) {
                const player = await Player.getByDiscordId(member.id),
                    timezone = await player.timezone || process.env.DEFAULT_TIMEZONE,
                    yearWithTimezone = this.matchTime.toLocaleString("en-US", {timeZone: timezone, year: "numeric", timeZoneName: "long"});

                if (timezoneParse.test(yearWithTimezone)) {
                    const {groups: {timezoneName}} = timezoneParse.exec(yearWithTimezone);

                    if (timezoneName) {
                        times[timezoneName] = this.matchTime.toLocaleString("en-US", {timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"});
                    }
                }
            }

            const sortedTimes = Object.keys(times).map((tz) => ({timezone: tz, displayTime: times[tz], value: new Date(times[tz])})).sort((a, b) => {
                if (a.value.getTime() !== b.value.getTime()) {
                    return b.value.getTime() - a.value.getTime();
                }

                return a.timezone.localeCompare(b.timezone);
            });

            await Discord.richQueue(Discord.embedBuilder({
                description: "The time for this match has been set.",
                fields: sortedTimes.map((t) => ({name: t.timezone, value: t.displayTime}))
            }), this.channel);

            await Discord.richQueue(Discord.embedBuilder({
                title: `${this.players.challengingPlayer.name} vs ${this.players.challengedPlayer.name}`,
                description: `This match is scheduled for ${this.matchTime.toLocaleString("en-US", {timeZone: process.env.DEFAULT_TIMEZONE, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"})}`,
                fields: [
                    {
                        name: "Match Time",
                        value: `Use \`!time ${this._id}\` to get the time of this match in your own time zone, or \`!countdown ${this._id}\` to get the amount of time remaining until the start of the match.`
                    }
                ]
            }), /** @type {DiscordJs.TextChannel} */(Discord.findChannelByName("scheduled-matches"))); // eslint-disable-line no-extra-parens

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error confirming a time for a challenge.  Please resolve this manually as soon as possible.", err);
        }
    }

    //               #    ###    #     #    ##
    //               #     #           #     #
    //  ###    ##   ###    #    ##    ###    #     ##
    // ##     # ##   #     #     #     #     #    # ##
    //   ##   ##     #     #     #     #     #    ##
    // ###     ##     ##   #    ###     ##  ###    ##
    /**
     * Sets the title for a challenge.
     * @param {string} title The title to set the challenge to.
     * @returns {Promise} A promise that resolves when the title has been set.
     */
    async setTitle(title) {
        try {
            Db.setTitle(this, title);
        } catch (err) {
            throw new Exception("There was a database error setting a challenge title.", err);
        }

        this.title = title;

        try {
            await Discord.queue(`The title of this challenge has been ${title && title !== "" ? `set to **${title}**` : "unset"}.`, this.channel);

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error setting a challenge title.  Please resolve this manually as soon as possible.", err);
        }
    }

    //               #    #  #   #
    //               #    #  #
    //  ###    ##   ###   #  #  ##    ###   ###    ##   ###
    // ##     # ##   #    ####   #    #  #  #  #  # ##  #  #
    //   ##   ##     #    ####   #    #  #  #  #  ##    #
    // ###     ##     ##  #  #  ###   #  #  #  #   ##   #
    /**
     * Sets the winner of the challenge.
     * @param {PlayerTypes.Player} player The winning player.
     * @returns {Promise} A promise that resolves when the winner is set.
     */
    async setWinner(player) {
        this.reportTime = new Date();
        this.confirmedTime = new Date();

        const challengingPlayerWon = player._id === this.players.challengingPlayerId;

        if (this.stats) {
            this.stats.challengingPlayer.won = challengingPlayerWon;
            this.stats.challengedPlayer.won = !challengingPlayerWon;
        } else {
            const challengingPlayer = {won: challengingPlayerWon},
                challengedPlayer = {won: !challengingPlayerWon};

            this.stats = {
                challengingPlayer,
                challengedPlayer
            };
        }

        try {
            await Db.setWinner(this, challengingPlayerWon);
        } catch (err) {
            throw new Exception("There was a database error confirming a suggested time.", err);
        }

        try {
            const embed = Discord.embedBuilder({
                title: "Match Confirmed",
                description: `This match has been confirmed as a win for **<@${(challengingPlayerWon ? this.players.challengingPlayer : this.players.challengedPlayer).discordId}>**.  Interested in playing another right now?  Use the \`!rematch\` command!`,
                fields: [
                    {
                        name: "Post a screenshot of the Game Over screen",
                        value: "Remember, matches are only official when each player posts a screen shot of the Game Over screen that includes statistics from the game."
                    },
                    {
                        name: "Add a match comment",
                        value: "Until the channel is removed, you can add a match comment with the `!comment` command.  It is best used to summarize what happened during your run!"
                    },
                    {
                        name: "This channel is now closed",
                        value: "No further match-related commands will be accepted.  If you need to adjust anything in this match, please notify an admin immediately.  This channel will be removed once the stats have been posted."
                    }
                ]
            });

            await Discord.richQueue(embed, this.channel);

            await Discord.queue(`The match at ${this.channel} has been confirmed.  Please add stats and close the channel.`, /** @type {DiscordJs.TextChannel} */(Discord.findChannelByName("nnnbot-alerts"))); // eslint-disable-line no-extra-parens

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error reporting a match.  Please resolve this manually as soon as possible.", err);
        }
    }

    //               #                ###   ##
    //               #                #  #   #
    //  ###    ##   ###   #  #  ###   #  #   #     ###  #  #   ##   ###    ###
    // ##     # ##   #    #  #  #  #  ###    #    #  #  #  #  # ##  #  #  ##
    //   ##   ##     #    #  #  #  #  #      #    # ##   # #  ##    #       ##
    // ###     ##     ##   ###  ###   #     ###    # #    #    ##   #     ###
    //                          #                        #
    /**
     * Sets up player objects on a challenge.
     * @returns {Promise} A promise that resolves when the players are setup.
     */
    async setupPlayers() {
        if (!this.players.challengingPlayer) {
            try {
                this.players.challengingPlayer = await Player.get(this.players.challengingPlayerId);
            } catch (err) {
                throw new Exception("There was a database error getting the challenging player while setting up players.", err);
            }
        }

        if (!this.players.challengedPlayer) {
            try {
                this.players.challengedPlayer = await Player.get(this.players.challengedPlayerId);
            } catch (err) {
                throw new Exception("There was a database error getting the challenged player while setting up players.", err);
            }
        }

        if (this.suggestedByPlayerId === this.players.challengingPlayerId) {
            this.suggestedByPlayer = this.players.challengingPlayer;
        } else if (this.suggestedByPlayerId === this.players.challengedPlayerId) {
            this.suggestedByPlayer = this.players.challengedPlayer;
        }

        if (this.rematchRequestedByPlayerId === this.players.challengingPlayerId) {
            this.rematchRequestedByPlayer = this.players.challengingPlayer;
        } else if (this.rematchRequestedByPlayerId === this.players.challengedPlayerId) {
            this.rematchRequestedByPlayer = this.players.challengedPlayer;
        }
    }

    //                                        #    ###    #
    //                                        #     #
    //  ###   #  #   ###   ###   ##    ###   ###    #    ##    # #    ##
    // ##     #  #  #  #  #  #  # ##  ##      #     #     #    ####  # ##
    //   ##   #  #   ##    ##   ##      ##    #     #     #    #  #  ##
    // ###     ###  #     #      ##   ###      ##   #    ###   #  #   ##
    //               ###   ###
    /**
     * Suggests a time.
     * @param {DiscordJs.GuildMember} suggestingMember The member suggesting the time.
     * @param {Date} date The suggested date and time.
     * @return {Promise} A promise that resolves when the time has been suggested.
     */
    async suggestTime(suggestingMember, date) {
        try {
            await Db.suggestTime(this, this.player(suggestingMember), date);
        } catch (err) {
            throw new Exception("There was a database error suggesting a time for a challenge.", err);
        }

        this.suggestedTime = date;
        this.suggestedByPlayer = await Player.getByDiscordId(suggestingMember.id);
        this.suggestedByPlayerId = this.suggestedByPlayer._id;

        try {
            const times = {};
            for (const member of this.channel.members.values()) {
                const player = await Player.getByDiscordId(member.id),
                    timezone = await player.timezone || process.env.DEFAULT_TIMEZONE,
                    yearWithTimezone = this.suggestedTime.toLocaleString("en-US", {timeZone: timezone, year: "numeric", timeZoneName: "long"});

                if (timezoneParse.test(yearWithTimezone)) {
                    const {groups: {timezoneName}} = timezoneParse.exec(yearWithTimezone);

                    if (timezoneName) {
                        times[timezoneName] = this.suggestedTime.toLocaleString("en-US", {timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"});
                    }
                }
            }

            const sortedTimes = Object.keys(times).map((tz) => ({timezone: tz, displayTime: times[tz], value: new Date(times[tz])})).sort((a, b) => {
                if (a.value.getTime() !== b.value.getTime()) {
                    return b.value.getTime() - a.value.getTime();
                }

                return a.timezone.localeCompare(b.timezone);
            });

            await Discord.richQueue(Discord.embedBuilder({
                description: `**${suggestingMember}** is suggesting to play the match at the time listed below.  **${this.opponent(suggestingMember).name}**, use \`!confirmtime\` to agree to this suggestion.`,
                fields: sortedTimes.map((t) => ({name: t.timezone, value: t.displayTime}))
            }), this.channel);

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error suggesting a time for a challenge.  Please resolve this manually as soon as possible.", err);
        }
    }

    //                #         #          ###    #                         #  ###                 #
    //                #         #          #  #                             #  #  #                #
    // #  #  ###    ###   ###  ###    ##   #  #  ##    ###   ###    ##    ###  #  #   ##    ###   ###
    // #  #  #  #  #  #  #  #   #    # ##  ###    #    #  #  #  #  # ##  #  #  ###   #  #  ##      #
    // #  #  #  #  #  #  # ##   #    ##    #      #    #  #  #  #  ##    #  #  #     #  #    ##    #
    //  ###  ###    ###   # #    ##   ##   #     ###   #  #  #  #   ##    ###  #      ##   ###      ##
    //       #
    /**
     * Updates the pinned post for a challenge.
     * @returns {Promise} A promise that resolves when the pinned post is updated.
     */
    async updatePinnedPost() {
        const channel = this.channel;

        if (!channel) {
            return;
        }

        const embed = Discord.embedBuilder({
            title: this.title || `**${this.players.challengingPlayer.name}** vs **${this.players.challengedPlayer.name}**`,
            fields: []
        });

        if (this.voidTime) {
            embed.addFields({
                name: "This match has been voided.",
                value: "This channel will be closed shortly.",
                inline: false
            });
        }

        const challengingPlayerTimezone = await this.players.challengingPlayer.timezone || process.env.DEFAULT_TIMEZONE,
            challengedPlayerTimezone = await this.players.challengedPlayer.timezone || process.env.DEFAULT_TIMEZONE,
            checklist = [];

        if (!this.matchTime) {
            checklist.push("- Agree to a match time.  Suggest a time with `!suggesttime`.");
        }

        if (this.suggestedTime && !this.confirmedTime) {
            checklist.push(`- ${this.suggestedByPlayer.name} suggested **${this.suggestedTime.toLocaleString("en-US", {timeZone: challengingPlayerTimezone, month: "numeric", day: "numeric", year: "numeric", hour12: true, hour: "numeric", minute: "2-digit", timeZoneName: "short"})}${challengingPlayerTimezone === challengedPlayerTimezone ? "" : `, ${this.suggestedTime.toLocaleString("en-US", {timeZone: challengedPlayerTimezone, month: "numeric", day: "numeric", year: "numeric", hour12: true, hour: "numeric", minute: "2-digit", timeZoneName: "short"})}`}**.  **${this.suggestedByPlayerId === this.players.challengingPlayerId ? this.players.challengedPlayer.name : this.players.challengingPlayer.name}** can confirm with \`!confirmtime\`.`);
        }

        if (this.matchTime && !this.confirmedTime) {
            if (!this.reportTime) {
                checklist.push("- The loser should report the match with `!report`.");
            }

            if (this.reportTime && !this.confirmedTime) {
                if (this.stats.challengingPlayer.won) {
                    checklist.push(`- ${this.players.challengedPlayer.name} reported a loss, **${this.players.challengingPlayer.name}** can confirm the win with \`!confirm\`.`);
                } else {
                    checklist.push(`- ${this.players.challengingPlayer.name} reported a loss, **${this.players.challengedPlayer.name}** can confirm the win with \`!confirm\`.`);
                }
            }
        }

        if (this.confirmedTime) {
            checklist.push(`- Match complete, **${(this.stats.challengingPlayer.won ? this.players.challengingPlayer : this.players.challengedPlayer).name}** has won the match!  Each player must post a screenshot of the Game Over screen.`);
        }

        if (this.confirmedTime && !this.rematchedTime) {
            if (this.rematchRequestedByPlayer) {
                checklist.push(`- ${this.rematchRequestedByPlayer.name} has requested a rematch, **${this.rematchRequestedByPlayerId === this.players.challengingPlayerId ? this.players.challengedPlayer.name : this.players.challengingPlayer.name}** can confirm with \`!rematch\`.`);
            } else {
                checklist.push("- Use `!rematch` to start a new game between the same players.");
            }
        }

        embed.addFields({name: "Match Checklist:", value: checklist.join("\n")});

        const parameters = [];

        if (this.matchTime) {
            parameters.push(`Match Time: **${this.matchTime.toLocaleString("en-US", {timeZone: challengingPlayerTimezone, month: "numeric", day: "numeric", year: "numeric", hour12: true, hour: "numeric", minute: "2-digit", timeZoneName: "short"})}${challengingPlayerTimezone === challengedPlayerTimezone ? "" : `, ${this.matchTime.toLocaleString("en-US", {timeZone: challengedPlayerTimezone, month: "numeric", day: "numeric", year: "numeric", hour12: true, hour: "numeric", minute: "2-digit", timeZoneName: "short"})}`}**`);
        }

        if (this.postseason) {
            parameters.push("**Postseason Game**");
        }

        if (parameters.length > 0) {
            embed.addFields({name: "Match Parameters:", value: parameters.join("\n")});
        }

        embed.addFields({name: "Challenge Commands", value: "Visit https://otl.gg/about for a full list of available challenge commands."});

        const pinned = await this.channel.messages.fetchPinned(false);

        if (pinned.size === 1) {
            Discord.richEdit(pinned.first(), embed);
        } else {
            for (const message of pinned) {
                await message[1].unpin();
            }

            const message = await Discord.richQueue(embed, this.channel);

            await message.pin();
        }
    }

    //              #       #
    //                      #
    // # #    ##   ##     ###
    // # #   #  #   #    #  #
    // # #   #  #   #    #  #
    //  #     ##   ###    ###
    /**
     * Voids the challenge.
     * @param {boolean} voiding Whether to void the challenge.
     * @returns {Promise} A promise that resolves when the challenge has been voided.
     */
    async void(voiding) {
        this.voidTime = voiding ? new Date() : null;

        try {
            Db.void(this, voiding);
        } catch (err) {
            throw new Exception("There was a database error voiding a challenge.", err);
        }

        try {
            await Discord.queue(`This match has been ${voiding ? "voided and will be closed shortly." : "restored.  See the pinned post for instructions on how to proceed."}`, this.channel);

            await this.updatePinnedPost();
        } catch (err) {
            throw new Exception("There was a critical Discord error setting a challenge title.  Please resolve this manually as soon as possible.", err);
        }
    }
}

Challenge.matchesPerPage = 25;

module.exports = Challenge;
