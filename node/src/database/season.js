/**
 * @typedef {import("../../types/node/seasonTypes").Season} SeasonTypes.Season
 */

const MongoDb = require("mongodb"),

    Cache = require("node-redis").Cache,
    Db = require("."),
    Log = require("node-application-insights-logger");

//   ###                                      ####   #
//  #   #                                      #  #  #
//  #       ###    ###    ###    ###   # ##    #  #  # ##
//   ###   #   #      #  #      #   #  ##  #   #  #  ##  #
//      #  #####   ####   ###   #   #  #   #   #  #  #   #
//  #   #  #      #   #      #  #   #  #   #   #  #  ##  #
//   ###    ###    ####  ####    ###   #   #  ####   # ##
/**
 * A class to handle database calls for the season collection.
 */
class SeasonDb {
    //              #
    //              #
    //  ###   ##   ###
    // #  #  # ##   #
    //  ##   ##     #
    // #      ##     ##
    //  ###
    /**
     * Gets a season by the season number.
     * @param {number} id The season number.
     * @returns {Promise<SeasonTypes.Season>} A promise that resolves with the season.
     */
    static async get(id) {
        const db = await Db.get();

        const data = /** @type {SeasonTypes.Season} */(await db.collection("season").findOne({_id: MongoDb.Long.fromNumber(id)})); // eslint-disable-line no-extra-parens

        return data || void 0;
    }

    //              #    ####                    ###          #
    //              #    #                       #  #         #
    //  ###   ##   ###   ###   ###    ##   # #   #  #   ###  ###    ##
    // #  #  # ##   #    #     #  #  #  #  ####  #  #  #  #   #    # ##
    //  ##   ##     #    #     #     #  #  #  #  #  #  # ##   #    ##
    // #      ##     ##  #     #      ##   #  #  ###    # #    ##   ##
    //  ###
    /**
     * Gets a season from the date, creating it if it's in the future.
     * @param {Date} date The date.
     * @returns {Promise<SeasonTypes.Season>} A promise that resolves with the season.
     */
    static async getFromDate(date) {
        const db = await Db.get();

        let data = /** @type {SeasonTypes.Season} */(await db.collection("season").findOne({startDate: {$lte: date}})); // eslint-disable-line no-extra-parens

        if (!data) {
            return void 0;
        }

        data = void 0;

        /** @type {number} */
        let k;

        while (!data) {
            data = /** @type {SeasonTypes.Season} */(await db.collection("season").findOne({ // eslint-disable-line no-extra-parens
                $and: [
                    {startDate: {$lte: date}},
                    {endDate: {$gt: date}}
                ]
            }));

            if (!data) {
                if (!k) {
                    k = (await db.collection("season").aggregate([
                        {
                            $sort: {season: -1}
                        },
                        {
                            $project: {
                                _id: 0,
                                K: 1
                            }
                        },
                        {
                            $limit: 1
                        }
                    ]).toArray())[0].K.valueOf();
                }

                const maxSeason = /** @type {{endDate: Date}[]} */(await db.collection("season").aggregate([ // eslint-disable-line no-extra-parens
                    {
                        $group: {
                            _id: null,
                            endDate: {$max: "$endDate"}
                        }
                    }
                ]).toArray());

                const season = {
                    startDate: maxSeason[0].endDate,
                    endDate: new Date(maxSeason[0].endDate.getFullYear(), maxSeason[0].endDate.getMonth() + 2, maxSeason[0].endDate.getDate()),
                    K: new MongoDb.Int32(k)
                };

                await Db.id(season, "season");

                await db.collection("season").insertOne(season);
            }
        }

        return data || void 0;
    }

    //              #     ##                                  #  #              #
    //              #    #  #                                 ## #              #
    //  ###   ##   ###    #     ##    ###   ###    ##   ###   ## #  #  #  # #   ###    ##   ###    ###
    // #  #  # ##   #      #   # ##  #  #  ##     #  #  #  #  # ##  #  #  ####  #  #  # ##  #  #  ##
    //  ##   ##     #    #  #  ##    # ##    ##   #  #  #  #  # ##  #  #  #  #  #  #  ##    #       ##
    // #      ##     ##   ##    ##    # #  ###     ##   #  #  #  #   ###  #  #  ###    ##   #     ###
    //  ###
    /**
     * Gets the season numbers.
     * @returns {Promise<number[]>} A promise that resolves with a list of season numbers.
     */
    static async getSeasonNumbers() {
        const key = `${process.env.REDIS_PREFIX}:seasonNumbers`;

        /** @type {number[]} */
        let cache;
        try {
            cache = await Cache.get(key);
        } catch (err) {
            Log.error("An error occurred while getting the cache for season numbers.", {err});
        }

        if (cache) {
            return cache;
        }

        const db = await Db.get();

        const data = /** @type {{season: number}[]} */(await db.collection("season").find().project({_id: 0, season: "$_id"}).sort({_id: 1}).toArray()); // eslint-disable-line no-extra-parens

        cache = data && data.map((s) => s.season) || [1];

        const seasonObj = await SeasonDb.get(cache[cache.length - 1]);

        Cache.add(key, cache, seasonObj && seasonObj.endDate || void 0).catch((err) => {
            Log.error("An error occurred while setting the cache for season numbers.", {err});
        });

        return cache;
    }
}

module.exports = SeasonDb;
