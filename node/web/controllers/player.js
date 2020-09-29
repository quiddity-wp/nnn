/**
 * @typedef {import("express").Request} Express.Request
 * @typedef {import("express").Response} Express.Response
 */

const Common = require("../includes/common"),
    NotFoundView = require("../../public/views/404"),
    PlayerModel = require("../../src/models/player"),
    PlayerView = require("../../public/views/player"),
    Season = require("../../src/models/season");

//  ####    ##
//  #   #    #
//  #   #    #     ###   #   #   ###   # ##
//  ####     #        #  #   #  #   #  ##  #
//  #        #     ####  #  ##  #####  #
//  #        #    #   #   ## #  #      #
//  #       ###    ####      #   ###   #
//                       #   #
//                        ###
/**
 * A class that represents the player page.
 */
class Player {
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
            playerId = isNaN(Number.parseInt(req.params.id, 10)) ? 0 : Number.parseInt(req.params.id, 10),
            seasonList = await Season.getSeasonNumbers(),
            season = isNaN(Number.parseInt(querySeason, 10)) ? seasonList[seasonList.length - 1] : Number.parseInt(querySeason, 10);


        let career;
        if (playerId) {
            career = await PlayerModel.getCareer(playerId, season);
        }

        if (playerId && career && career.player) {
            res.status(200).send(Common.page(
                "",
                {css: ["/css/player.css"]},
                PlayerView.get({
                    career,
                    seasonList,
                    season
                }),
                req
            ));
        } else {
            res.status(404).send(Common.page(
                "",
                {css: ["/css/error.css"]},
                NotFoundView.get({message: "This player does not exist."}),
                req
            ));
        }
    }
}

Player.route = {
    path: "/player/:id/:name"
};

module.exports = Player;
