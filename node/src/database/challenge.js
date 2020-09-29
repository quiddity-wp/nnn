/**
 * @typedef {import("../models/challenge")} Challenge
 * @typedef {import("../../types/challengeTypes").Challenge} ChallengeTypes.Challenge
 * @typedef {import("../../types/challengeTypes").Match} ChallengeTypes.Match
 * @typedef {import("../../types/challengeTypes").Result} ChallengeTypes.Result
 * @typedef {import("../../types/challengeTypes").UpcomingChallenge} ChallengeTypes.UpcomingChallenge
 * @typedef {import("../../types/dbTypes").Challenge} DbTypes.Challenge
 * @typedef {import("../../types/dbTypes").ChallengeUpcomingChallenge} DbTypes.ChallengeUpcomingChallenge
 * @typedef {import("mongodb").InsertOneWriteOpResult<DbTypes.Challenge>} MongoDb_InsertOneWriteOpResult.Challenge
 * @typedef {import("../../types/playerTypes").Player} PlayerTypes.Player
 */

const MongoDb = require("mongodb"),

    Cache = require("../redis/cache"),
    Db = require("."),
    Season = require("./season");

//   ###   #              ##     ##                                ####   #
//  #   #  #               #      #                                 #  #  #
//  #      # ##    ###     #      #     ###   # ##    ## #   ###    #  #  # ##
//  #      ##  #      #    #      #    #   #  ##  #  #  #   #   #   #  #  ##  #
//  #      #   #   ####    #      #    #####  #   #   ##    #####   #  #  #   #
//  #   #  #   #  #   #    #      #    #      #   #  #      #       #  #  ##  #
//   ###   #   #   ####   ###    ###    ###   #   #   ###    ###   ####   # ##
//                                                   #   #
//                                                    ###
/**
 * A class to handle database calls for the challenge collection.
 */
class ChallengeDb {
    //                                      #    ###   #     ###                     ###          ##   #           ##    ##                            ###
    //                                      #    #  #  #      #                       #          #  #  #            #     #                             #
    //  ##    ##   ###   # #    ##   ###   ###   #  #  ###    #    #  #  ###    ##    #     ##   #     ###    ###   #     #     ##   ###    ###   ##    #    #  #  ###    ##
    // #     #  #  #  #  # #   # ##  #  #   #    #  #  #  #   #    #  #  #  #  # ##   #    #  #  #     #  #  #  #   #     #    # ##  #  #  #  #  # ##   #    #  #  #  #  # ##
    // #     #  #  #  #  # #   ##    #      #    #  #  #  #   #     # #  #  #  ##     #    #  #  #  #  #  #  # ##   #     #    ##    #  #   ##   ##     #     # #  #  #  ##
    //  ##    ##   #  #   #     ##   #       ##  ###   ###    #      #   ###    ##    #     ##    ##   #  #   # #  ###   ###    ##   #  #  #      ##    #      #   ###    ##
    //                                                              #    #                                                                  ###               #    #
    /**
     * Converts a DbType challenge to a ChallengeType challenge.
     * @param {DbTypes.Challenge} challenge The DbType challenge.
     * @returns {ChallengeTypes.Challenge} The ChallengeTypes challenge.
     */
    static convertDbTypeToChallengeType(challenge) {
        return {
            _id: challenge._id.toNumber(),
            players: {
                challengingPlayerId: challenge.players.challengingPlayerId.toNumber(),
                challengedPlayerId: challenge.players.challengedPlayerId.toNumber()
            },
            title: challenge.title,
            suggestedTime: challenge.suggestedTime,
            suggestedByPlayerId: challenge.suggestedByPlayerId ? challenge.suggestedByPlayerId.toNumber() : void 0,
            matchTime: challenge.matchTime,
            reportTime: challenge.reportTime,
            confirmedTime: challenge.confirmedTime,
            closeTime: challenge.closeTime,
            voidTime: challenge.voidTime,
            rematchedTime: challenge.rematchedTime,
            rematchRequestedByPlayerId: challenge.rematchRequestedByPlayerId ? challenge.rematchRequestedByPlayerId.toNumber() : void 0,
            season: challenge.season ? challenge.season.toNumber() : void 0,
            postseason: challenge.postseason,
            stats: challenge.stats ? {
                challengingPlayer: challenge.stats.challengingPlayer ? {
                    won: challenge.stats.challengingPlayer.won,
                    depth: challenge.stats.challengingPlayer.depth ? challenge.stats.challengingPlayer.depth.valueOf() : void 0,
                    time: challenge.stats.challengingPlayer.time ? challenge.stats.challengingPlayer.time.valueOf() : void 0,
                    completed: challenge.stats.challengingPlayer.completed,
                    comment: challenge.stats.challengingPlayer.comment
                } : void 0,
                challengedPlayer: challenge.stats.challengedPlayer ? {
                    won: challenge.stats.challengedPlayer.won,
                    depth: challenge.stats.challengedPlayer.depth ? challenge.stats.challengedPlayer.depth.valueOf() : void 0,
                    time: challenge.stats.challengedPlayer.time ? challenge.stats.challengedPlayer.time.valueOf() : void 0,
                    completed: challenge.stats.challengedPlayer.completed,
                    comment: challenge.stats.challengedPlayer.comment
                } : void 0
            } : void 0,
            ratings: challenge.ratings ? {
                challengingPlayerRating: challenge.ratings.challengingPlayerRating ? challenge.ratings.challengingPlayerRating.valueOf() : void 0,
                challengedPlayerRating: challenge.ratings.challengedPlayerRating ? challenge.ratings.challengedPlayerRating.valueOf() : void 0,
                change: challenge.ratings.change ? challenge.ratings.change.valueOf() : void 0
            } : void 0
        };
    }

