/**
 * @typedef {import("express").Request} Express.Request
 * @typedef {import("express").Response} Express.Response
 */

const Common = require("../includes/common"),
    ServerErrorView = require("../../public/views/500"),
    RouterBase = require("hot-router").RouterBase;

//   ###                                      #####
//  #   #                                     #
//  #       ###   # ##   #   #   ###   # ##   #      # ##   # ##    ###   # ##
//   ###   #   #  ##  #  #   #  #   #  ##  #  ####   ##  #  ##  #  #   #  ##  #
//      #  #####  #       # #   #####  #      #      #      #      #   #  #
//  #   #  #      #       # #   #      #      #      #      #      #   #  #
//   ###    ###   #        #     ###   #      #####  #      #       ###   #
/**
 * A class that represents the 500 page.
 */
class ServerError extends RouterBase {
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

        route.serverError = true;

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
     * @returns {void}
     */
    static get(req, res) {
        res.status(500).send(Common.page(
            "",
            {css: ["/css/error.css"]},
            ServerErrorView.get(),
            req
        ));
    }
}

module.exports = ServerError;