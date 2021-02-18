const Log = require("node-application-insights-logger"),
    IoRedis = require("ioredis");

//  ####              #    #
//  #   #             #
//  #   #   ###    ## #   ##     ###
//  ####   #   #  #  ##    #    #
//  # #    #####  #   #    #     ###
//  #  #   #      #  ##    #        #
//  #   #   ###    ## #   ###   ####
/**
 * A class that handles calls to Redis.
 */
class Redis {
    // ##                 #
    //  #
    //  #     ##    ###  ##    ###
    //  #    #  #  #  #   #    #  #
    //  #    #  #   ##    #    #  #
    // ###    ##   #     ###   #  #
    //              ###
    /**
     * Logs in to the Redis server, and returns the client.
     * @returns {Promise<IoRedis.Redis>} The Redis client.
     */
    static async login() {
        /** @type {IoRedis.Redis} */
        let client;

        try {
            const newClient = new IoRedis({
                host: "redis",
                port: +process.env.REDIS_PORT,
                password: process.env.REDIS_PASSWORD
            });
            client = newClient;
        } catch (err) {
            Log.error("A Redis error occurred while logging in.", {err});

            client.removeAllListeners();
            if (client) {
                await client.quit();
            }
            client = void 0;

            return void 0;
        }

        client.on("error", async (err) => {
            Log.error("A Redis error occurred.", {err});

            client.removeAllListeners();
            if (client) {
                await client.quit();
            }
            client = void 0;
        });

        return client;
    }
}

module.exports = Redis;
