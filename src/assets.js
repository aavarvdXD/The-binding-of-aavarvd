// Sprite manifest and loader. Every image is a real file under assets/ (paths are relative to index.html,
// so they work from a GitHub Pages sub-path or custom domain).
// Keys are the short names used by renderer/ui code. i0..i9 are the Binding icons, in BD order (see bindings.js).
export const A = {
  dz: "assets/tiles/pixel_dungeon_tileset.png",
  pl: "assets/sprites/player_ninja_dark.png",
  skull: "assets/sprites/enemy_skull.png",
  octo: "assets/sprites/enemy_red_octopus.png",
  spirit: "assets/sprites/enemy_spirit.png",
  chest: "assets/sprites/enemy_mimic_chest.png",
  boss: "assets/sprites/boss_demon_cyclop_idle.png",
  bosshit: "assets/sprites/boss_demon_cyclop_hit.png",
  dun: "assets/tiles/ninja_dungeon_tileset.png",
  floor: "assets/tiles/ninja_floor_tileset.png",
  shur: "assets/sprites/projectile_shuriken.png",
  fire: "assets/sprites/projectile_fireball.png",
  energy: "assets/sprites/projectile_energy_ball.png",
  expl: "assets/sprites/fx_explosion.png",
  heart: "assets/icons/heart.png",
  i0: "assets/icons/binding_glass_engine.png",
  i1: "assets/icons/binding_echo_knot.png",
  i2: "assets/icons/binding_wrong_gravity.png",
  i3: "assets/icons/binding_twin_fracture.png",
  i4: "assets/icons/binding_hot_wire.png",
  i5: "assets/icons/binding_heavy_round.png",
  i6: "assets/icons/binding_pinball_law.png",
  i7: "assets/icons/binding_paper_aegis.png",
  i8: "assets/icons/binding_red_tithe.png",
  i9: "assets/icons/binding_bug_report.png",
};
export const FT = [176, 192]; // floor tile coordinates inside ninja_floor_tileset.png
export const IM = {};
export function loadAssets() {
  return Promise.all(
    Object.keys(A).map(
      (k) =>
        new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res();
          i.onerror = () => rej(new Error("Failed to load asset: " + A[k]));
          i.src = A[k];
          IM[k] = i;
        }),
    ),
  );
}
