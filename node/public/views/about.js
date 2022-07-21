//    #    #                     #     #   #    #
//   # #   #                     #     #   #
//  #   #  # ##    ###   #   #  ####   #   #   ##     ###   #   #
//  #   #  ##  #  #   #  #   #   #      # #     #    #   #  #   #
//  #####  #   #  #   #  #   #   #      # #     #    #####  # # #
//  #   #  ##  #  #   #  #  ##   #  #   # #     #    #      # # #
//  #   #  # ##    ###    ## #    ##     #     ###    ###    # #
/**
 * A class that represents the about view.
 */
class AboutView {
    /**
     * Gets the rendered page template.
     * @returns {string} An HTML string of the page.
     */
    static get() {
        return /* html */`
            <div id="about">
                <div class="section font-pixel-huge">About the Noita Nemesis Nation</div>
                <div class="text">
                    The Noita Nemesis Nation is a community of players who compete in the game <a href="https://noitagame.com" target="_blank">Noita</a> by Nolla Games, a magical action roguelite set in a world where every pixel is physically simulated.  We use the mod Noita Nemesis, part of <a href="https://github.com/soler91/noita-together" target="_blank">Noita Together</a> by Soler91, a mod where players play on the same seed at the same time where the first player to get to the item gets the item and removes it from the other player's world.  To score a win in the Nation, you must be the last noita standing.<br /><br />
                    To play, join the Discord server (link is at the bottom of the page), where you may join the Nation.  For rules specific to the league, please see the Rules section on the Discord server.
                </div>
                <div class="section font-pixel-huge">Discord Bot Commands</div>
                <div class="text">
                    The following commands are available on the Discord server.  You may issue most commands in any channel, or in private messages to Ukko.  Don't worry, he won't try to kill you with millions of volts of electricity.
                </div>
                <div id="commands">
                    <div class="section font-pixel-huge">General Commands</div>

                    <div class="header font-pixel-huge">Command</div>
                    <div class="header font-pixel-huge">Description</div>
                    <div class="header font-pixel-huge">Examples</div>

                    <div class="command">!help</div>
                    <div>Get a link to this page.</div>
                    <div class="example">!help</div>

                    <div class="command">!version</div>
                    <div>Get the version of the bot.</div>
                    <div class="example">!version</div>

                    <div class="command">!website</div>
                    <div>Get a link to the website.</div>
                    <div class="example">!website</div>

                    <div class="command">!timezone [&lt;timezone>]</div>
                    <div>Changes your time zone.  See #timezone-faq on the Discord server for details.  Pass no parameters to clear your timezone.</div>
                    <div class="example">!timezone America/Los_Angeles<br />!timezone Europe/Berlin<br />!timezone</div>

                    <div class="command">!next [time]</div>
                    <div>List the upcoming scheduled matches and events.  Displays a countdown by default, use the "time" parameter to display times in your local time zone instead.</div>
                    <div class="example">!next<br />!next time</div>

                    <div class="command">!mynext [time]</div>
                    <div>List the upcoming scheduled matches for yourself.  Displays a countdown by default, use the "time" parameter to display times in your local time zone instead.</div>
                    <div class="example">!next<br />!mynext time</div>

                    <div class="command">!time &lt;challengeId></div>
                    <div>Gets the match time in your local time zone.</div>
                    <div class="example">!matchtime 12</div>

                    <div class="command">!countdown &lt;challengeId></div>
                    <div>Gets the amount of time until the match begins.</div>
                    <div class="example">!countdown 12</div>

                    <div class="command">!stats [&lt;player>]</div>
                    <div>Gets the current season stats for the player, or yourself if used without mentioning a player.</div>
                    <div class="example">!stats @Ukko<br />!stats</div>

                    <div class="command">!join</div>
                    <div>Join the Nation.  You will be able to immediately issue and receive challenges.</div>
                    <div class="example">!join</div>

                    <div class="command">!part</div>
                    <div>Leave the Nation.  You will no longer be able to issue and receive challenges.  You may still complete existing challenges.</div>
                    <div class="example">!part</div>

                    <div class="command">!challenge &lt;player></div>
                    <div>Challenges another player to a match.  Creates a challenge channel where you can communicate with your opponent privately.</div>
                    <div class="example">!challenge @Ukko</div>

                    <div class="section font-pixel-huge">Challenges Commands</div>

                    <div class="header font-pixel-huge">Command</div>
                    <div class="header font-pixel-huge">Description</div>
                    <div class="header font-pixel-huge">Examples</div>

                    <div class="command">!time</div>
                    <div>Gets the match time in your local time zone.</div>
                    <div class="example">!time</div>

                    <div class="command">!countdown</div>
                    <div>Gets the amount of time until the match begins.</div>
                    <div class="example">!countdown</div>

                    <div class="command">!suggesttime (&lt;date and time&gt;|<wbr />now)</div>
                    <div>Suggests a date and time for the challenge.  Uses your time zone.</div>
                    <div class="example">!suggesttime 3/14 3:00 PM<br />!suggesttime Mar 14 15:00<br />!suggesttime now</div>

                    <div class="command">!confirmtime</div>
                    <div>Confirms a match time suggestion from the other player.</div>
                    <div class="example">!confirmtime</div>

                    <div class="command">!report</div>
                    <div>Reports that you lost the game, indiciating your opponent won.</div>
                    <div class="example">!report</div>

                    <div class="command">!confirm</div>
                    <div>Confirms that you won the game.</div>
                    <div class="example">!confirm</div>

                    <div class="command">!comment &lt;comment&gt;</div>
                    <div>Leaves a comment on your match, visible on the website.</div>
                    <div class="example">!comment I built a homing mist wand!</div>

                    <div class="command">!rematch</div>
                    <div>Requests a rematch.  Both players must enter this command.  Once that happens, this will create a new challenge room with normal parameters, except the match time will be set to start immediately.</div>
                    <div class="example">!rematch</div>
                </div>
            </div>
        `;
    }
}

if (typeof module !== "undefined") {
    module.exports = AboutView; // eslint-disable-line no-undef
}
