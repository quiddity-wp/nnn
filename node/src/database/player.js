/**
 * @typedef {import("../../types/node/dbTypes").Player} DbTypes.Player
 * @typedef {import("discord.js").GuildMember} DiscordJs.GuildMember
 * @typedef {import("../../types/node/playerTypes").Career} PlayerTypes.Career
 * @typedef {import("../../types/node/playerTypes").Player} PlayerTypes.Player
 * @typedef {import("../../types/node/playerTypes").SeasonStanding} PlayerTypes.SeasonStanding
 * @typedef {import("../../types/node/playerTypes").SeasonStats} PlayerTypes.SeasonStats
 */

const MongoDb = require("mongodb"),

    Cache = require("node-redis").Cache,
    Db = require("."),
    Log = require("node-application-insights-logger"),
    Season = require("./season");

//  ####    ##                                ####   #
//  #   #    #                                 #  #  #
//  #   #    #     ###   #   #   ###   # ##    #  #  # ##
//  ####     #        #  #   #  #   #  ##  #   #  #  ##  #
//  #        #     ####  #  ##  #####  #       #  #  #   #
//  #        #    #   #   ## #  #      #       #  #  ##  #
//  #       ###    ####      #   ###   #      ####   # ##
//                       #   #
//                        ###
/**
 * A class to handle database calls for the player collection.
 */
class PlayerDb {
    //          #     #
    //          #     #
    //  ###   ###   ###
    // #  #  #  #  #  #
    // # ##  #  #  #  #
    //  # #   ###   ###
    /**
     * Adds a player to the database.
     * @param {PlayerTypes.Player} player The player to add.
     * @returns {Promise} A promise that resolves with the ID of the player added.
     */
    static async add(player) {
        const db = await Db.get();

        const dbPlayer = {
            _id: void 0,
            discordId: player.discordId,
            active: player.active
        };

        if (player.name) {
            dbPlayer.name = player.name;
        }

        if (player.timezone) {
            dbPlayer.timezone = player.timezone;
        }

        await Db.id(dbPlayer, "player");

        const result = await db.collection("player").insertOne(dbPlayer);

        player._id = Db.fromLong(result.insertedId);
    }

    //       ##                      ###    #
    //        #                       #
    //  ##    #     ##    ###  ###    #    ##    # #    ##   ####   ##   ###    ##
    // #      #    # ##  #  #  #  #   #     #    ####  # ##    #   #  #  #  #  # ##
    // #      #    ##    # ##  #      #     #    #  #  ##     #    #  #  #  #  ##
    //  ##   ###    ##    # #  #      #    ###   #  #   ##   ####   ##   #  #   ##
    /**
     * Clears a player's timezone.
     * @param {DiscordJs.GuildMember} member The member to clear the timezone for.
     * @returns {Promise} A promise that resolves once the time zone is cleared.
     */
    static async clearTimezone(member) {
        const db = await Db.get();

        const result = await db.collection("player").findOneAndUpdate({discordId: member.id}, {$unset: {timezone: 1}});

        if (!result.value) {
            await PlayerDb.add({
                discordId: member.id,
                name: member.displayName,
                active: false
            });
        }
    }

    //              #
    //              #
    //  ###   ##   ###
    // #  #  # ##   #
    //  ##   ##     #
    // #      ##     ##
    //  ###
    /**
     * Gets a player by their player ID.
     * @param {number} id The player ID.
     * @returns {Promise<PlayerTypes.Player>} A promise that resolves with the player.
     */
    static async get(id) {
        const db = await Db.get();

        const data = await db.collection("player").findOne({_id: MongoDb.Long.fromNumber(id)});

        return data ? {
            _id: Db.fromLong(data._id),
            discordId: data.discordId,
            name: data.name,
            timezone: data.timezone,
            active: data.active
        } : void 0;
    }

