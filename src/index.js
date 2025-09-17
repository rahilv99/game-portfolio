import Phaser from "phaser";
import PhaserMatterCollisionPlugin from "phaser-matter-collision-plugin";
import MainScene from "./main-scene.js";
import EndScene from "./end-scene.js";

const config = {
  type: Phaser.AUTO,
  width: 1000,
  height: 800,
  backgroundColor: "#000c1f",
  parent: "game-container",
  scene: [MainScene, EndScene],
  pixelArt: true,
  physics: { default: "matter" },
  plugins: {
    scene: [
      {
        plugin: PhaserMatterCollisionPlugin, // The plugin class
        key: "matterCollision", // Where to store in Scene.Systems, e.g. scene.sys.matterCollision
        mapping: "matterCollision" // Where to store in the Scene, e.g. scene.matterCollision
      }
    ]
  }
};

const game = new Phaser.Game(config);
