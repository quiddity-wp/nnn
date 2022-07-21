//  #        #           #             #   #    #
//  #                    #             #   #
//  #       ##    # ##   #   #   ###   #   #   ##     ###   #   #
//  #        #    ##  #  #  #   #       # #     #    #   #  #   #
//  #        #    #   #  ###     ###    # #     #    #####  # # #
//  #        #    #   #  #  #       #   # #     #    #      # # #
//  #####   ###   #   #  #   #  ####     #     ###    ###    # #
/**
 * A class that represents the links view.
 */
class LinksView {
    //              #
    //              #
    //  ###   ##   ###
    // #  #  # ##   #
    //  ##   ##     #
    // #      ##     ##
    //  ###
    /**
     * Gets the rendered page template.
     * @returns {string} An HTML string of the page.
     */
    static get() {
        return /* html */`
            <div id="link">
                <div class="section font-pixel-huge">Noita Nemesis by Soler91</div>
                <div>
                    Noita Together mod, includes Noita Nemesis: <a href="https://github.com/soler91/noita-together/releases" target="_blank">https://github.com/soler91/noita-together/releases</a><br />
                </div>
                <div class="section font-pixel-huge">Buy Noita</div>
                <div>
                    On Steam: <a href="https://store.steampowered.com/app/881100/Noita/" target="_blank">https://store.steampowered.com/app/881100/Noita/</a><br />
                    On GoG: <a href="https://www.gog.com/game/noita" target="_blank">https://www.gog.com/game/noita</a>
                </div>
                <div class="section font-pixel-huge">Official Sites</div>
                <div>
                    Noita Home Page: <a href="https://noitagame.com/" target="_blank">https://noitagame.com/</a><br />
                    Noita on Discord: <a href="https://discord.com/invite/SZtrP2r" target="_blank">https://discord.com/invite/SZtrP2r</a><br />
                    Nolla Games: <a href="https://nollagames.com/" target="_blank">https://nollagames.com/</a><br />
                    Nolla Games on Twitter: <a href="https://twitter.com/nollagames" target="_blank">https://twitter.com/nollagames</a><br />
                    Nolla Games on YouTube: <a href="https://www.youtube.com/channel/UCOW-sQkfqvRU0Yn0aB9pS7g" target="_blank">https://www.youtube.com/channel/UCOW-sQkfqvRU0Yn0aB9pS7g</a>
                </div>
                <div class="section font-pixel-huge">Fan Sites</div>
                <div>
                    Noita Wiki: <a href="https://noita.gamepedia.com/Noita_Wiki" target="_blank">https://noita.gamepedia.com/Noita_Wiki</a><br />
                    Noita Subreddit: <a href="https://www.reddit.com/r/noita/" target="_blank">https://www.reddit.com/r/noita/</a><br />
                </div>
            </div>
        `;
    }
}

if (typeof module !== "undefined") {
    module.exports = LinksView; // eslint-disable-line no-undef
}
