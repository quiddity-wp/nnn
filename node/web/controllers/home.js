/**
 * @typedef {import("discord.js").TextChannel} DiscordJs.TextChannel
 * @typedef {import("express").Request} Express.Request
 * @typedef {import("express").Response} Express.Response
 */

const DiscordMarkdown = require("discord-markdown"),

    Cache = require("@roncli/node-redis").Cache,
    Common = require("../includes/common"),
    Discord = require("../../src/discord"),
    HomeView = require("../../public/views/home"),
    Log = require("@roncli/node-application-insights-logger"),
    Player = require("../../src/models/player"),
    RouterBase = require("hot-router").RouterBase;

//   #   #
//   #   #
//   #   #   ###   ## #    ###
//   #####  #   #  # # #  #   #
//   #   #  #   #  # # #  #####
//   #   #  #   #  # # #  #
//   #   #   ###   #   #   ###
/**
 * A class that represents the home page.
 */
class Home extends RouterBase {
    //                    #
    //                    #
    // ###    ##   #  #  ###    ##
    // #  #  #  #  #  #   #    # ##
    // #     #  #  #  #   #    ##
    // #      ##    ###    ##   ##
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/";

        return route;
    }

    //              #
    //              #
    //  ###   ##   ###
    // #  #  # ##   #
    //  ##   ##     #
    // #      ##     ##
    //  ###
    /**
     * Processes the request.
     * @param {Express.Request} req The request.
     * @param {Express.Response} res The response.
     * @returns {Promise} A promise that resolves when the request is complete.
     */
    static async get(req, res) {
        const standings = await Player.getSeasonStandings();

        /** @type {{displayName: string, createdTimestamp: Date, content: string}[]} */
        let news;
        try {
            news = await Cache.get(`${process.env.REDIS_PREFIX}:discord:news`);
        } catch (err) {
            Log.error("There was an error while getting the cache for Discord news.", {err});
            news = [];
        }

        if (!news || news.length === 0) {
            try {
                const discordNews = await /** @type {DiscordJs.TextChannel} */(Discord.findChannelByName("announcements")).messages.fetch({limit: 5}); // eslint-disable-line no-extra-parens

                news = discordNews.map((m) => ({
                    displayName: m.member.displayName,
                    createdTimestamp: new Date(m.createdTimestamp),
                    content: DiscordMarkdown.toHTML(m.content, {discordCallback: {user: (user) => `@${Discord.findGuildMemberById(user.id).displayName}`, channel: (channel) => `#${Discord.findChannelById(channel.id).name}`, role: (role) => `@${Discord.findRoleById(role.id).name}`, emoji: () => ""}})
                }));
            } catch (err) {
                Log.error("There was an error while retrieving the Discord news.", {err});
                news = [];
            }
        }

        if (news.length > 0) {
            Cache.add(`${process.env.REDIS_PREFIX}:discord:news`, news, new Date(new Date().getTime() + 300000)).catch((err) => {
                Log.error("There was an error while setting the cache for Discord news.", {err});
            });
        }

        res.status(200).send(Common.page(
            "",
            {css: ["/css/home.css"]},
            HomeView.get({
                standings,
                news
            }),
            req
        ));
    }
}

module.exports = Home;
