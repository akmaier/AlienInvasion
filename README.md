# Alien Invasion

Alien Invasion is a small arcade game built with JavaScript and HTML Canvas. Pilot a ship along the bottom of the screen and shoot rows of aliens as they move from side to side and descend toward you. Each alien destroyed earns one point. The game ends when you clear the formation or the invaders reach your ship.

**Alien Invasion is the first software created with agent-m.**

## Play online

Play Alien Invasion in your browser at <https://akmaier.github.io/AlienInvasion/>.

## Play locally

Clone the repository and serve its files with a static web server. For example, with Python 3 installed:

```sh
git clone https://github.com/akmaier/AlienInvasion.git
cd AlienInvasion
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000> in a modern desktop browser. There is no build step or application backend. Serving the files over HTTP lets the browser load the game's JavaScript modules.

## Controls

| Action | Keys |
| --- | --- |
| Select a ship or move left/right | Left/Right arrows or A/D |
| Confirm ship selection | Enter or Space |
| Fire | Space (one shot per press) |
| Show or hide session highscores during play | H |
| Submit initials after a game | Enter |
| Return to ship selection after submitting initials | Enter or Space |

Choose the **regular ship** for standard movement and shots, or the **slow ship** for slower movement and a special projectile that can destroy up to three aliens.

After a game, enter up to three initials to record your score. The session keeps the ten highest scores, including initials and timestamps. Scores survive restarting a game but reset when the page is reloaded.

## Tests

With Node.js 22 or newer and Python 3 installed, run the existing test suites from the repository directory:

```sh
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
```

## License

Alien Invasion is licensed under the [MIT License](LICENSE).
