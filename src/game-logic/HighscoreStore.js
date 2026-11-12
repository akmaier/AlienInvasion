/**
 * HighscoreStore - the session highscore list (in memory, reset on new session).
 *
 * Each entry holds score, initials (up to three characters) and a timestamp.
 * The list keeps at most ten entries, sorted by score descending; ties are
 * ordered by timestamp ascending (earlier achievement ranks higher).
 */
export class HighscoreStore {
  constructor() {
    /** @type {Array<{score:number,initials:string,timestamp:number}>} */
    this.entries = [];
  }

  /**
   * Adds an entry and re-sorts/trims the list.
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
    this.entries.push(entry);
    this.entries.sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);
    this.entries = this.entries.slice(0, 10);
  }

  /** @returns {Array<{score:number,initials:string,timestamp:number}>} a copy of the entries */
  getEntries() {
    return this.entries.slice();
  }

  clear() {
    this.entries = [];
  }
}
