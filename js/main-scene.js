import Phaser from "phaser";
import Player from "./player.js";
import createRotatingPlatform from "./create-rotating-platform.js";

export default class MainScene extends Phaser.Scene {
  preload() {

    // load map and tileset

    this.load.tilemapTiledJSON('world', 'assets/tilemaps/world-vert.json');
    this.load.image('vertical', 'assets/tilesets/vertical.png');

    // load sprite images

    // Load chest
    this.load.spritesheet('chest', 'assets/spritesheets/chest/spritesheet.png', {
        frameWidth: 48,
        frameHeight: 36
    });
    
    // Load player spritesheets (each contains 8 frames)
    this.load.spritesheet('player-idle-left', 'assets/spritesheets/player/IDLE/idle_left.png', {
        frameWidth: 32,
        frameHeight: 32
    });
    this.load.spritesheet('player-idle-right', 'assets/spritesheets/player/IDLE/idle_right.png', {
        frameWidth: 96,
        frameHeight: 80
    });
    
    this.load.spritesheet('player-run-left', 'assets/spritesheets/player/RUN/run_left.png', {
        frameWidth: 96,
        frameHeight: 80
    });
    this.load.spritesheet('player-run-right', 'assets/spritesheets/player/RUN/run_right.png', {
        frameWidth: 96,
        frameHeight: 80
    });
  }

  create() {
    const map = this.make.tilemap({ key: "world" });
    const tileset = map.addTilesetImage('vertical', 'vertical');
    const groundlayer = map.createLayer('ground', tileset, 0, 0);
    
    // map.createLayer("Background", tileset, 0, 0);
    // map.createLayer("Foreground", tileset, 0, 0).setDepth(10);

    // Set colliding tiles before converting the layer to Matter bodies
    groundlayer.setCollisionByProperty({ obstacle: true });

    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped our collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(groundlayer);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const help = this.add.text(16, 16, "Arrows/WASD to move the player.", {
      fontSize: "18px",
      padding: { x: 10, y: 5 },
      backgroundColor: "#ffffff",
      fill: "#000000",
    });
    help.setScrollFactor(0).setDepth(1000);

    const debugGraphics = this.add.graphics().setAlpha(0.7);
    groundlayer.renderDebug(debugGraphics, {
      tileColor: null, // non-colliding tiles
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    });
  }
}
