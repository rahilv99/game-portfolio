export default class Coin {
  constructor(scene, x, y, coinType = 'gold') {
    this.scene = scene;
    this.coinType = coinType;
    this.isCollected = false;
    
    // Create the coin sprite with physics body (same pattern as player)
    this.sprite = scene.matter.add.sprite(x, y, `${coinType}-1`, null, {
      isSensor: true, // Coins should be collectible, not solid
      isStatic: true, // Coins don't move
      shape: 'circle'
    });
    this.sprite.setScale(0.07); // Make coins slightly smaller
    
    // Set up animations
    this.createAnimations();
    
    // Start the spinning animation
    this.sprite.play(`coin-${coinType}-spin`);

  }
  
  createAnimations() {
    const coinType = this.coinType;
    const animKey = `coin-${coinType}-spin`;
    
    // Only create the animation if it doesn't already exist
    if (!this.scene.anims.exists(animKey)) {
      // Create frames array from individual images
      const frames = [];
      for (let i = 1; i <= 30; i++) {
        frames.push({ key: `${coinType}-${i}` });
      }
      
      this.scene.anims.create({
        key: animKey,
        frames: frames,
        frameRate: 15,
        repeat: -1
      });
    }
  }
  
  collect() {
    if (this.isCollected) return;
    
    this.isCollected = true;
    
    // Add score or other game logic here
    this.destroy();
    console.log(`Collected ${this.coinType} coin!`);
  }
  
  destroy() {
    if (this.sprite && this.sprite.body) {
      this.scene.matter.world.remove(this.sprite.body);
    }
    if (this.sprite) {
      this.sprite.destroy();
    }
  }
}