    //          #     #
    //          #     #
    //  ###   ###   ###
    // #  #  #  #  #  #
    // # ##  #  #  #  #
    //  # #   ###   ###
    /**
     * Adds a challenge to the database.
     * @param {PlayerTypes.Player} challengingPlayer The player issuing the challenge.
     * @param {PlayerTypes.Player} challengedPlayer The player receiving the challenge.
     * @returns {Promise<ChallengeTypes.Challenge>} A promise that resolves with the challenge added.
     */
    static async add(challengingPlayer, challengedPlayer) {
        const db = await Db.get();

        /** @type {DbTypes.Challenge} */
        const challenge = {
            players: {
                challengingPlayerId: MongoDb.Long.fromNumber(challengingPlayer._id),
                challengedPlayerId: MongoDb.Long.fromNumber(challengedPlayer._id)
            }
        };

        await Db.id(challenge, "challenge");

        /** @type {MongoDb_InsertOneWriteOpResult.Challenge} */
        const result = await db.collection("challenge").insertOne(challenge);

        challenge._id = result.ops[0]._id;

        return ChallengeDb.convertDbTypeToChallengeType(challenge);
    }

    //       ##
    //        #
    //  ##    #     ##    ###    ##
    // #      #    #  #  ##     # ##
    // #      #    #  #    ##   ##
    //  ##   ###    ##   ###     ##
    /**
     * Closes a challenge.
     * @param {Challenge} challenge The challenge.
     * @returns {Promise} A promise that resolves when the challenge is closed.
     */
    static async close(challenge) {
        const db = await Db.get();

        await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$set: {closeTime: challenge.closeTime, season: MongoDb.Long.fromNumber(challenge.season)}});

        await Cache.invalidate([`${process.env.REDIS_PREFIX}:invalidate:standings:${challenge.season}`, `${process.env.REDIS_PREFIX}:invalidate:matches`, `${process.env.REDIS_PREFIX}:invalidate:player:${challenge.players.challengingPlayerId}`, `${process.env.REDIS_PREFIX}:invalidate:player:${challenge.players.challengedPlayerId}`]);
    }

    //                     #    #                #  #         #          #
    //                    # #                    ####         #          #
    //  ##    ##   ###    #    ##    ###   # #   ####   ###  ###    ##   ###
    // #     #  #  #  #  ###    #    #  #  ####  #  #  #  #   #    #     #  #
    // #     #  #  #  #   #     #    #     #  #  #  #  # ##   #    #     #  #
    //  ##    ##   #  #   #    ###   #     #  #  #  #   # #    ##   ##   #  #
    /**
     * Confirms the match.
     * @param {Challenge} challenge The challenge.
     * @returns {Promise} A promise that resolves when the match has been confirmed.
     */
    static async confirmMatch(challenge) {
        const db = await Db.get();

        await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$set: {confirmedTime: challenge.confirmedTime}});

        await Cache.invalidate([`${process.env.REDIS_PREFIX}:invalidate:standings:${challenge.season}`, `${process.env.REDIS_PREFIX}:invalidate:upcoming`, `${process.env.REDIS_PREFIX}:invalidate:matches`, `${process.env.REDIS_PREFIX}:invalidate:player:${challenge.players.challengingPlayerId}`, `${process.env.REDIS_PREFIX}:invalidate:player:${challenge.players.challengedPlayerId}`]);
    }

    //                          #          ###                      #          #
    //                          #          #  #                     #          #
    //  ##   ###    ##    ###  ###    ##   #  #   ##   # #    ###  ###    ##   ###
    // #     #  #  # ##  #  #   #    # ##  ###   # ##  ####  #  #   #    #     #  #
    // #     #     ##    # ##   #    ##    # #   ##    #  #  # ##   #    #     #  #
    //  ##   #      ##    # #    ##   ##   #  #   ##   #  #   # #    ##   ##   #  #
    /**
     * Marks a rematch as created.
     * @param {Challenge} challenge The challenge to create a rematch from.
     * @returns {Promise} A promise that resolves when the rematch is marked as created.
     */
    static async createRematch(challenge) {
        const db = await Db.get();

        await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$set: {rematchedTime: challenge.rematchedTime}});

        await Cache.invalidate([`${process.env.REDIS_PREFIX}:invalidate:upcoming`]);
    }

    //   #    #             #
    //  # #                 #
    //  #    ##    ###    ###
    // ###    #    #  #  #  #
    //  #     #    #  #  #  #
    //  #    ###   #  #   ###
    /**
     * Finds a challenge between two players.
     * @param {PlayerTypes.Player} player1 The first player.
     * @param {PlayerTypes.Player} player2 The second player.
     * @returns {Promise<ChallengeTypes.Challenge>} A promise that resolves with the challenge found.
     */
    static async find(player1, player2) {
        const db = await Db.get();

        /** @type {ChallengeTypes.Challenge} */
        const data = await db.collection("challenge").findOne({
            $and: [
                {confirmedTime: null},
                {closeTime: null},
                {voidTime: null},
                {
                    $or: [
                        {
                            $and: [
                                {"players.challengingPlayerId": MongoDb.Long.fromNumber(player1._id)},
                                {"players.challengedPlayerId": MongoDb.Long.fromNumber(player2._id)}
                            ]
                        },
                        {
                            $and: [
                                {"players.challengingPlayerId": MongoDb.Long.fromNumber(player2._id)},
                                {"players.challengedPlayerId": MongoDb.Long.fromNumber(player1._id)}
                            ]
                        }
                    ]
                }
            ]
        });

        return data || void 0;
    }

    //              #
    //              #
    //  ###   ##   ###
    // #  #  # ##   #
    //  ##   ##     #
    // #      ##     ##
    //  ###
    /**
     * Gets a challenge from the database by ID.
     * @param {number} id The challenge ID.
     * @returns {Promise<ChallengeTypes.Challenge>} A promise that resolves with the challenge.
     */
    static async get(id) {
        const db = await Db.get();

        /** @type {ChallengeTypes.Challenge} */
        const data = await db.collection("challenge").findOne({_id: MongoDb.Long.fromNumber(id)});

        return data || void 0;
    }

    //              #     ##                     ##           #             #   ##                            ####               ##
    //              #    #  #                     #           #             #  #  #                           #                 #  #
    //  ###   ##   ###   #      ##   # #   ###    #     ##   ###    ##    ###  #      ###  # #    ##    ###   ###    ##   ###    #     ##    ###   ###    ##   ###
    // #  #  # ##   #    #     #  #  ####  #  #   #    # ##   #    # ##  #  #  # ##  #  #  ####  # ##  ##     #     #  #  #  #    #   # ##  #  #  ##     #  #  #  #
    //  ##   ##     #    #  #  #  #  #  #  #  #   #    ##     #    ##    #  #  #  #  # ##  #  #  ##      ##   #     #  #  #     #  #  ##    # ##    ##   #  #  #  #
    // #      ##     ##   ##    ##   #  #  ###   ###    ##     ##   ##    ###   ###   # #  #  #   ##   ###    #      ##   #      ##    ##    # #  ###     ##   #  #
    //  ###                                #
    /**
     * Gets the completed games for the specified season.
     * @param {number} season The season.
     * @returns {Promise<ChallengeTypes.Result[]>} A promise that resolves with the completed games.
     */
    static async getCompletedGamesForSeason(season) {
        const db = await Db.get();

        /** @type {ChallengeTypes.Result[]} */
        const data = await db.collection("challenge").aggregate([
            {
                $match: {
                    $and: [
                        {season: MongoDb.Long.fromNumber(season)},
                        {
                            $or: [
                                {postseason: false},
                                {postseason: {$exists: false}}
                            ]
                        },
                        {voidTime: {$exists: false}},
                        {confirmedTime: {$exists: true}},
                        {closeTime: {$exists: true}}
                    ]
                }
            },
            {
                $project: {
                    _id: 1,
                    challengingPlayerId: "$players.challengingPlayerId",
                    challengedPlayerId: "$players.challengedPlayerId",
                    challengingPlayerWon: "$stats.challengingPlayer.won",
                    challengedPlayerWon: "$stats.challengedPlayer.won",
                    matchTime: 1
                }
            },
            {
                $sort: {matchTime: 1}
            },
            {
                $project: {matchTime: 0}
            }
        ]).toArray();

        return data || [];
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
     * @param {number} page The page number.
     * @param {number} pageSize The number of matches on one page.
     * @returns {Promise<ChallengeTypes.Match[]>} The matches for the season.
     */
    static async getMatchesBySeason(season, page, pageSize) {
        const key = `${process.env.REDIS_PREFIX}:matchesBySeason:${season || "null"}:${page || "null"}:${pageSize || "null"}`;

        /** @type {ChallengeTypes.Match[]} */
        let cache = await Cache.get(key);

        if (cache) {
            return cache;
        }

        const db = await Db.get();

        /** @type {ChallengeTypes.Match[]} */
        cache = await db.collection("challenge").aggregate([
            {
                $match: {
                    $and: [
                        {
                            matchTime: {$exists: true},
                            confirmedTime: {$exists: true},
                            voidTime: {$exists: false},
                            season: MongoDb.Long.fromNumber(season)
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "player",
                    localField: "players.challengingPlayerId",
                    foreignField: "_id",
                    as: "challengingPlayer"
                }
            },
            {
                $lookup: {
                    from: "player",
                    localField: "players.challengedPlayerId",
                    foreignField: "_id",
                    as: "challengedPlayer"
                }
            },
            {
                $project: {
                    _id: 0,
                    title: 1,
                    matchTime: 1,
                    players: {
                        challengingPlayer: {
                            playerId: "$players.challengingPlayerId",
                            name: {
                                $arrayElemAt: ["$challengingPlayer.name", 0]
                            },
                            won: "$stats.challengingPlayer.won",
                            depth: "$stats.challengingPlayer.depth",
                            time: "$stats.challengingPlayer.time",
                            completed: "$stats.challengingPlayer.completed",
                            comment: "$stats.challengingPlayer.comment"
                        },
                        challengedPlayer: {
                            playerId: "$players.challengedPlayerId",
                            name: {
                                $arrayElemAt: ["$challengedPlayer.name", 0]
                            },
                            won: "$stats.challengedPlayer.won",
                            depth: "$stats.challengedPlayer.depth",
                            time: "$stats.challengedPlayer.time",
                            completed: "$stats.challengedPlayer.completed",
                            comment: "$stats.challengedPlayer.comment"
                        }
                    }
                }
            },
            {
                $sort: {matchTime: -1}
            },
            {$skip: (page - 1) * pageSize}, {$limit: pageSize}
        ]).toArray();

        cache = cache || [];

        const seasonObj = await Season.get(season);

        Cache.add(key, cache, seasonObj && seasonObj.endDate || void 0, [`${process.env.REDIS_PREFIX}:invalidate:matches`]);

        return cache;
    }

    //              #    ###                  #   #                ####              ###   ##
    //              #    #  #                 #                    #                 #  #   #
    //  ###   ##   ###   #  #   ##   ###    ###  ##    ###    ###  ###    ##   ###   #  #   #     ###  #  #   ##   ###
    // #  #  # ##   #    ###   # ##  #  #  #  #   #    #  #  #  #  #     #  #  #  #  ###    #    #  #  #  #  # ##  #  #
    //  ##   ##     #    #     ##    #  #  #  #   #    #  #   ##   #     #  #  #     #      #    # ##   # #  ##    #
    // #      ##     ##  #      ##   #  #   ###  ###   #  #  #     #      ##   #     #     ###    # #    #    ##   #
    //  ###                                                   ###                                       #
    /**
     * Gets pending challenges for the player.
     * @param {PlayerTypes.Player} player The player.
     * @returns {Promise<ChallengeTypes.Challenge[]>} A promise that resolves with the pending challenges for the player.
     */
    static async getPendingForPlayer(player) {
        const db = await Db.get();

        /** @type {ChallengeTypes.Challenge[]} */
        const data = await db.collection("challenge").find({
            $and: [
                {
                    $or: [
                        {"players.challengingPlayerId": MongoDb.Long.fromNumber(player._id)},
                        {"players.challengedPlayerId": MongoDb.Long.fromNumber(player._id)}
                    ]
                },
                {closeTime: {$exists: false}}
            ]
        }).toArray();

        return data || [];
    }

    //              #    #  #                           #
    //              #    #  #
    //  ###   ##   ###   #  #  ###    ##    ##   # #   ##    ###    ###
    // #  #  # ##   #    #  #  #  #  #     #  #  ####   #    #  #  #  #
    //  ##   ##     #    #  #  #  #  #     #  #  #  #   #    #  #   ##
    // #      ##     ##   ##   ###    ##    ##   #  #  ###   #  #  #
    //  ###                    #                                    ###
    /**
     * Gets the upcoming matches for the league.
     * @param {PlayerTypes.Player} [player] The optional player to get upcoming matches for.
     * @returns {Promise<ChallengeTypes.UpcomingChallenge[]>} A promise that resolves with the upcoming challenges.
     */
    static async getUpcoming(player) {
        const db = await Db.get();

        /** @type {object[]} */
        const match = [
            {matchTime: {$exists: true}},
            {confirmedTime: {$exists: false}},
            {voidTime: {$exists: false}}
        ];

        if (player) {
            match.push({
                $or: [
                    {"players.challengingPlayerId": MongoDb.Long.fromNumber(player._id)},
                    {"players.challengedPlayerId": MongoDb.Long.fromNumber(player._id)}
                ]
            });
        }

        /**
         * @type {DbTypes.ChallengeUpcomingChallenge[]}
         */
        const data = await db.collection("challenge").aggregate([
            {
                $match: {
                    $and: match
                }
            },
            {
                $lookup: {
                    from: "player",
                    localField: "players.challengingPlayerId",
                    foreignField: "_id",
                    as: "challengingPlayer"
                }
            },
            {
                $lookup: {
                    from: "player",
                    localField: "players.challengedPlayerId",
                    foreignField: "_id",
                    as: "challengedPlayer"
                }
            },
            {
                $project: {
                    _id: 0,
                    matchTime: 1,
                    challengingPlayerName: "$challengingPlayer.name",
                    challengedPlayerName: "$challengedPlayer.name"
                }
            }
        ]).toArray();

        return data || [];
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
        const key = `${process.env.REDIS_PREFIX}:upcomingAndCompleted:${season}`;

        /** @type {{upcoming: ChallengeTypes.Match[], totalCompleted: number}} */
        let cache = await Cache.get(key);

        if (cache) {
            return cache;
        }

        const db = await Db.get();

        cache = await db.collection("challenge").aggregate([
            {
                $facet: {
                    totalCompleted: [
                        {
                            $match: {
                                $and: [
                                    {
                                        matchTime: {$exists: true},
                                        confirmedTime: {$exists: true},
                                        voidTime: {$exists: false},
                                        season: MongoDb.Long.fromNumber(season)
                                    }
                                ]
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                count: {$sum: 1}
                            }
                        }
                    ],
                    upcoming: [
                        {
                            $match: {
                                $and: [
                                    {
                                        matchTime: {$exists: true},
                                        confirmedTime: {$exists: false},
                                        voidTime: {$exists: false}
                                    }
                                ]
                            }
                        },
                        {
                            $lookup: {
                                from: "player",
                                localField: "players.challengingPlayerId",
                                foreignField: "_id",
                                as: "challengingPlayer"
                            }
                        },
                        {
                            $lookup: {
                                from: "player",
                                localField: "players.challengedPlayerId",
                                foreignField: "_id",
                                as: "challengedPlayer"
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                title: 1,
                                matchTime: 1,
                                players: {
                                    challengingPlayer: {
                                        playerId: "$players.challengingPlayerId",
                                        name: {
                                            $arrayElemAt: ["$challengingPlayer.name", 0]
                                        }
                                    },
                                    challengedPlayer: {
                                        playerId: "$players.challengedPlayerId",
                                        name: {
                                            $arrayElemAt: ["$challengedPlayer.name", 0]
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    totalCompleted: {
                        $arrayElemAt: ["$totalCompleted.count", 0]
                    },
                    upcoming: 1
                }
            }
        ]).next();

        cache = cache || {upcoming: [], totalCompleted: 0};

        Cache.add(key, cache, void 0, [`${process.env.REDIS_PREFIX}:invalidate:upcoming`]);

        return cache;
    }

    //                                      ##    #           #
    //                                     #  #   #           #
    // ###    ##   # #    ##   # #    ##    #    ###    ###  ###
    // #  #  # ##  ####  #  #  # #   # ##    #    #    #  #   #
    // #     ##    #  #  #  #  # #   ##    #  #   #    # ##   #
    // #      ##   #  #   ##    #     ##    ##     ##   # #    ##
    /**
     * Removes a player's statistics for a match.
     * @param {Challenge} challenge The challenge.
     * @param {boolean} useChallengingPlayer Whether to remove the stats for the challenging player.
     * @returns {Promise} A promise that resolves when the stats are removed.
     */
    static async removeStat(challenge, useChallengingPlayer) {
        const db = await Db.get();

        const bulk = db.collection("challenge").initializeOrderedBulkOp();

        bulk.find({_id: MongoDb.Long.fromNumber(challenge._id), stats: {$exists: false}}).update({$set: {stats: {challengingPlayer: {}, challengedPlayer: {}}}});
        if (useChallengingPlayer) {
            bulk.find({_id: MongoDb.Long.fromNumber(challenge._id)}).update({$unset: {"stats.challengingPlayer.depth": "", "stats.challengingPlayer.time": "", "stats.challengingPlayer.completed": ""}});
        } else {
            bulk.find({_id: MongoDb.Long.fromNumber(challenge._id)}).update({$unset: {"stats.challengedPlayer.depth": "", "stats.challengedPlayer.time": "", "stats.challengedPlayer.completed": ""}});
        }

        await bulk.execute();
    }

    //                                #    #  #         #          #
    //                                #    ####         #          #
    // ###    ##   ###    ##   ###   ###   ####   ###  ###    ##   ###
    // #  #  # ##  #  #  #  #  #  #   #    #  #  #  #   #    #     #  #
    // #     ##    #  #  #  #  #      #    #  #  # ##   #    #     #  #
    // #      ##   ###    ##   #       ##  #  #   # #    ##   ##   #  #
    //             #
    /**
     * Reports the match.
     * @param {Challenge} challenge The challenge.
     * @param {boolean} challengingPlayerWon Whether the challenging player won.
     * @returns {Promise} A proimise that resolves when the match has been reported.
     */
    static async reportMatch(challenge, challengingPlayerWon) {
        const db = await Db.get();

        const bulk = db.collection("challenge").initializeOrderedBulkOp();

        bulk.find({_id: MongoDb.Long.fromNumber(challenge._id), stats: {$exists: false}}).update({$set: {stats: {challengingPlayer: {}, challengedPlayer: {}}}});
        bulk.find({_id: MongoDb.Long.fromNumber(challenge._id)}).update({$set: {reportTime: challenge.reportTime, "stats.challengingPlayer.won": challengingPlayerWon, "stats.challengedPlayer.won": !challengingPlayerWon}});

        await bulk.execute();
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
     * @param {Challenge} challenge The challenge to request a rematch from.
     * @returns {Promise} A promise that resolves when the rematch is requested.
     */
    static async requestRematch(challenge) {
        const db = await Db.get();

        await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$set: {rematchRequestedByPlayerId: MongoDb.Long.fromNumber(challenge.rematchRequestedByPlayerId)}});
    }

    //               #     ##                                  #
    //               #    #  #                                 #
    //  ###    ##   ###   #      ##   # #   # #    ##   ###   ###
    // ##     # ##   #    #     #  #  ####  ####  # ##  #  #   #
    //   ##   ##     #    #  #  #  #  #  #  #  #  ##    #  #   #
    // ###     ##     ##   ##    ##   #  #  #  #   ##   #  #    ##
    /**
     * Sets a comment on the match.
     * @param {Challenge} challenge The challenge.
     * @param {boolean} useChallengingPlayer Whether the add the comment to the challenging player.
     * @param {string} comment The comment to set.
     * @returns {Promise} A proimise that resolves when the comment has been set.
     */
    static async setComment(challenge, useChallengingPlayer, comment) {
        const db = await Db.get();

        const bulk = db.collection("challenge").initializeOrderedBulkOp();

        bulk.find({_id: MongoDb.Long.fromNumber(challenge._id), stats: {$exists: false}}).update({$set: {stats: {challengingPlayer: {}, challengedPlayer: {}}}});
        if (useChallengingPlayer) {
            bulk.find({_id: MongoDb.Long.fromNumber(challenge._id)}).update({$set: {"stats.challengingPlayer.comment": comment}});
        } else {
            bulk.find({_id: MongoDb.Long.fromNumber(challenge._id)}).update({$set: {"stats.challengedPlayer.comment": comment}});
        }

        await bulk.execute();

        await Cache.invalidate([`${process.env.REDIS_PREFIX}:invalidate:matches`]);
    }

    //               #    ###                 #
    //               #    #  #                #
    //  ###    ##   ###   #  #   ##    ###   ###    ###    ##    ###   ###    ##   ###
    // ##     # ##   #    ###   #  #  ##      #    ##     # ##  #  #  ##     #  #  #  #
    //   ##   ##     #    #     #  #    ##    #      ##   ##    # ##    ##   #  #  #  #
    // ###     ##     ##  #      ##   ###      ##  ###     ##    # #  ###     ##   #  #
    /**
     * Sets the postseason for a challenge.
     * @param {Challenge} challenge The challenge.
     * @param {boolean} postseason Whether to set the challenge to the postseason.
     * @returns {Promise} A promise that resolves when the postseason has been set.
     */
    static async setPostseason(challenge, postseason) {
        const db = await Db.get();

        await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$set: {postseason}});
    }

    //               #     ##    #           #
    //               #    #  #   #           #
    //  ###    ##   ###    #    ###    ###  ###
    // ##     # ##   #      #    #    #  #   #
    //   ##   ##     #    #  #   #    # ##   #
    // ###     ##     ##   ##     ##   # #    ##
    /**
     * Sets a player's statistics for a match.
     * @param {Challenge} challenge The challenge.
     * @param {boolean} useChallengingPlayer Whether to set the stats for the challenging player.
     * @param {number} depth The depth, in meters.
     * @param {number} time The time, in seconds.
     * @param {boolean} completed Whether the game was completed.
     * @returns {Promise} A promise that resolves when the stats are set.
     */
    static async setStat(challenge, useChallengingPlayer, depth, time, completed) {
        const db = await Db.get();

        const bulk = db.collection("challenge").initializeOrderedBulkOp();

        bulk.find({_id: MongoDb.Long.fromNumber(challenge._id), stats: {$exists: false}}).update({$set: {stats: {challengingPlayer: {}, challengedPlayer: {}}}});
        if (useChallengingPlayer) {
            bulk.find({_id: MongoDb.Long.fromNumber(challenge._id)}).update({$set: {"stats.challengingPlayer.depth": new MongoDb.Int32(depth), "stats.challengingPlayer.time": new MongoDb.Int32(time), "stats.challengingPlayer.completed": completed}});
        } else {
            bulk.find({_id: MongoDb.Long.fromNumber(challenge._id)}).update({$set: {"stats.challengedPlayer.depth": new MongoDb.Int32(depth), "stats.challengedPlayer.time": new MongoDb.Int32(time), "stats.challengedPlayer.completed": completed}});
        }

        await bulk.execute();
    }

    //               #    ###    #
    //               #     #
    //  ###    ##   ###    #    ##    # #    ##
    // ##     # ##   #     #     #    ####  # ##
    //   ##   ##     #     #     #    #  #  ##
    // ###     ##     ##   #    ###   #  #   ##
    /**
     * Sets a time for a challenge.
     * @param {Challenge} challenge The challenge to set a time for.
     * @param {Date} date The date and time that was set.
     * @returns {Promise} A promise that resolves when the challenge's time has been set.
     */
    static async setTime(challenge, date) {
        const db = await Db.get();

        await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$unset: {suggestedTime: "", suggestedByPlayerId: ""}, $set: {matchTime: date}});

        await Cache.invalidate([`${process.env.REDIS_PREFIX}:invalidate:upcoming`, `${process.env.REDIS_PREFIX}:matches`]);
    }

    //               #    ###    #     #    ##
    //               #     #           #     #
    //  ###    ##   ###    #    ##    ###    #     ##
    // ##     # ##   #     #     #     #     #    # ##
    //   ##   ##     #     #     #     #     #    ##
    // ###     ##     ##   #    ###     ##  ###    ##
    /**
     * Sets a title for a challenge.
     * @param {Challenge} challenge The challenge.
     * @param {string} title The title to set the challenge to.
     * @returns {Promise} A promise that resolves when the title has been set.
     */
    static async setTitle(challenge, title) {
        const db = await Db.get();

        if (title && title !== "") {
            await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$set: {title}});
        } else {
            await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$unset: {title: ""}});
        }

        await Cache.invalidate([`${process.env.REDIS_PREFIX}:invalidate:upcoming`, `${process.env.REDIS_PREFIX}:matches`]);
    }

    //               #    #  #   #
    //               #    #  #
    //  ###    ##   ###   #  #  ##    ###   ###    ##   ###
    // ##     # ##   #    ####   #    #  #  #  #  # ##  #  #
    //   ##   ##     #    ####   #    #  #  #  #  ##    #
    // ###     ##     ##  #  #  ###   #  #  #  #   ##   #
    /**
     * Sets the winner of the match.
     * @param {Challenge} challenge The challenge.
     * @param {boolean} challengingPlayerWon Whether the challenging player won.
     * @returns {Promise} A proimise that resolves when the winner has been set.
     */
    static async setWinner(challenge, challengingPlayerWon) {
        const db = await Db.get();

        const bulk = db.collection("challenge").initializeOrderedBulkOp();

        bulk.find({_id: MongoDb.Long.fromNumber(challenge._id), stats: {$exists: false}}).update({$set: {stats: {challengingPlayer: {}, challengedPlayer: {}}}});
        bulk.find({_id: MongoDb.Long.fromNumber(challenge._id)}).update({$set: {reportTime: challenge.reportTime, confirmedTime: challenge.confirmedTime, "stats.challengingPlayer.won": challengingPlayerWon, "stats.challengedPlayer.won": !challengingPlayerWon}});

        await bulk.execute();

        await Cache.invalidate([`${process.env.REDIS_PREFIX}:invalidate:standings:${challenge.season}`, `${process.env.REDIS_PREFIX}:invalidate:upcoming`, `${process.env.REDIS_PREFIX}:invalidate:matches`]);
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
     * @param {Challenge} challenge The challenge.
     * @param {PlayerTypes.Player} player The player suggesting the time.
     * @param {Date} date The suggested date and time.
     * @returns {Promise} A promise that resolves when the time has been suggested.
     */
    static async suggestTime(challenge, player, date) {
        const db = await Db.get();

        await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$set: {suggestedTime: date, suggestedByPlayerId: MongoDb.Long.fromNumber(player._id)}});
    }

    //              #       #
    //                      #
    // # #    ##   ##     ###
    // # #   #  #   #    #  #
    // # #   #  #   #    #  #
    //  #     ##   ###    ###
    /**
     * Voids a match.
     * @param {Challenge} challenge The challenge.
     * @param {boolean} voiding Whether to void the match.
     * @returns {Promise} A promise that resolves when the match is voided.
     */
    static async void(challenge, voiding) {
        const db = await Db.get();

        if (voiding) {
            await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$set: {voidTime: challenge.voidTime}});
        } else {
            await db.collection("challenge").findOneAndUpdate({_id: MongoDb.Long.fromNumber(challenge._id)}, {$unset: {voidTime: ""}});
        }

        await Cache.invalidate([`${process.env.REDIS_PREFIX}:invalidate:standings:${challenge.season}`, `${process.env.REDIS_PREFIX}:invalidate:upcoming`, `${process.env.REDIS_PREFIX}:invalidate:matches`, `${process.env.REDIS_PREFIX}:invalidate:player:${challenge.players.challengingPlayerId}`, `${process.env.REDIS_PREFIX}:invalidate:player:${challenge.players.challengedPlayerId}`]);
    }
}

module.exports = ChallengeDb;
