/**
 * HighscoreStore - the session highscore list, kept in memory and mirrored to
 * one browser cookie (ARC-005).
 *
 * Each entry holds score, initials (up to three characters) and a timestamp.
 * The list keeps at most ten entries, sorted by score descending; ties are
 * ordered by timestamp ascending (earlier achievement ranks higher).
 *
 * The store reads the list from the highscore cookie once, when it is created
 * (a page load), and writes the whole list there after every insertion, so the
 * list survives a new game session and a page reload (SESSION HIGHSCORE KEPT ON
 * NEW SESSION, KEPT ON RELOAD, COOKIE STORAGE). Nothing empties the list.
 *
 * Highscore cookie (format owned by MOD-game-logic): name
 * `alieninvasion_highscores`; value
 * `encodeURIComponent(JSON.stringify(entries))`; attributes
 * `max-age=34560000; path=/; SameSite=Lax`.
 */
const COOKIE_NAME = 'alieninvasion_highscores';
const COOKIE_ATTRIBUTES = 'max-age=34560000; path=/; SameSite=Lax';
const MAX_ENTRIES = 10;

function order(entries) {
  return entries
    .slice()
    .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
    .slice(0, MAX_ENTRIES);
}

function isEntry(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score) &&
    typeof value.initials === 'string' &&
    typeof value.timestamp === 'number' &&
    Number.isFinite(value.timestamp)
  );
}

/** @returns {Array} the stored list, or [] when there is none or it is unreadable */
function readCookie(cookieTarget) {
  try {
    const pair = String(cookieTarget.cookie || '')
      .split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith(`${COOKIE_NAME}=`));
    if (!pair) return [];
    const value = JSON.parse(decodeURIComponent(pair.slice(COOKIE_NAME.length + 1)));
    if (!Array.isArray(value)) return [];
    return value.filter(isEntry).map((e) =>
      Object.freeze({ score: e.score, initials: e.initials.slice(0, 3), timestamp: e.timestamp })
    );
  } catch {
    return [];
  }
}

export class HighscoreStore {
  #cookieTarget;

  /**
   * @param {{cookie: string}|undefined} [cookieTarget] - the object whose
   *   `cookie` property holds the highscore cookie; `document` by default.
   *   Without one (plain Node) the list is kept in memory only.
   */
  constructor(cookieTarget = globalThis.document) {
    this.#cookieTarget = cookieTarget && typeof cookieTarget === 'object' ? cookieTarget : null;
    /** @type {Array<{score:number,initials:string,timestamp:number}>} */
    this.entries = this.#cookieTarget ? order(readCookie(this.#cookieTarget)) : [];
  }

  /**
   * Adds an entry, re-sorts/trims the list and writes it to the cookie.
   * @param {number} score
   * @param {string} [initials]
   * @param {number} [timestamp] - defaults to Date.now()
   */
  addEntry(score, initials, timestamp = Date.now()) {
    const entry = Object.freeze({
      score: Number(score),
      initials: String(initials || 'AAA').slice(0, 3) || 'AAA',
      timestamp: Number(timestamp),
    });
    this.entries = order([...this.entries, entry]);
    this.#writeCookie();
  }

  /** @returns {Array<{score:number,initials:string,timestamp:number}>} a copy of the entries */
  getEntries() {
    return this.entries.slice();
  }

  #writeCookie() {
    if (!this.#cookieTarget) return;
    try {
      this.#cookieTarget.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(this.entries))}; ${COOKIE_ATTRIBUTES}`;
    } catch {
      // A document that refuses cookies keeps the list in memory only.
    }
  }
}
