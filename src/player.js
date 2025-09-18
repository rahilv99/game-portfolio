import Phaser from "phaser";
import MultiKey from "./multi-key.js";

export default class Player {
  constructor(scene, x, y) {

    const anims = scene.anims;

    // Create player animations
    anims.create({
      key: 'player-idle-left',
      frames: anims.generateFrameNumbers('player-idle-left', { start: 0, end: 7 }),
      frameRate: 8,
      repeat: -1
    });

    anims.create({
      key: 'player-idle-right',
      frames: anims.generateFrameNumbers('player-idle-right', { start: 0, end: 7 }),
      frameRate: 8,
      repeat: -1
    });

    anims.create({
      key: 'player-run-left',
      frames: anims.generateFrameNumbers('player-run-left', { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1
    });

    anims.create({
      key: 'player-run-right',
      frames: anims.generateFrameNumbers('player-run-right', { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1
    });

    this.scene = scene;
    
    // Track which sensors are touching something
    this.isTouching = { left: false, right: false, ground: false };

    // Jumping is going to have a cooldown
    this.canJump = true;
    this.jumpCooldownTimer = null;
    this.forward = true;

    const { LEFT, RIGHT, UP, A, D, W, SPACE } = Phaser.Input.Keyboard.KeyCodes;
    this.leftInput = new MultiKey(scene, [LEFT, A]);
    this.rightInput = new MultiKey(scene, [RIGHT, D]);
    this.jumpInput = new MultiKey(scene, [UP, W, SPACE]);

    this.scene.events.on("update", this.update, this);
  
    // Create the physics-based sprite that we will move around and animate
    // Start with the idle-right animation as default
    this.sprite = scene.matter.add.sprite(0, 0, "player-idle-right", 0);

    const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
    const { width: w, height: h } = this.sprite;
    const mainBody = Bodies.rectangle(0, 0, w * 0.2, h*0.5, { chamfer: { radius: 10 } });
    this.sensors = {
      bottom: Bodies.rectangle(0, h * 0.25, w * 0.25, 4, { isSensor: true }),
      left: Bodies.rectangle(-w * 0.1, 0, 2, h * 0.25, { isSensor: true }),
      right: Bodies.rectangle(w * 0.1, 0, 2, h * 0.25, { isSensor: true }),
    };
    const compoundBody = Body.create({
      parts: [mainBody, this.sensors.bottom, this.sensors.left, this.sensors.right],
      frictionStatic: 0,
      frictionAir: 0.02,
      friction: 0.1,
      // The offset here allows us to control where the sprite is placed relative to the
      // matter body's x and y - here we want the sprite centered over the matter body.
      render: { sprite: { xOffset: 0.5, yOffset: 0.5 } },
    });
    this.sprite
      .setExistingBody(compoundBody)
      .setScale(2)
      .setFixedRotation() // Sets inertia to infinity so the player can't rotate
      .setPosition(x, y);

    // Start with idle-right animation
    this.sprite.play('player-idle-right');


    scene.matter.world.on("beforeupdate", this.resetTouching, this);

    // If a sensor just started colliding with something, or it continues to collide with something,
    // call onSensorCollide
    scene.matterCollision.addOnCollideStart({
      objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
      callback: this.onSensorCollide,
      context: this
    });
    scene.matterCollision.addOnCollideActive({
      objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
      callback: this.onSensorCollide,
      context: this
    });
  }

  onSensorCollide({ bodyA, bodyB, pair }) {
    // Watch for the player colliding with walls/objects on either side and the ground below, so
    // that we can use that logic inside of update to move the player.
    // Note: we are using the "pair.separation" here. That number tells us how much bodyA and bodyB
    // overlap. We want to teleport the sprite away from walls just enough so that the player won't
    // be able to press up against the wall and use friction to hang in midair. This formula leaves
    // 0.5px of overlap with the sensor so that the sensor will stay colliding on the next tick if
    // the player doesn't move.
    if (bodyB.isSensor) return; // We only care about collisions with physical objects
    
    
    if (bodyA === this.sensors.left) {
      this.isTouching.left = true;
      if (pair.separation > 0.5) this.sprite.x += pair.separation - 0.5;
    } else if (bodyA === this.sensors.right) {
      this.isTouching.right = true;
      if (pair.separation > 0.5) this.sprite.x -= pair.separation - 0.5;
    } else if (bodyA === this.sensors.bottom) {
      this.isTouching.ground = true;
    }
  }

  resetTouching() {
    this.isTouching.left = false;
    this.isTouching.right = false;
    this.isTouching.ground = false;
  }

  freeze() {
    this.sprite.setStatic(true);
  }

  update() {
    // Safety check: if the sprite or its body is destroyed, don't continue updating
    if (!this.sprite || !this.sprite.body) return;
    
    const sprite = this.sprite;
    const velocity = sprite.body.velocity;
    const isRightKeyDown = this.rightInput.isDown();
    const isLeftKeyDown = this.leftInput.isDown();
    const isJumpKeyDown = this.jumpInput.isDown();
    const isOnGround = this.isTouching.ground;
    const isInAir = !isOnGround;

    const moveForce = isOnGround ? 0.03: 0.01;

    if (isLeftKeyDown) {
      this.forward = false;

      sprite.applyForce({ x: -moveForce, y: 0 });
    } else if (isRightKeyDown) {
      this.forward = true;

      sprite.applyForce({ x: moveForce, y: 0 });
    }

    // Limit horizontal speed, without this the player's velocity would just keep increasing to
    // absurd speeds. We don't want to touch the vertical velocity though, so that we don't
    // interfere with gravity.
    if (velocity.x > 7) sprite.setVelocityX(7);
    else if (velocity.x < -7) sprite.setVelocityX(-7);

    // --- Move the player vertically ---

    if (isJumpKeyDown && this.canJump && isOnGround) {
      sprite.setVelocityY(-11);

      // Add a slight delay between jumps since the bottom sensor will still collide for a few
      // frames after a jump is initiated
      this.canJump = false;
      this.jumpCooldownTimer = this.scene.time.addEvent({
        delay: 250,
        callback: () => (this.canJump = true),
      });
    }

    // Update the animation/texture based on the player's state and direction
    if (sprite.body.force.x !== 0) {
      if (this.forward === false) {
        sprite.anims.play("player-run-left", true);
      } else {
        sprite.anims.play("player-run-right", true);
      }
    } else {
    if (this.forward === false) {
      sprite.anims.play("player-idle-left", true);
    } else {
      sprite.anims.play("player-idle-right", true);
    }
    }
  }

   destroy() {
    this.destroyed = true;

    // Event listeners
    this.scene.events.off("update", this.update, this);
    this.scene.events.off("shutdown", this.destroy, this);
    this.scene.events.off("destroy", this.destroy, this);
    if (this.scene.matter.world) {
      this.scene.matter.world.off("beforeupdate", this.resetTouching, this);
    }

    // Matter collision plugin
    const sensors = [this.sensors.bottom, this.sensors.left, this.sensors.right];
    this.scene.matterCollision.removeOnCollideStart({ objectA: sensors });
    this.scene.matterCollision.removeOnCollideActive({ objectA: sensors });

    // Destroy the sprite to make the player disappear
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }

    // Clear jump cooldown timer if it exists
    if (this.jumpCooldownTimer) {
      this.jumpCooldownTimer.destroy();
      this.jumpCooldownTimer = null;
    }
   }
}
