// Test helper: a stand-in for the browser's document.cookie, for Node.
// Module: MOD-game-logic (its HighscoreStore reads and writes the highscore cookie).
//
// Reading `cookie` gives every stored cookie as "name=value; name2=value2", as a
// browser does; writing `cookie` stores one "name=value; attributes" pair, and
// a max-age of zero or less deletes it. Every written text is kept in `writes`.
export function createCookieJar() {
  const values = new Map();
  const writes = [];
  return {
    writes,
    get cookie() {
      return [...values].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    set cookie(text) {
      writes.push(String(text));
      const [pair, ...attributes] = String(text).split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const maxAge = attributes.map((a) => a.trim()).find((a) => /^max-age=/i.test(a));
      if (maxAge && Number(maxAge.split('=')[1]) <= 0) values.delete(name);
      else values.set(name, value);
    },
  };
}
