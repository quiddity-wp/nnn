/**
 * @typedef {import("../../types/node/playerTypes").Player} PlayerTypes.Player
 * @typedef {import("../../types/node/ratingTypes").RankAndRating} RatingTypes.RankAndRating
 * @typedef {import("../../types/node/ratingTypes").RatingChange} RatingTypes.RatingChange
 * @typedef {import("../../types/node/ratingTypes").Standing} RatingTypes.Standing
 */

const MongoDb = require("mongodb"),

    Cache = require("@roncli/node-redis").Cache,
    Db = require("."),
    Log = require("@roncli/node-application-insights-logger");

//  ####           #       #
//  #   #          #
//  #   #   ###   ####    ##    # ##    ## #
//  ####       #   #       #    ##  #  #  #
//  # #     ####   #       #    #   #   ##
//  #  #   #   #   #  #    #    #   #  #
//  #   #   ####    ##    ###   #   #   ###
//                                     #   #
//                                      ###
/**
 * A class to handle database calls for the rating collection.
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
     * Gets the rank and rating for a player by a season.
     * @param {PlayerTypes.Player} player The player.
     * @param {number} season The season.
     * @returns {Promise<RatingTypes.RankAndRating>} A promise that resolves with the player's rating for the specified season.
     */
    static async getForPlayerBySeason(player, season) {
        const db = await Db.get();

        const data = /** @type {RatingTypes.RankAndRating[]} */(await db.collection("rating").aggregate([ // eslint-disable-line no-extra-parens
            {
                $facet: {
                    rating: [
                        {
                            $match: {playerId: MongoDb.Long.fromNumber(player._id), season: MongoDb.Long.fromNumber(season)}
                        },
                        {
                            $project: {_id: 0, rating: 1}
                        }
                    ],
                    ratings: [
                        {
                            $match: {season: MongoDb.Long.fromNumber(season)}
                        },
                        {
                            $project: {_id: 0, rating: 1}
                        }
                    ]
                }
            },
            {
                $unwind: "$rating"
            },
            {
                $unwind: "$ratings"
            },
            {
                $group: {
                    _id: null,
                    rating: {$max: "$rating.rating"},
                    rank: {
                        $sum: {
                            $cond: {
                                if: {
                                    $gt: ["$ratings.rating", {$max: "$rating.rating"}]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    rating: 1,
                    rank: {$add: ["$rank", 1]}
                }
            }
        ]).toArray());

        return data && data[0] || void 0;
    }

    //              #    ###               ###   ##
    //              #     #                #  #   #
    //  ###   ##   ###    #     ##   ###   #  #   #     ###  #  #   ##   ###    ###
    // #  #  # ##   #     #    #  #  #  #  ###    #    #  #  #  #  # ##  #  #  ##
    //  ##   ##     #     #    #  #  #  #  #      #    # ##   # #  ##    #       ##
    // #      ##     ##   #     ##   ###   #     ###    # #    #    ##   #     ###
    //  ###                          #                        #
    /**
     * Gets the top players.
     * @param {number} season The season to get top players for.
     * @returns {Promise<RatingTypes.Standing[]>} A promise that resolves with the top players.
     */
    static async getTopPlayers(season) {
        const db = await Db.get();

        return /** @type Promise<RatingTypes.Standing[]> */(db.collection("rating").aggregate([ // eslint-disable-line no-extra-parens
            {
                $match: {season: MongoDb.Long.fromNumber(season)}
            },
            {
                $sort: {rating: -1}
            },
            {
                $limit: 20
            },
            {
                $lookup: {
                    from: "player",
                    localField: "playerId",
                    foreignField: "_id",
                    as: "player"
                }
            },
            {
                $lookup: {
                    from: "challenge",
                    let: {playerId: "$playerId"},
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {$expr: {$eq: ["$players.challengingPlayerId", "$$playerId"]}},
                                    {confirmedTime: {$exists: true}},
                                    {voidTime: {$exists: false}}
                                ]
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                won: "$stats.challengingPlayer.won"
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                won: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $eq: ["$won", true]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                },
                                lost: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $eq: ["$won", false]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0
                            }
                        }
                    ],
                    as: "challengingGames"
                }
            },
            {
                $lookup: {
                    from: "challenge",
                    let: {playerId: "$playerId"},
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {$expr: {$eq: ["$players.challengedPlayerId", "$$playerId"]}},
                                    {confirmedTime: {$exists: true}},
                                    {voidTime: {$exists: false}}
                                ]
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                won: "$stats.challengedPlayer.won"
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                won: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $eq: ["$won", true]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                },
                                lost: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $eq: ["$won", false]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0
                            }
                        }
                    ],
                    as: "challengedGames"
                }
            },
            {
                $project: {
                    _id: 0,
                    discordId: "$player.discordId",
                    rating: 1,
                    challengingGames: {
                        $arrayElemAt: ["$challengingGames", 0]
                    },
                    challengedGames: {
                        $arrayElemAt: ["$challengedGames", 0]
                    }
                }
            },
            {
                $project: {
                    rating: 1,
                    discordId: {$arrayElemAt: ["$discordId", 0]},
                    won: {$add: [{$ifNull: ["$challengingGames.won", 0]}, {$ifNull: ["$challengedGames.won", 0]}]},
                    lost: {$add: [{$ifNull: ["$challengingGames.lost", 0]}, {$ifNull: ["$challengedGames.lost", 0]}]}
                }
            }
        ]).toArray());
    }

    //                #         #          ###          #     #                       ####               ##
    //                #         #          #  #         #                             #                 #  #
    // #  #  ###    ###   ###  ###    ##   #  #   ###  ###   ##    ###    ###   ###   ###    ##   ###    #     ##    ###   ###    ##   ###
    // #  #  #  #  #  #  #  #   #    # ##  ###   #  #   #     #    #  #  #  #  ##     #     #  #  #  #    #   # ##  #  #  ##     #  #  #  #
    // #  #  #  #  #  #  # ##   #    ##    # #   # ##   #     #    #  #   ##     ##   #     #  #  #     #  #  ##    # ##    ##   #  #  #  #
    //  ###  ###    ###   # #    ##   ##   #  #   # #    ##  ###   #  #  #     ###    #      ##   #      ##    ##    # #  ###     ##   #  #
    //       #                                                            ###
    /**
     * Updates the player ratings for a season.
     * @param {number} season The season to update ratings for.
     * @param {Map<number, number>} ratings The new ratings.
     * @param {Map<number, RatingTypes.RatingChange>} challengeRatings The rating changes per challenge.
     * @returns {Promise} A promise that resolves when the ratings have been updated.
     */
    static async updateRatingsForSeason(season, ratings, challengeRatings) {
        const db = await Db.get();

        const bulkRating = db.collection("rating").initializeUnorderedBulkOp();

        ratings.forEach((rating, playerId) => {
            bulkRating.find({season: MongoDb.Long.fromNumber(season), playerId: MongoDb.Long.fromNumber(playerId)}).upsert().updateOne({$set: {season: MongoDb.Long.fromNumber(season), playerId: MongoDb.Long.fromNumber(playerId), rating: new MongoDb.Double(rating)}});
        });

        await bulkRating.execute();

        const bulkChallenge = db.collection("challenge").initializeUnorderedBulkOp();

        challengeRatings.forEach((ratingChange, challengeId) => {
            bulkChallenge.find({_id: MongoDb.Long.fromNumber(challengeId)}).updateOne({$set: {ratings: {
                challengingPlayerRating: new MongoDb.Double(ratingChange.challengingPlayerRating),
                challengedPlayerRating: new MongoDb.Double(ratingChange.challengedPlayerRating),
                change: new MongoDb.Double(ratingChange.change)
            }}});
        });

        await bulkChallenge.execute();

        Cache.invalidate([`${process.env.REDIS_PREFIX}:invalidate:standings:${season}`, `${process.env.REDIS_PREFIX}:invalidate:matches`, `${process.env.REDIS_PREFIX}:invalidate:players`]).catch((err) => {
            Log.error("An error occurred while invalidating a cache when updating ratings for the season.", {err, properties: {season}});
        });
    }
}

module.exports = Rating;
