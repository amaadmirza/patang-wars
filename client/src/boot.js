/* Runs first, in <head>: apply the saved theme before anything paints (no dark flash in light mode). */
(function () {
  var t = 'dark';
  try { t = (JSON.parse(localStorage.getItem('kiteGame') || '{}').theme) || 'dark'; } catch (e) {}
  if (t === 'auto') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.dataset.theme = t;
})();
/* Your own songs (files you have the rights to), played as a playlist on the menu and in matches.
   Put them in assets/music/ and list them here, e.g. ['assets/music/basant1.mp3']. Empty = the game's own music. */
window.MUSIC_FILES = [];
