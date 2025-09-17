import Phaser from "phaser";

export default class Chest extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'chest');
    
    this.scene = scene;
    this.scene.add.existing(this);
    
    // Set up physics body
    this.scene.matter.add.gameObject(this, {
      isSensor: true,
      isStatic: true
    });

    this.setDepth(10); // Make sure chests appear above ground
    this.isOpened = false;
    this.scriptCollected = false;

    // Initialize script content with placeholder if not set
    this.script = null;
    this.number = 0;

    // Create chest animations
    this.createAnimations();
    
    // Start with closed animation (frame 0)
    this.play('chest-closed');
    
    // Store reference for collision detection
    this.body.gameObject = this;
  }

  createAnimations() {
    // Only create animations if they don't exist yet
    if (!this.scene.anims.exists('chest-closed')) {
      this.scene.anims.create({
        key: 'chest-closed',
        frames: [{ key: 'chest', frame: 0 }],
        frameRate: 1,
        repeat: 0
      });
    }

    if (!this.scene.anims.exists('chest-opening')) {
      this.scene.anims.create({
        key: 'chest-opening',
        frames: this.scene.anims.generateFrameNumbers('chest', { start: 0, end: 4 }),
        frameRate: 8,
        repeat: 0
      });
    }

    if (!this.scene.anims.exists('chest-open')) {
      this.scene.anims.create({
        key: 'chest-open',
        frames: [{ key: 'chest', frame: 4 }],
        frameRate: 1,
        repeat: 0
      });
    }

    if (!this.scene.anims.exists('chest-closing')) {
      this.scene.anims.create({
        key: 'chest-closing',
        frames: this.scene.anims.generateFrameNumbers('chest', { start: 4, end: 0 }),
        frameRate: 8,
        repeat: 0
      });
    }
  }

  open() {
    if (!this.isOpened) {
      this.isOpened = true;
      this.play('chest-opening');
      
      // When opening animation completes, switch to open state
      this.on('animationcomplete-chest-opening', () => {
        this.play('chest-open');
      });
    }
  }

  close() {
    if (this.isOpened) {
      this.isOpened = false;
      this.play('chest-closing');
      
      // When closing animation completes, switch to closed state
      this.on('animationcomplete-chest-closing', () => {
        this.play('chest-closed');
      });
    }
  }

  toggle() {
    if (this.isOpened) {
      this.close();
    } else {
      this.open();
    }
  }

  destroy() {
    // Clean up event listeners
    this.off('animationcomplete-chest-opening');
    this.off('animationcomplete-chest-closing');
    super.destroy();
  }
}
