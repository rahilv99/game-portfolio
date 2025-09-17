export default class Boulder {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.isReleased = false;
    this.proximityDistance = 350; // Distance at which boulder is released
    this.sprite = null;
    
    // Store original position for respawning if needed
    this.originalX = x;
    this.originalY = y;
    
    // Create the boulder sprite immediately so it's visible from the start
    this.createSprite();
  }
  
  createSprite() {
    // Create the boulder sprite with physics body, but make it static initially
    this.sprite = this.scene.matter.add.sprite(this.x, this.y, 'rock', null, {
      shape: 'circle',
      density: 0.01,
      frictionAir: 0.01,
      restitution: 0.3, // Some bounce
      friction: 0.8,
      isStatic: true // Make it static initially so it doesn't fall
    });
    
    // Scale the rock appropriately
    this.sprite.setScale(2);
    
    // Set collision category for lethal objects
    this.sprite.body.label = 'boulder';
    
    console.log(`Boulder created (static) at (${this.x}, ${this.y})`);
  }
  
  update(playerX, playerY) {
    // Check if player is within proximity distance and boulder hasn't been released yet
    if (!this.isReleased && this.sprite) {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, this.x, this.y);
      
      if (distance <= this.proximityDistance) {
        this.release();
      }
    }
  }
  
  release() {
    if (this.isReleased || !this.sprite) return;
    
    this.isReleased = true;
    
    // Store current position
    const currentX = this.sprite.x;
    const currentY = this.sprite.y;
    
    // Remove the static body and create a new dynamic one
    this.scene.matter.world.remove(this.sprite.body);
    this.sprite.destroy();
    
    // Create new dynamic boulder sprite at the same position
    this.sprite = this.scene.matter.add.sprite(currentX, currentY, 'rock', null, {
      shape: 'circle',
      density: 0.01,
      frictionAir: 0.01,
      restitution: 0.3, // Some bounce
      friction: 0.8,
      isStatic: false // Dynamic from the start
    });
    
    // Scale the rock appropriately
    this.sprite.setScale(2);
    
    // Set collision category for lethal objects
    this.sprite.body.label = 'boulder';
    
    // Add some initial downward velocity to make it fall faster
    this.sprite.setVelocityY(3);
    
    console.log(`Boulder released at (${currentX}, ${currentY})`);
  }
  
  destroy() {
    if (this.sprite && this.sprite.body) {
      this.scene.matter.world.remove(this.sprite.body);
    }
    if (this.sprite) {
      this.sprite.destroy();
    }
    this.sprite = null;
    this.isReleased = false;
  }
  
  // Method to respawn boulder (useful for game resets)
  respawn() {
    this.destroy();
    this.isReleased = false;
    // Reset position in case boulder moved
    this.x = this.originalX;
    this.y = this.originalY;
    // Recreate the static sprite
    this.createSprite();
  }
}
