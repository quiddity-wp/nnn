/**
 * @typedef {import("express").Request} Express.Request
 * @typedef {import("express").Response} Express.Response
 */

const Challenge = require("../../src/models/challenge"),
    Common = require("../includes/common"),
    MatchesView = require("../../public/views/matches"),
    RouterBase = require("hot-router").RouterBase,
    Season = require("../../src/models/season");

//  #   #          #            #
//  #   #          #            #
//  ## ##   ###   ####    ###   # ##    ###    ###
//  # # #      #   #     #   #  ##  #  #   #  #
//  #   #   ####   #     #      #   #  #####   ###
//  #   #  #   #   #  #  #   #  #   #  #          #
//  #   #   ####    ##    ###   #   #   ###   ####
/**
 * A class that represents the matches page.
 */
class Matches extends RouterBase {
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

        route.path = "/matches";

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
        const querySeason = req.query.season && req.query.season.toString() || void 0,
            season = Number.parseInt(querySeason, 10) || void 0,
            seasonList = await Season.getSeasonNumbers(),
            {upcoming, totalCompleted} = await Challenge.getUpcomingAndCompletedCount(isNaN(season) ? seasonList[seasonList.length - 1] : season),
            completed = await Challenge.getMatchesBySeason(isNaN(season) ? seasonList[seasonList.length - 1] : season);

        res.status(200).send(await Common.page(
            "",
            {css: ["/css/matches.css"], js: ["/views/matches/match.js", "/js/matches.js"]},
            MatchesView.get({
                upcoming,
                completed,
                totalCompleted,
                matchesPerPage: Challenge.matchesPerPage,
                seasonList,
                season
            }),
            req
        ));
    }
}

module.exports = Matches;