    //              #    ###         ###    #                                #  ###      #
    //              #    #  #        #  #                                    #   #       #
    //  ###   ##   ###   ###   #  #  #  #  ##     ###    ##    ##   ###    ###   #     ###
    // #  #  # ##   #    #  #  #  #  #  #   #    ##     #     #  #  #  #  #  #   #    #  #
    //  ##   ##     #    #  #   # #  #  #   #      ##   #     #  #  #     #  #   #    #  #
    // #      ##     ##  ###     #   ###   ###   ###     ##    ##   #      ###  ###    ###
    //  ###                     #
    /**
     * Gets a player by their Discord ID.
     * @param {string} discordId The player's Discord ID.
     * @returns {Promise<PlayerTypes.Player>} A promise that resolves with the player.
     */
    static async getByDiscordId(discordId) {
        const db = await Db.get();

        const data = await db.collection("player").findOne({discordId});

        return data ? {
            _id: Db.fromLong(data._id),
            discordId: data.discordId,
            name: data.name,
            timezone: data.timezone,
            active: data.active
        } : void 0;
    }

    //              #     ##
    //              #    #  #
    //  ###   ##   ###   #      ###  ###    ##    ##   ###
    // #  #  # ##   #    #     #  #  #  #  # ##  # ##  #  #
    //  ##   ##     #    #  #  # ##  #     ##    ##    #
    // #      ##     ##   ##    # #  #      ##    ##   #
    //  ###
    /**
     * Gets the career for a player, and some advanced stats for a single season.
     * @param {number} playerId The player ID.
     * @param {number} season The season.
     * @returns {Promise<PlayerTypes.Career>} A promise that resolves with the player's career stats.
     */
    static async getCareer(playerId, season) {
        const key = `${process.env.REDIS_PREFIX}:getCareer:${playerId || "null"}:${season || "null"}`;

        /** @type {PlayerTypes.Career} */
        let cache;
        try {
            cache = await Cache.get(key);
        } catch (err) {
            Log.error("An error occurred while getting the cache for getting career stats.", {err, properties: {playerId}});
        }

        if (cache) {
            return cache;
        }

        const db = await Db.get();

        cache = /** @type {PlayerTypes.Career} */(await db.collection("challenge").aggregate([ // eslint-disable-line no-extra-parens
            {
                $match: {
                    $and: [
                        {
                            $or: [
                                {"players.challengingPlayerId": MongoDb.Long.fromNumber(playerId)},
                                {"players.challengedPlayerId": MongoDb.Long.fromNumber(playerId)}
                            ]
                        },
                        {confirmedTime: {$exists: true}},
                        {closeTime: {$exists: true}},
                        {voidTime: {$exists: false}}
                    ]
                }
            },
            {
                $facet: {
                    player: [
                        {
                            $match: {
                                _id: 0
                            }
                        },
                        {
                            $unionWith: {
                                coll: "player",
                                pipeline: [{$match: {_id: MongoDb.Long.fromNumber(playerId)}}]
                            }
                        }
                    ],
                    career: [
                        {
                            $group: {
                                _id: "$season",
                                games: {$sum: 1},
                                won: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
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
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: 0,
                                            else: 1
                                        }
                                    }
                                },
                                completed: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.completed", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.completed", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                },
                                totalWonDepth: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: {
                                                $cond: {
                                                    if: {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                    then: "$stats.challengingPlayer.depth",
                                                    else: "$stats.challengedPlayer.depth"
                                                }
                                            },
                                            else: 0
                                        }
                                    }
                                },
                                totalWonTime: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: {
                                                $cond: {
                                                    if: {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                    then: "$stats.challengingPlayer.time",
                                                    else: "$stats.challengedPlayer.time"
                                                }
                                            },
                                            else: 0
                                        }
                                    }
                                },
                                totalLossDepth: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: 0,
                                            else: {
                                                $cond: {
                                                    if: {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                    then: "$stats.challengingPlayer.depth",
                                                    else: "$stats.challengedPlayer.depth"
                                                }
                                            }
                                        }
                                    }
                                },
                                totalLossTime: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: 0,
                                            else: {
                                                $cond: {
                                                    if: {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                    then: "$stats.challengingPlayer.time",
                                                    else: "$stats.challengedPlayer.time"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "rating",
                                let: {
                                    playerId: MongoDb.Long.fromNumber(playerId),
                                    season: "$_id"
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    {$eq: ["$playerId", "$$playerId"]},
                                                    {$eq: ["$season", "$$season"]}
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: "rating"
                            }
                        },
                        {
                            $lookup: {
                                from: "rating",
                                let: {
                                    season: "$_id",
                                    rating: {
                                        $arrayElemAt: ["$rating.rating", 0]
                                    }
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    {$eq: ["$season", "$$season"]},
                                                    {$gt: ["$rating", "$$rating"]}
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $group: {
                                            _id: null,
                                            rank: {$sum: 1}
                                        }
                                    }
                                ],
                                as: "rank"
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                season: "$_id",
                                rank: {$ifNull: [{$add: [{$arrayElemAt: ["$rank.rank", 0]}, 1]}, 1]},
                                rating: {$arrayElemAt: ["$rating.rating", 0]},
                                games: 1,
                                won: 1,
                                lost: 1,
                                completed: 1,
                                wonDepth: {
                                    $cond: {
                                        if: {$eq: ["$won", 0]},
                                        then: 0,
                                        else: {$divide: ["$totalWonDepth", "$won"]}
                                    }
                                },
                                wonTime: {
                                    $cond: {
                                        if: {$eq: ["$won", 0]},
                                        then: 0,
                                        else: {$divide: ["$totalWonTime", "$won"]}
                                    }
                                },
                                lossDepth: {
                                    $cond: {
                                        if: {$eq: ["$lost", 0]},
                                        then: 0,
                                        else: {$divide: ["$totalLossDepth", "$lost"]}
                                    }
                                },
                                lossTime: {
                                    $cond: {
                                        if: {$eq: ["$lost", 0]},
                                        then: 0,
                                        else: {$divide: ["$totalLossTime", "$lost"]}
                                    }
                                }
                            }
                        },
                        {
                            $sort: {season: 1}
                        }
                    ],
                    performance: [
                        {
                            $match: {
                                season: MongoDb.Long.fromNumber(season)
                            }
                        },
                        {
                            $group: {
                                _id: {
                                    $cond: {
                                        if: {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                        then: "$players.challengedPlayerId",
                                        else: "$players.challengingPlayerId"
                                    }
                                },
                                games: {$sum: 1},
                                won: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
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
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: 0,
                                            else: 1
                                        }
                                    }
                                },
                                completed: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.completed", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.completed", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                },
                                totalWonDepth: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: {
                                                $cond: {
                                                    if: {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                    then: "$stats.challengingPlayer.depth",
                                                    else: "$stats.challengedPlayer.depth"
                                                }
                                            },
                                            else: 0
                                        }
                                    }
                                },
                                totalWonTime: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: {
                                                $cond: {
                                                    if: {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                    then: "$stats.challengingPlayer.time",
                                                    else: "$stats.challengedPlayer.time"
                                                }
                                            },
                                            else: 0
                                        }
                                    }
                                },
                                totalLossDepth: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: 0,
                                            else: {
                                                $cond: {
                                                    if: {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                    then: "$stats.challengingPlayer.depth",
                                                    else: "$stats.challengedPlayer.depth"
                                                }
                                            }
                                        }
                                    }
                                },
                                totalLossTime: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengingPlayer.won", true]}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {$eq: ["$players.challengedPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                            {$eq: ["$stats.challengedPlayer.won", true]}
                                                        ]
                                                    }
                                                ]
                                            },
                                            then: 0,
                                            else: {
                                                $cond: {
                                                    if: {$eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]},
                                                    then: "$stats.challengingPlayer.time",
                                                    else: "$stats.challengedPlayer.time"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "player",
                                localField: "_id",
                                foreignField: "_id",
                                as: "opponent"
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                opponentPlayerId: "$_id",
                                opponent: {$arrayElemAt: ["$opponent.name", 0]},
                                games: 1,
                                won: 1,
                                lost: 1,
                                completed: 1,
                                wonDepth: {
                                    $cond: {
                                        if: {$eq: ["$won", 0]},
                                        then: 0,
                                        else: {$divide: ["$totalWonDepth", "$won"]}
                                    }
                                },
                                wonTime: {
                                    $cond: {
                                        if: {$eq: ["$won", 0]},
                                        then: 0,
                                        else: {$divide: ["$totalWonTime", "$won"]}
                                    }
                                },
                                lossDepth: {
                                    $cond: {
                                        if: {$eq: ["$lost", 0]},
                                        then: 0,
                                        else: {$divide: ["$totalLossDepth", "$lost"]}
                                    }
                                },
                                lossTime: {
                                    $cond: {
                                        if: {$eq: ["$lost", 0]},
                                        then: 0,
                                        else: {$divide: ["$totalLossTime", "$lost"]}
                                    }
                                }
                            }
                        },
                        {
                            $sort: {
                                games: -1,
                                won: -1
                            }
                        }
                    ],
                    games: [
                        {
                            $match: {
                                season: MongoDb.Long.fromNumber(season)
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                matchTime: 1,
                                won: {
                                    $cond: {
                                        if: {
                                            $eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]
                                        },
                                        then: "$stats.challengingPlayer.won",
                                        else: "$stats.challengedPlayer.won"
                                    }
                                },
                                completed: {
                                    $cond: {
                                        if: {
                                            $eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]
                                        },
                                        then: "$stats.challengingPlayer.completed",
                                        else: "$stats.challengedPlayer.completed"
                                    }
                                },
                                ratingChange: {
                                    $cond: {
                                        if: {
                                            $eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]
                                        },
                                        then: "$ratings.change",
                                        else: {$subtract: [0, "$ratings.change"]}
                                    }
                                },
                                depth: {
                                    $cond: {
                                        if: {
                                            $eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]
                                        },
                                        then: "$stats.challengingPlayer.depth",
                                        else: "$stats.challengedPlayer.depth"
                                    }
                                },
                                time: {
                                    $cond: {
                                        if: {
                                            $eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]
                                        },
                                        then: "$stats.challengingPlayer.time",
                                        else: "$stats.challengedPlayer.time"
                                    }
                                },
                                opponentPlayerId: {
                                    $cond: {
                                        if: {
                                            $eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]
                                        },
                                        then: "$players.challengedPlayerId",
                                        else: "$players.challengingPlayerId"
                                    }
                                },
                                opponentCompleted: {
                                    $cond: {
                                        if: {
                                            $eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]
                                        },
                                        then: "$stats.challengedPlayer.completed",
                                        else: "$stats.challengingPlayer.completed"
                                    }
                                },
                                opponentDepth: {
                                    $cond: {
                                        if: {
                                            $eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]
                                        },
                                        then: "$stats.challengedPlayer.depth",
                                        else: "$stats.challengingPlayer.depth"
                                    }
                                },
                                opponentTime: {
                                    $cond: {
                                        if: {
                                            $eq: ["$players.challengingPlayerId", MongoDb.Long.fromNumber(playerId)]
                                        },
                                        then: "$stats.challengedPlayer.time",
                                        else: "$stats.challengingPlayer.time"
                                    }
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "player",
                                localField: "opponentPlayerId",
                                foreignField: "_id",
                                as: "opponent"
                            }
                        },
                        {
                            $project: {
                                matchTime: 1,
                                won: 1,
                                completed: 1,
                                ratingChange: 1,
                                depth: 1,
                                time: 1,
                                opponentPlayerId: 1,
                                opponent: {
                                    $arrayElemAt: ["$opponent.name", 0]
                                },
                                opponentCompleted: 1,
                                opponentDepth: 1,
                                opponentTime: 1
                            }
                        },
                        {
                            $sort: {
                                matchTime: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$player"
            }
        ]).next());

        cache = cache || {player: void 0, career: [], performance: [], games: []};

        const seasonObj = await Season.get(season);

        Cache.add(key, cache, seasonObj && seasonObj.endDate || void 0, [`${process.env.REDIS_PREFIX}:invalidate:player:${playerId}`, `${process.env.REDIS_PREFIX}:invalidate:players`]).catch((err) => {
            Log.error("An error occurred while setting the cache for getting career stats.", {err, properties: {playerId}});
        });

        return cache;
    }

    //              #     ##                                   ##    #                   #   #
    //              #    #  #                                 #  #   #                   #
    //  ###   ##   ###    #     ##    ###   ###    ##   ###    #    ###    ###  ###    ###  ##    ###    ###   ###
    // #  #  # ##   #      #   # ##  #  #  ##     #  #  #  #    #    #    #  #  #  #  #  #   #    #  #  #  #  ##
    //  ##   ##     #    #  #  ##    # ##    ##   #  #  #  #  #  #   #    # ##  #  #  #  #   #    #  #   ##     ##
    // #      ##     ##   ##    ##    # #  ###     ##   #  #   ##     ##   # #  #  #   ###  ###   #  #  #     ###
    //  ###                                                                                              ###
    /**
     * Gets the standings for a season.
     * @param {number} season The season to get the standings for.
     * @returns {Promise<PlayerTypes.SeasonStanding[]>} A promise that resolves with the season standings.
     */
    static async getSeasonStandings(season) {
        const key = `${process.env.REDIS_PREFIX}:seasonStandings:${season || "null"}`;

        /** @type {PlayerTypes.SeasonStanding[]} */
        let cache;
        try {
            cache = await Cache.get(key);
        } catch (err) {
            Log.error("An error occurred while getting the cache for season standings.", {err, properties: {season}});
        }

        if (cache) {
            return cache;
        }

        const db = await Db.get();

        cache = /** @type {PlayerTypes.SeasonStanding[]} */(await db.collection("challenge").aggregate([ // eslint-disable-line no-extra-parens
            {
                $facet: {
                    challengingPlayer: [
                        {
                            $match: {
                                season: MongoDb.Long.fromNumber(season),
                                confirmedTime: {$exists: true},
                                closeTime: {$exists: true},
                                voidTime: {$exists: false}
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                stats: "$stats.challengingPlayer",
                                playerId: "$players.challengingPlayerId"
                            }
                        }
                    ],
                    challengedPlayer: [
                        {
                            $match: {
                                season: MongoDb.Long.fromNumber(season),
                                confirmedTime: {$exists: true},
                                closeTime: {$exists: true},
                                voidTime: {$exists: false}
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                stats: "$stats.challengedPlayer",
                                playerId: "$players.challengedPlayerId"
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    stats: {
                        $concatArrays: ["$challengingPlayer", "$challengedPlayer"]
                    }
                }
            },
            {$unwind: "$stats"},
            {
                $group: {
                    _id: "$stats.playerId",
                    won: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.won", true]
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
                                    $eq: ["$stats.stats.won", true]
                                },
                                then: 0,
                                else: 1
                            }
                        }
                    },
                    wonDepth: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.won", true]
                                },
                                then: "$stats.stats.depth",
                                else: 0
                            }
                        }
                    },
                    lossDepth: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.won", true]
                                },
                                then: 0,
                                else: "$stats.stats.depth"
                            }
                        }
                    },
                    wonTime: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.won", true]
                                },
                                then: "$stats.stats.time",
                                else: 0
                            }
                        }
                    },
                    lossTime: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.won", true]
                                },
                                then: 0,
                                else: "$stats.stats.time"
                            }
                        }
                    },
                    completed: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.completed", true]
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
                    playerId: "$_id",
                    won: 1,
                    lost: 1,
                    completed: 1,
                    wonDepth: {
                        $cond: {
                            if: {
                                $eq: ["$won", 0]
                            },
                            then: 0,
                            else: {
                                $divide: ["$wonDepth", "$won"]
                            }
                        }
                    },
                    lossDepth: {
                        $cond: {
                            if: {
                                $eq: ["$lost", 0]
                            },
                            then: 0,
                            else: {
                                $divide: ["$lossDepth", "$lost"]
                            }
                        }
                    },
                    wonTime: {
                        $cond: {
                            if: {
                                $eq: ["$won", 0]
                            },
                            then: 0,
                            else: {
                                $divide: ["$wonTime", "$won"]
                            }
                        }
                    },
                    lossTime: {
                        $cond: {
                            if: {
                                $eq: ["$lost", 0]
                            },
                            then: 0,
                            else: {
                                $divide: ["$lossTime", "$lost"]
                            }
                        }
                    }
                }
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
                    from: "rating",
                    let: {playerId: "$playerId"},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ["$season", MongoDb.Long.fromNumber(season)]},
                                        {$eq: ["$playerId", "$$playerId"]}
                                    ]
                                }
                            }
                        }
                    ],
                    as: "rating"
                }
            },
            {
                $project: {
                    playerId: 1,
                    name: {$arrayElemAt: ["$player.name", 0]},
                    rating: {$arrayElemAt: ["$rating.rating", 0]},
                    won: 1,
                    lost: 1,
                    completed: 1,
                    wonDepth: 1,
                    lossDepth: 1,
                    wonTime: 1,
                    lossTime: 1
                }
            },
            {
                $sort: {rating: -1}
            }
        ]).toArray());

        cache = cache || [];

        const seasonObj = await Season.get(season);

        Cache.add(key, cache, seasonObj && seasonObj.endDate || void 0, [`${process.env.REDIS_PREFIX}:invalidate:standings:${season}`]).catch((err) => {
            Log.error("An error occurred while setting the cache for season standings.", {err, properties: {season}});
        });

        return cache;
    }

    //              #     ##    #           #           ####              ###                            #     ##
    //              #    #  #   #           #           #                 #  #                           #    #  #
    //  ###   ##   ###    #    ###    ###  ###    ###   ###    ##   ###   #  #   ##    ##    ##   ###   ###    #     ##    ###   ###    ##   ###
    // #  #  # ##   #      #    #    #  #   #    ##     #     #  #  #  #  ###   # ##  #     # ##  #  #   #      #   # ##  #  #  ##     #  #  #  #
    //  ##   ##     #    #  #   #    # ##   #      ##   #     #  #  #     # #   ##    #     ##    #  #   #    #  #  ##    # ##    ##   #  #  #  #
    // #      ##     ##   ##     ##   # #    ##  ###    #      ##   #     #  #   ##    ##    ##   #  #    ##   ##    ##    # #  ###     ##   #  #
    //  ###
    /**
     * Gets the most recent season's stats for a player.
     * @param {number} id The player ID.
     * @returns {Promise<PlayerTypes.SeasonStats>} A promise that resolves with the stats for the recent season.
     */
    static async getStatsForRecentSeason(id) {
        const db = await Db.get();

        const data = /** @type {PlayerTypes.SeasonStats[]} */(await db.collection("challenge").aggregate([ // eslint-disable-line no-extra-parens
            {
                $facet: {
                    challengingPlayer: [
                        {
                            $match: {
                                "players.challengingPlayerId": MongoDb.Long.fromNumber(id),
                                confirmedTime: {$exists: true},
                                closeTime: {$exists: true},
                                voidTime: {$exists: false}
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                season: 1,
                                stats: "$stats.challengingPlayer"
                            }
                        }
                    ],
                    challengedPlayer: [
                        {
                            $match: {
                                "players.challengedPlayerId": MongoDb.Long.fromNumber(id),
                                confirmedTime: {$exists: true},
                                closeTime: {$exists: true},
                                voidTime: {$exists: false}
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                season: 1,
                                stats: "$stats.challengedPlayer"
                            }
                        }
                    ],
                    maxSeason: [
                        {
                            $match: {
                                $or: [
                                    {"players.challengingPlayerId": MongoDb.Long.fromNumber(id)},
                                    {"players.challengedPlayerId": MongoDb.Long.fromNumber(id)}
                                ]
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                season: {$max: "$season"}
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                season: 1
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    stats: {
                        $concatArrays: [
                            {
                                $filter: {
                                    input: "$challengingPlayer",
                                    as: "challengingPlayer",
                                    cond: {
                                        $eq: [
                                            "$$challengingPlayer.season",
                                            {$arrayElemAt: ["$maxSeason.season", 0]}
                                        ]
                                    }
                                }
                            },
                            {
                                $filter: {
                                    input: "$challengedPlayer",
                                    as: "challengedPlayer",
                                    cond: {
                                        $eq: [
                                            "$$challengedPlayer.season",
                                            {$arrayElemAt: ["$maxSeason.season", 0]}
                                        ]
                                    }
                                }
                            }
                        ]
                    },
                    maxSeason: "$maxSeason.season"
                }
            },
            {$unwind: "$stats"},
            {
                $group: {
                    _id: null,
                    season: {$max: "$stats.season"},
                    games: {$sum: 1},
                    won: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.won", true]
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
                                    $eq: ["$stats.stats.won", true]
                                },
                                then: 0,
                                else: 1
                            }
                        }
                    },
                    wonDepth: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.won", true]
                                },
                                then: "$stats.stats.depth",
                                else: 0
                            }
                        }
                    },
                    lossDepth: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.won", true]
                                },
                                then: 0,
                                else: "$stats.stats.depth"
                            }
                        }
                    },
                    wonTime: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.won", true]
                                },
                                then: "$stats.stats.time",
                                else: 0
                            }
                        }
                    },
                    lossTime: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.won", true]
                                },
                                then: 0,
                                else: "$stats.stats.time"
                            }
                        }
                    },
                    completed: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$stats.stats.completed", true]
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
                    season: 1,
                    games: 1,
                    won: 1,
                    lost: 1,
                    completed: 1,
                    wonDepth: {
                        $cond: {
                            if: {
                                $eq: ["$won", 0]
                            },
                            then: 0,
                            else: {
                                $divide: ["$wonDepth", "$won"]
                            }
                        }
                    },
                    lossDepth: {
                        $cond: {
                            if: {
                                $eq: ["$lost", 0]
                            },
                            then: 0,
                            else: {
                                $divide: ["$lossDepth", "$lost"]
                            }
                        }
                    },
                    wonTime: {
                        $cond: {
                            if: {
                                $eq: ["$won", 0]
                            },
                            then: 0,
                            else: {
                                $divide: ["$wonTime", "$won"]
                            }
                        }
                    },
                    lossTime: {
                        $cond: {
                            if: {
                                $eq: ["$lost", 0]
                            },
                            then: 0,
                            else: {
                                $divide: ["$lossTime", "$lost"]
                            }
                        }
                    }
                }
            }
        ]).toArray());

        return data && data[0] || void 0;
    }

    //               #     ##          #     #
    //               #    #  #         #
    //  ###    ##   ###   #  #   ##   ###   ##    # #    ##
    // ##     # ##   #    ####  #      #     #    # #   # ##
    //   ##   ##     #    #  #  #      #     #    # #   ##
    // ###     ##     ##  #  #   ##     ##  ###    #     ##
    /**
     * Sets a player's active state.
     * @param {DiscordJs.GuildMember} member The member to set the active state for.
     * @param {boolean} active The state to set the player's active state to.
     * @returns {Promise} A promise that resolves when the player's active state is set.
     */
    static async setActive(member, active) {
        const db = await Db.get();

        const result = await db.collection("player").findOneAndUpdate({discordId: member.id}, {$set: {active}});

        if (!result.value) {
            await PlayerDb.add({
                discordId: member.id,
                name: member.displayName,
                active
            });
        }
    }

    //               #    #  #
    //               #    ## #
    //  ###    ##   ###   ## #   ###  # #    ##
    // ##     # ##   #    # ##  #  #  ####  # ##
    //   ##   ##     #    # ##  # ##  #  #  ##
    // ###     ##     ##  #  #   # #  #  #   ##
    /**
     * Sets a player's name.
     * @param {DiscordJs.GuildMember} member The member to set the name of.
     * @returns {Promise} A promise that resolves when the player's name is set.
     */
    static async setName(member) {
        const db = await Db.get();

        await db.collection("player").findOneAndUpdate({discordId: member.id}, {$set: {name: member.displayName}});
    }

    //               #    ###    #
    //               #     #
    //  ###    ##   ###    #    ##    # #    ##   ####   ##   ###    ##
    // ##     # ##   #     #     #    ####  # ##    #   #  #  #  #  # ##
    //   ##   ##     #     #     #    #  #  ##     #    #  #  #  #  ##
    // ###     ##     ##   #    ###   #  #   ##   ####   ##   #  #   ##
    /**
     * Sets a player's timezone.
     * @param {DiscordJs.GuildMember} member The member to set the timezone for.
     * @param {string} timezone The timezone.
     * @returns {Promise} A promise that resolves once the time zone is set.
     */
    static async setTimezone(member, timezone) {
        const db = await Db.get();

        const result = await db.collection("player").findOneAndUpdate({discordId: member.id}, {$set: {timezone}});

        if (!result.value) {
            await PlayerDb.add({
                discordId: member.id,
                name: member.displayName,
                timezone,
                active: false
            });
        }
    }
}

module.exports = PlayerDb;
