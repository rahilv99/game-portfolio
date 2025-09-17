export default class Boulder {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.isSpawned = false;
    this.proximityDistance = 200; // Distance at which boulder spawns
    this.sprite = null;
    
    // Store original position for respawning if needed
    this.originalX = x;
    this.originalY = y;
  }
  
  update(playerX, playerY) {
    // Check if player is within proximity distance and boulder hasn't been spawned yet
    if (!this.isSpawned) {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, this.x, this.y);
      
      if (distance <= this.proximityDistance) {
        this.spawn();
      }
    }
  }
  
  spawn() {
    if (this.isSpawned || this.sprite) return;
    
    this.isSpawned = true;
    
    // Create the boulder sprite with physics body
    this.sprite = this.scene.matter.add.sprite(this.x, this.y, 'rock', null, {
      shape: 'circle',
      density: 0.01,
      frictionAir: 0.01,
      restitution: 0.3, // Some bounce
      friction: 0.8
    });
    
    // Scale the rock appropriately
    this.sprite.setScale(2);
    
    // Set collision category for lethal objects
    this.sprite.body.label = 'boulder';
    
    // Add some initial downward velocity to make it fall faster
    this.sprite.setVelocityY(2);
    
    console.log(`Boulder spawned at (${this.x}, ${this.y})`);
  }
  
  destroy() {
    if (this.sprite && this.sprite.body) {
      this.scene.matter.world.remove(this.sprite.body);
    }
    if (this.sprite) {
      this.sprite.destroy();
    }
    this.sprite = null;
    this.isSpawned = false;
  }
  
  // Method to respawn boulder (useful for game resets)
  respawn() {
    this.destroy();
    this.isSpawned = false;
    // Reset position in case boulder moved
    this.x = this.originalX;
    this.y = this.originalY;
  }
}
