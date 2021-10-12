const compression = require("compression"),
    express = require("express"),
    HotRouter = require("hot-router"),
    Log = require("@roncli/node-application-insights-logger"),
    Minify = require("@roncli/node-minify"),
    path = require("path"),
    Redis = require("@roncli/node-redis"),
    tz = require("timezone-js"),
    tzdata = require("tzdata"),
    util = require("util"),

    Cache = Redis.Cache,

    Discord = require("./src/discord"),
    Exception = require("./src/errors/exception");

process.on("unhandledRejection", (reason) => {
    Log.error("Unhandled promise rejection caught.", {err: reason instanceof Error ? reason : new Error(util.inspect(reason))});
});

//         #                 #
//         #                 #
//  ###   ###    ###  ###   ###   #  #  ###
// ##      #    #  #  #  #   #    #  #  #  #
//   ##    #    # ##  #      #    #  #  #  #
// ###      ##   # #  #       ##   ###  ###
//                                      #
/**
 * Starts up the application.
 */
(async function startup() {
    // Setup application insights.
    if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY !== "") {
        Log.setupApplicationInsights(process.env.APPINSIGHTS_INSTRUMENTATIONKEY, {application: "nnn", container: "nnn-node"});
    }

    Log.info("Starting up...");

    // Set title.
    if (process.platform === "win32") {
        process.title = "Noita Nemesis Nation";
    } else {
        process.stdout.write("\x1b]2;Noita Nemesis Nation\x1b\x5c");
    }

    // Load timezones.
    tz.timezone.loadingScheme = tz.timezone.loadingSchemes.MANUAL_LOAD;
    tz.timezone.loadZoneDataFromObject(tzdata);

    // Startup Discord.
    Discord.startup();
    await Discord.connect();

    // Setup Redis.
    Redis.setup({
        host: "redis",
        port: +process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
    });
    Redis.eventEmitter.on("error", (err) => {
        Log.error(`Redis error: ${err.message}`, {err: err.err});
    });
    await Cache.flush();

    // Setup express app.
    const app = express();

    // Remove powered by.
    app.disable("x-powered-by");

    // Initialize middleware stack.
    app.use(compression());

    // Trust proxy to get correct IP from web server.
    app.enable("trust proxy");

    // Setup public redirects.
    app.use(/^(?!\/tsconfig\.json)/, express.static("public"));

    // Setup Discord redirect.
    app.get("/discord", (req, res) => {
        res.redirect(process.env.NNN_DISCORD_URL);
    });

    // Setup minification.
    Minify.setup({
        cssRoot: "/css/",
        jsRoot: "/js/",
        wwwRoot: path.join(__dirname, "public"),
        caching: process.env.MINIFY_CACHE ? {
            get: async (key) => {
                try {
                    return await Cache.get(key);
                } catch (err) {
                    Log.error("An error occurred while attempting to get a Minify cache.", {err, properties: {key}});
                    return void 0;
                }
            },
            set: (key, value) => {
                Cache.add(key, value, new Date(new Date().getTime() + 86400000)).catch((err) => {
                    Log.error("An error occurred while attempting to set a Minify cache.", {err, properties: {key}});
                });
            },
            prefix: process.env.REDIS_PREFIX
        } : void 0,
        disableTagCombining: !process.env.MINIFY_ENABLED
    });
    app.get("/css", Minify.cssHandler);
    app.get("/js", Minify.jsHandler);

    // Setup hot-router.
    const router = new HotRouter.Router();
    router.on("error", (data) => {
        if (data.err && data.err instanceof Exception) {
            Log.error(data.message, {err: data.err.innerError, req: data.req});
        } else {
            Log.error(data.message, {err: data.err, req: data.req});
        }
    });
    try {
        app.use("/", await router.getRouter(path.join(__dirname, "web"), {hot: false}));
    } catch (err) {
        Log.critical("Could not set up routes.", {err});
    }

    app.use((err, req, res, next) => {
        router.error(err, req, res, next);
    });

    // Startup web server.
    const port = process.env.PORT || 3030;

    app.listen(port);
    Log.info(`Server PID ${process.pid} listening on port ${port}.`);
}());
