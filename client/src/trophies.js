/* Trophies and career stats - one list shared by the browser (display) and the server (which decides who has earned
 * them). Works in the browser (KiteTrophies) and in Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KiteTrophies = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const STAT_KEYS = ['cuts', 'lost', 'caught', 'matches', 'wins', 'bestStreak', 'dheelCuts', 'khainchCuts', 'nightWins', 'bigWins', 'made', 'flagWins'];
  const blankStats = () => Object.fromEntries(STAT_KEYS.map(k => [k, 0]));
  const TROPHIES = [
    { id: 'first', name: 'Pehli Kati', note: 'Cut your first kite.', test: s => s.cuts >= 1 },
    { id: 'hat', name: 'Hat-trick', note: 'Three cuts in a row.', test: s => s.bestStreak >= 3 },
    { id: 'khainch', name: 'Khainch Ustad', note: 'Cut 5 kites with a fast khainch.', test: s => s.khainchCuts >= 5 },
    { id: 'dheel', name: 'Dheel ka Badshah', note: 'Cut 5 kites while giving dheel.', test: s => s.dheelCuts >= 5 },
    { id: 'loot', name: 'Looter', note: 'Bring home 5 kites on your line.', test: s => s.caught >= 5 },
    { id: 'shikari', name: 'Shikari', note: 'Cut 50 kites.', test: s => s.cuts >= 50 },
    { id: 'win', name: 'Mela Jeeta', note: 'Win a festival.', test: s => s.wins >= 1 },
    { id: 'big', name: 'Basant ka Sultan', note: 'Win against 6 or more bots.', test: s => s.bigWins >= 1 },
    { id: 'night', name: 'Raat ka Raja', note: 'Win on Basant Night.', test: s => s.nightWins >= 1 },
    { id: 'maker', name: 'Kaarigar', note: 'Make a kite in the workshop.', test: s => s.made >= 1 },
    { id: 'jhanda', name: 'Jhanda Ooncha', note: 'Win a match flying a flag kite.', test: s => s.flagWins >= 1 }
  ];
  /** trophies newly earned by `stats` that are not in `have` */
  const earned = (stats, have) => TROPHIES.filter(t => !have.includes(t.id) && t.test(stats)).map(t => t.id);
  return { STAT_KEYS, TROPHIES, blankStats, earned };
});
