/**
 * @typedef {import("discord.js").TextChannel} DiscordJs.TextChannel
 * @typedef {import("../../types/node/playerTypes").Player} PlayerTypes.Player
 * @typedef {import("../../types/node/ratingTypes").RankAndRating} RatingTypes.RankAndRating
 * @typedef {import("../../types/node/ratingTypes").RatingChange} RatingTypes.RatingChange
 * @typedef {import("../../types/node/ratingTypes").Standing} RatingTypes.Standing
 */

const ChallengeDb = require("../database/challenge"),
    Db = require("../database/rating"),
    Elo = require("../elo"),
    Exception = require("../errors/exception"),
    Log = require("@roncli/node-application-insights-logger"),
    SeasonDb = require("../database/season");

/** @type {typeof import("../discord")} */
let Discord;

setTimeout(() => {
    Discord = require("../discord");
}, 0);

// ###          #     #
// #  #         #
// #  #   ###  ###   ##    ###    ###
// ###   #  #   #     #    #  #  #  #
// # #   # ##   #     #    #  #   ##
// #  #   # #    ##  ###   #  #  #
//                                ###
/**
 * A class that represents a player's rating.
 */
class Rating {
    //              #    ####              ###   ##                            ###          ##
    //              #    #                 #  #   #                            #  #        #  #
    //  ###   ##   ###   ###    ##   ###   #  #   #     ###  #  #   ##   ###   ###   #  #   #     ##    ###   ###    ##   ###
    // #  #  # ##   #    #     #  #  #  #  ###    #    #  #  #  #  # ##  #  #  #  #  #  #    #   # ##  #  #  ##     #  #  #  #
    //  ##   ##     #    #     #  #  #     #      #    # ##   # #  ##    #     #  #   # #  #  #  ##    # ##    ##   #  #  #  #
    // #      ##     ##  #      ##   #     #     ###    # #    #    ##   #     ###     #    ##    ##    # #  ###     ##   #  #
    //  ###                                                   #                       #
    /**
     * Gets ratings for a player by season.
     * @param {PlayerTypes.Player} player The player.
     * @param {number} season The season.
     * @returns {Promise<RatingTypes.RankAndRating>} A promise that resolves with the player's ratings for the specified season.
     */
    static async getForPlayerBySeason(player, season) {
        try {
            return await Db.getForPlayerBySeason(player, season);
        } catch (err) {
            throw new Exception("There was a database error getting ratings for a player by season.", err);
        }
    }

