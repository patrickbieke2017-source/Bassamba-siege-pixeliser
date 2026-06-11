// Bootstraps the game once the page has loaded.
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  Input.init(canvas);
  const game = new Game(canvas);
  window.game = game;
  game.start();
});
