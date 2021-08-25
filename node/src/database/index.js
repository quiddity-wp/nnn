const MongoDb = require("mongodb");

/**
 * @type {MongoDb.MongoClient}
 */
let client;

/**
 * @type {MongoDb.Db}
 */
let db;

//  ####   #
//   #  #  #
//   #  #  # ##
//   #  #  ##  #
//   #  #  #   #
//   #  #  ##  #
//  ####   # ##
/**
 * Gets an instance of the database.
 */
class Db {
    //   #                     #
    //  # #                    #
    //  #    ###    ##   # #   #      ##   ###    ###
    // ###   #  #  #  #  ####  #     #  #  #  #  #  #
    //  #    #     #  #  #  #  #     #  #  #  #   ##
    //  #    #      ##   #  #  ####   ##   #  #  #
    //                                            ###
    /**
     * Converts a value from a MongoDb.Long to a number.
     * @param {MongoDb.Long|number} val The number.
     * @returns {number} The number.
     */
    static fromLong(val) {
        return typeof val === "number" ? val : val.toNumber();
    }

    //  #          #
    //  #          #
    // ###    ##   #      ##   ###    ###
    //  #    #  #  #     #  #  #  #  #  #
    //  #    #  #  #     #  #  #  #   ##
    //   ##   ##   ####   ##   #  #  #
    //                                ###
    /**
     * Converts a value from a number to a MongoDb.Long.
     * @param {MongoDb.Long|number} val The number.
     * @returns {MongoDb.Long} The number.
     */
    static toLong(val) {
        return typeof val === "number" ? MongoDb.Long.fromNumber(val) : val;
    }

    //              #
    //              #
    //  ###   ##   ###
    // #  #  # ##   #
    //  ##   ##     #
    // #      ##     ##
    //  ###
    /**
     * Gets the database.
     * @returns {Promise<MongoDb.Db>} A promise that resolves with the database.
     */
    static async get() {
        if (!client) {
            client = new MongoDb.MongoClient(`mongodb://web_nnn:${process.env.WEB_NNN_PASSWORD}@db:27017/nnn`, {
                authMechanism: "SCRAM-SHA-256",
                authSource: "admin",
                promoteLongs: false
            });
        }

        await client.connect();

        if (!db) {
            db = client.db("nnn");
        }

        return db;
    }

    //  #       #
    //          #
    // ##     ###
    //  #    #  #
    //  #    #  #
    // ###    ###
    /**
     * Appends an ID to an object.
     * @param {object} object The object to append the ID to.
     * @param {string} collection The collection the ID belongs to.
     * @returns {Promise} A promise that resolves when the ID has been appended.
     */
    static async id(object, collection) {
        if (!db) {
            await Db.get();
        }

        object._id = MongoDb.Long.fromNumber((await db.collection("counters").findOneAndUpdate({_id: collection}, {$inc: {value: MongoDb.Long.fromNumber(1)}})).value.value + 1);
    }
}

module.exports = Db;