    //                #         #          ###          #     #                       ####               ##                                  ####                     ##   #           ##    ##
    //                #         #          #  #         #                             #                 #  #                                 #                       #  #  #            #     #
    // #  #  ###    ###   ###  ###    ##   #  #   ###  ###   ##    ###    ###   ###   ###    ##   ###    #     ##    ###   ###    ##   ###   ###   ###    ##   # #   #     ###    ###   #     #     ##   ###    ###   ##
    // #  #  #  #  #  #  #  #   #    # ##  ###   #  #   #     #    #  #  #  #  ##     #     #  #  #  #    #   # ##  #  #  ##     #  #  #  #  #     #  #  #  #  ####  #     #  #  #  #   #     #    # ##  #  #  #  #  # ##
    // #  #  #  #  #  #  # ##   #    ##    # #   # ##   #     #    #  #   ##     ##   #     #  #  #     #  #  ##    # ##    ##   #  #  #  #  #     #     #  #  #  #  #  #  #  #  # ##   #     #    ##    #  #   ##   ##
    //  ###  ###    ###   # #    ##   ##   #  #   # #    ##  ###   #  #  #     ###    #      ##   #      ##    ##    # #  ###     ##   #  #  #     #      ##   #  #   ##   #  #   # #  ###   ###    ##   #  #  #      ##
    //       #                                                            ###                                                                                                                                   ###
    /**
     * Updates the ratings for a season.
     * @param {number} season The season to update ratings for.
     * @returns {Promise} A promise that resolves when the ratings have been updated.
     */
    static async updateRatingsForSeasonFromChallenge(season) {
        // Get all games for the season in order.
        let challenges;
        try {
            challenges = await ChallengeDb.getCompletedGamesForSeason(season);
        } catch (err) {
            Log.error("There was a database error getting challenges while updating ratings.", {err});
            return;
        }

        // Get the K.
        let seasonData;
        try {
            seasonData = await SeasonDb.get(season);
        } catch (err) {
            Log.error("There was a database error getting the season while updating ratings.", {err});
            return;
        }

        const k = seasonData.K;

        // Loop through games and calculate rating.
        /** @type {Map<number, number>} */
        const ratings = new Map();

        /** @type {Map<number, RatingTypes.RatingChange>} */
        const challengeRatings = new Map();

        /** @type {Map<number, number>} */
        const games = new Map();

        challenges.forEach((challenge) => {
            if (!ratings.get(challenge.challengingPlayerId)) {
                ratings.set(challenge.challengingPlayerId, 1500);
                games.set(challenge.challengingPlayerId, 0);
            }

            if (!ratings.get(challenge.challengedPlayerId)) {
                ratings.set(challenge.challengedPlayerId, 1500);
                games.set(challenge.challengedPlayerId, 0);
            }

            const challengeK = k + (20 - (Math.min(20, games.get(challenge.challengingPlayerId)) + Math.min(20, games.get(challenge.challengedPlayerId))) / 2),
                challengingPlayerNewRating = Elo.update(Elo.expected(ratings.get(challenge.challengingPlayerId), ratings.get(challenge.challengedPlayerId)), challenge.challengingPlayerWon ? 1 : 0, ratings.get(challenge.challengingPlayerId), challengeK),
                challengedPlayerNewRating = Elo.update(Elo.expected(ratings.get(challenge.challengedPlayerId), ratings.get(challenge.challengingPlayerId)), challenge.challengedPlayerWon ? 1 : 0, ratings.get(challenge.challengedPlayerId), challengeK);

            challengeRatings.set(challenge._id, {
                challengingPlayerRating: challengingPlayerNewRating,
                challengedPlayerRating: challengedPlayerNewRating,
                change: challengingPlayerNewRating - ratings.get(challenge.challengingPlayerId)
            });

            ratings.set(challenge.challengingPlayerId, challengingPlayerNewRating);
            ratings.set(challenge.challengedPlayerId, challengedPlayerNewRating);

            games.set(challenge.challengingPlayerId, games.get(challenge.challengingPlayerId) + 1);
            games.set(challenge.challengedPlayerId, games.get(challenge.challengedPlayerId) + 1);
        });

        // Save ratings.
        try {
            await Db.updateRatingsForSeason(season, ratings, challengeRatings);
        } catch (err) {
            Log.error("There was a database error getting the season while updating ratings.", {err});
            return;
        }

        // Get the latest season.
        let currentSeason;
        try {
            currentSeason = await SeasonDb.getFromDate(new Date());
        } catch (err) {
            Log.error("There was a database error getting the latest season while updating ratings.", {err});
            return;
        }

        // Get top 20.
        /** @type {RatingTypes.Standing[]} */
        let top;
        try {
            top = await Db.getTopPlayers(currentSeason._id);
        } catch (err) {
            Log.error("There was a database error getting the top players while updating ratings.", {err});
            return;
        }

        if (top.length > 0) {
            try {
                const channel = /** @type {DiscordJs.TextChannel} */(Discord.findChannelByName("standings")), // eslint-disable-line no-extra-parens
                    pinned = await channel.messages.fetchPinned(false),
                    text = `**Top Noitas**\n\n${top.map((p, i) => `${i > 0 && top[i].rating === top[i - 1].rating ? "---" : `${i + 1})`} ${p.rating.toFixed(0)} - ${p.won}-${p.lost} <@${p.discordId}>`).join("\n")}`;

                if (pinned.size === 1) {
                    Discord.edit(pinned.first(), text);
                } else {
                    for (const message of pinned) {
                        await message[1].delete();
                    }

                    const message = await Discord.queue(text, channel);

                    await message.pin();
                }
            } catch (err) {
                Log.error("There was a critical Discord error displaying the standings.", {err});
            }
        }
    }
}

module.exports = Rating;
