import Phaser from "phaser";
import Player from "./player.js";
import Chest from "./chest.js";
import createRotatingPlatform from "./create-rotating-platform.js";
import Coin from "./coin.js";
import Boulder from "./boulder.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  resetGameState() {
    // Close any open inventory displays
    if (this.currentInventoryDisplay) {
      this.closeInventory();
    }

    // Clean up any existing collision handlers
    if (this.unsubscribePlayerCollide) {
      this.unsubscribePlayerCollide();
      this.unsubscribePlayerCollide = null;
    }
    if (this.unsubscribeCoinCollide) {
      this.unsubscribeCoinCollide();
      this.unsubscribeCoinCollide = null;
    }
    if (this.unsubscribeCelebrate) {
      this.unsubscribeCelebrate();
      this.unsubscribeCelebrate = null;
    }

    // Clean up keyboard handlers
    if (this.inventoryCloseHandler) {
      this.input.keyboard.off('keydown-R', this.inventoryCloseHandler);
      this.inventoryCloseHandler = null;
    }

    // Clear any active tweens
    this.tweens.killAll();

    // Reset inventory state
    this.currentInventoryDisplay = null;
    this.inventoryContainer = null;
    this.inventoryScrollMask = null;
    this.inventoryItems = [];
    this.inventoryItemData = [];
    this.scrollUpIndicator = null;
    this.scrollDownIndicator = null;
    this.inventoryScrollY = 0;
    this.inventoryMaxScroll = 0;

    // Clean up input keys
    if (this.upKey) {
      this.input.keyboard.removeKey(this.upKey);
      this.upKey = null;
    }
    if (this.downKey) {
      this.input.keyboard.removeKey(this.downKey);
      this.downKey = null;
    }

    // Clear game object arrays
    this.chests = [];
    this.coins = [];
    this.boulders = [];

    // Reset camera
    this.cameras.main.setBackgroundColor(0x87CEEB); // Default sky blue
    this.cameras.main.stopFollow();

    // Clear any display texts that might persist
    if (this.scoreText) {
      this.scoreText.destroy();
      this.scoreText = null;
    }
    if (this.chestCountText) {
      this.chestCountText.destroy();
      this.chestCountText = null;
    }
    if (this.deathCountText) {
      this.deathCountText.destroy();
      this.deathCountText = null;
    }
    if (this.timerText) {
      this.timerText.destroy();
      this.timerText = null;
    }

    console.log("Game state reset completed");
  }

  preload() {

    // load map and tileset

    //this.load.tilemapTiledJSON("map", "../assets/tilemaps/level.json");
    // this.load.image(
    //   "kenney-tileset-64px-extruded",
    //   "../assets/tilesets/kenney-tileset-64px-extruded.png"
    // );

    this.load.tilemapTiledJSON('world', 'assets/tilemaps/world-vert.json');
    this.load.image('vertical', 'assets/tilesets/vertical.png');
    this.load.atlas("emoji", "assets/spritesheets/emojis/emoji.png", "assets/spritesheets/emojis/emoji.json");
    // load sprite images

    // Load chest
    this.load.spritesheet('chest', 'assets/spritesheets/chest/spritesheet.png', {
        frameWidth: 48,
        frameHeight: 36
    });
    
    // Load player spritesheets (each contains 8 frames)
    this.load.spritesheet('player-idle-left', 'assets/spritesheets/player/IDLE/idle_left.png', {
        frameWidth: 96,
        frameHeight: 80
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

    // Load wooden plank texture for rotating platforms
    this.load.image('wooden-plank', 'assets/images/wooden-plank.png');

    // Load rock texture for boulders
    this.load.image('rock', 'assets/images/Rock.png');

    // Load coin spritesheets
    this.load.spritesheet('coin-bronze', 'assets/spritesheets/coins/Bronze/Bronze_1.png', {
        frameWidth: 32,
        frameHeight: 32
    });
    this.load.spritesheet('coin-silver', 'assets/spritesheets/coins/Silver/Silver_1.png', {
        frameWidth: 32,
        frameHeight: 32
    });
    this.load.spritesheet('coin-gold', 'assets/spritesheets/coins/Gold/Gold_1.png', {
        frameWidth: 32,
        frameHeight: 32
    });
    
    // Load all coin frames for animations
    for (let i = 1; i <= 30; i++) {
      this.load.image(`bronze-${i}`, `assets/spritesheets/coins/Bronze/Bronze_${i}.png`);
      this.load.image(`silver-${i}`, `assets/spritesheets/coins/Silver/Silver_${i}.png`);
      this.load.image(`gold-${i}`, `assets/spritesheets/coins/Gold/Gold_${i}.png`);
    }

    this.load.image('mountains', 'assets/backgrounds/Mountains 4.png')
  }

  create() {
    // Reset all game state - this ensures complete reset when returning from end scene
    this.resetGameState();
    
    // Initialize timer - starts when the scene is created
    this.startTime = this.time.now;
    this.gameStartTime = Date.now(); // Also store actual timestamp for more precision

    // Initialize score tracking
    this.score = 0;
    this.coinValues = {
      'gold': 3,
      'silver': 2,
      'bronze': 1
    };
    this.chestCost = 3; // Cost to open a chest

    // Initialize inventory for collecting chest scripts
    this.inventory = [];
    
    // Initialize chest and death tracking
    this.totalChests = 0; // Will be set after creating chests
    this.openedChests = 0;
    
    // Get death count from localStorage (persists across game restarts)
    this.deathCount = parseInt(localStorage.getItem('gameDeathCount') || '0', 10);

    const map = this.make.tilemap({ key: "world" });
    const tileset = map.addTilesetImage("vertical");
    const groundLayer = map.createLayer("ground", tileset, 0, 0);

    // Set colliding tiles before converting the layer to Matter bodies
    groundLayer.setCollisionByProperty({ obstacle: true });

    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped our collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(groundLayer);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const spawnObj = map.findObject("objects", (obj) => obj && obj.name === "Spawn Point");
    if (!spawnObj || typeof spawnObj.x === 'undefined') {
      console.error("Could not find Spawn Point in tilemap");
      return;
    }
    // Store spawn position for respawning
    this.spawnX = spawnObj.x;
    this.spawnY = spawnObj.y - 50;
    
    this.player = new Player(this, this.spawnX, this.spawnY);

    // Create chest objects from tilemap
    this.chests = [];
    const chestObjects = map.getObjectLayer("chests");
    if (chestObjects) {
      chestObjects.objects.forEach((chestObj) => {
        if (chestObj.properties && chestObj.properties.find(p => p.name === "type" && p.value === "chest")) {
          const chest = new Chest(this, chestObj.x + chestObj.width / 2, chestObj.y + chestObj.height / 2);
          
          // Extract script and number properties from tilemap data
          if (chestObj.properties) {
            const scriptProp = chestObj.properties.find(p => p.name === "script");
            const numberProp = chestObj.properties.find(p => p.name === "number");
            
            if (scriptProp) {
              chest.script = scriptProp.value;
            }
            if (numberProp) {
              chest.number = parseInt(numberProp.value, 10);
            }
          }
          
          this.chests.push(chest);
        }
      });
    }
    
    // Set total chests count and count currently opened chests
    this.totalChests = this.chests.length;
    this.updateOpenedChestCount();

    // Create rotating platforms and boulders from objects in tilemap
    const objectsLayer = map.getObjectLayer("objects");
    this.boulders = [];
    if (objectsLayer) {
      objectsLayer.objects.forEach((obj) => {
        // Check if this object has a property with name="name" and value="Platform Point"
        if (obj.properties && obj.properties.find(p => p.name === "name" && p.value === "Platform Point")) {
          // Create rotating platform at this point
          createRotatingPlatform(this, obj.x, obj.y);
        }
        
        // Check if this object is a boulder spawn point
        if (obj.properties && obj.properties.find(p => p.name === "type" && p.value === "boulder")) {
          // Create boulder at this point
          const boulder = new Boulder(this, obj.x, obj.y);
          this.boulders.push(boulder);
          console.log(`Created boulder spawn point at (${obj.x}, ${obj.y})`);
        }
      });
    }

    this.coins = [];
    this.placeCoins(map);

    // Smoothly follow the player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);

    this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCollide,
      context: this,
    });

    // Set up coin collision detection
    this.unsubscribeCoinCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCoinCollide,
      context: this,
    });

    // Set up keyboard input for chest interaction
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.chestInteractionDistance = 100; // Distance threshold for chest interaction

    // Create a sensor at rectangle object created in Tiled (under the "Sensors" layer)
    const rect = map.findObject("objects", (obj) => obj && obj.name === "End Point");
    if (!rect || typeof rect.x === 'undefined') {
      console.error("Could not find End Point in tilemap");
      return;
    }
    const celebrateSensor = this.matter.add.rectangle(
      rect.x,
      rect.y,
      100,
      100,
      {
        isSensor: true, // It shouldn't physically interact with other bodies
        isStatic: true, // It shouldn't move
      }
    );
    this.unsubscribeCelebrate = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      objectB: celebrateSensor,
      callback: this.onPlayerWin,
      context: this,
    });

    const help = this.add.text(16, 16, "Arrows/WASD to move the player.\nPress E near chests to open/close them.\nPress R to read collected scripts.\nOpening chests costs 3 coins!", {
      fontSize: "18px",
      padding: { x: 10, y: 5 },
      backgroundColor: "#ffffff",
      fill: "#000000",
    });
    help.setScrollFactor(0).setDepth(1000);

    // Show welcome alert when player first enters the scene
    this.showWelcomeAlert();

    // Create score display
    this.scoreText = this.add.text(16, 100, "Coins: 0", {
      fontSize: "24px",
      padding: { x: 10, y: 5 },
      backgroundColor: "#000000",
      fill: "#FFD700", // Gold color for the score
      fontStyle: "bold"
    });
    this.scoreText.setScrollFactor(0).setDepth(1000);

    // Create chest counter display
    this.chestCountText = this.add.text(16, 140, `Chests: ${this.openedChests}/${this.totalChests}`, {
      fontSize: "20px",
      padding: { x: 10, y: 5 },
      backgroundColor: "#8B4513", // Brown color for chests
      fill: "#FFFFFF",
      fontStyle: "bold"
    });
    this.chestCountText.setScrollFactor(0).setDepth(1000);

    // Create death counter display
    const deathColor = "#4A4A4A";
    this.deathCountText = this.add.text(16, 180, `Deaths: ${this.deathCount}`, {
      fontSize: "20px",
      padding: { x: 10, y: 5 },
      backgroundColor: deathColor,
      fill: "#FFFFFF",
      fontStyle: "bold"
    });
    this.deathCountText.setScrollFactor(0).setDepth(1000);

    // Create timer display
    this.timerText = this.add.text(16, 220, "Time: 00:00", {
      fontSize: "20px",
      padding: { x: 10, y: 5 },
      backgroundColor: "#2E86C1", // Blue color for timer
      fill: "#FFFFFF",
      fontStyle: "bold"
    });
    this.timerText.setScrollFactor(0).setDepth(1000);
  }

  onPlayerCollide({ gameObjectB }) {
    // Handle tile collisions (existing functionality)
    if (gameObjectB instanceof Phaser.Tilemaps.Tile) {
      const tile = gameObjectB;

      // Check the tile property set in Tiled
      if (tile.properties.isLethal) {
        this.handlePlayerDeath("lethal tile");
      }
    }
    // Handle boulder collisions
    else if (gameObjectB && gameObjectB.body && gameObjectB.body.label === 'boulder') {
      this.handlePlayerDeath("boulder");
    }
  }

  handlePlayerDeath(cause) {
    // Unsubscribe from collision events so that this logic is run only once
    this.unsubscribePlayerCollide();

    // Increment death count and save to localStorage
    this.deathCount++;
    localStorage.setItem('gameDeathCount', this.deathCount.toString());


    this.player.freeze();
    const cam = this.cameras.main;
    cam.fade(250, 0, 0, 0);
    cam.once("camerafadeoutcomplete", () => {
      // Just respawn player at spawn point, keep everything else
      console.log(`Death ${this.deathCount} respawning player`);
      this.respawnPlayer();
    });
  }

  respawnPlayer() {
    // Destroy old player
    this.player.destroy();
    
    // Create new player at spawn position
    this.player = new Player(this, this.spawnX, this.spawnY);
    
    // Re-setup collision detection for the new player
    this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCollide,
      context: this,
    });

    this.unsubscribeCoinCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCoinCollide,
      context: this,
    });

    // Update camera to follow new player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);
    
    // Update death counter display
    this.updateDeathCountDisplay();
    
    // Fade camera back in
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update(time, delta) {
    // Update timer display
    this.updateTimerDisplay();

    // Find the closest chest within interaction distance
    let closestChest = null;
    let closestDistance = this.chestInteractionDistance;

    this.chests.forEach(chest => {
      const distance = Phaser.Math.Distance.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        chest.x,
        chest.y
      );

      if (distance <= closestDistance) {
        closestDistance = distance;
        closestChest = chest;
      }
    });

    // Check for E key press when near the closest chest
    if (closestChest && Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.handleChestInteraction(closestChest);
    }

    // Check for R key press to show inventory
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      this.showInventory();
    }

    // Handle inventory scrolling when inventory is open
    if (this.currentInventoryDisplay) {
      this.updateInventoryScrolling(time, delta);
    }

    // Update boulder proximity spawning
    if (this.boulders && this.player && this.player.sprite) {
      this.boulders.forEach(boulder => {
        boulder.update(this.player.sprite.x, this.player.sprite.y);
      });
    }
  }

  placeCoins(map) {
    const coinTypes = ['bronze', 'silver', 'gold'];
    const coinDensity = 0.20; // Probability of placing a coin in each potential spot within spawn regions
    
    // Get spawn and end points for distance checking
    const spawnPoint = map.findObject("objects", (obj) => obj && obj.name === "Spawn Point");
    const endPoint = map.findObject("objects", (obj) => obj && obj.name === "End Point");
    
    if (!spawnPoint || !endPoint || typeof spawnPoint.x === 'undefined' || typeof endPoint.x === 'undefined') {
      console.warn("Could not find valid spawn or end point for coin placement");
      return;
    }
    
    // Find all coin spawn regions in the objects layer
    const objectsLayer = map.getObjectLayer("objects");
    if (!objectsLayer) {
      console.warn("Could not find objects layer for coin placement");
      return;
    }
    
    const coinSpawnRegions = objectsLayer.objects.filter(obj => 
      obj.properties && obj.properties.find(p => p.name === "coin_spawn" && p.value === true)
    );
    
    if (coinSpawnRegions.length === 0) {
      console.warn("No coin spawn regions found");
      return;
    }
    
    // Place coins in each spawn region
    coinSpawnRegions.forEach(region => {
      // Calculate number of potential coin positions in this region
      // Place coins on a grid with some spacing (every 32 pixels)
      const coinSpacing = 32;
      const coinsPerRow = Math.floor(region.width / coinSpacing);
      const coinsPerCol = Math.floor(region.height / coinSpacing);
      
      for (let row = 0; row < coinsPerCol; row++) {
        for (let col = 0; col < coinsPerRow; col++) {
          // Random chance to place a coin at this position
          if (Math.random() < coinDensity) {
            // Calculate world position with some random offset for natural distribution
            const baseX = region.x + (col * coinSpacing) + (coinSpacing / 2);
            const baseY = region.y + (row * coinSpacing) + (coinSpacing / 2);
            
            // Add small random offset to make placement feel more natural
            const offsetX = (Math.random() - 0.5) * (coinSpacing * 0.4);
            const offsetY = (Math.random() - 0.5) * (coinSpacing * 0.4);
            
            const worldX = baseX + offsetX;
            const worldY = baseY + offsetY;
            
            // Ensure the coin is still within the region bounds
            if (worldX >= region.x && worldX <= region.x + region.width &&
                worldY >= region.y && worldY <= region.y + region.height) {
              
              const distanceFromSpawn = Phaser.Math.Distance.Between(worldX, worldY, spawnPoint.x, spawnPoint.y);
              const distanceFromEnd = Phaser.Math.Distance.Between(worldX, worldY, endPoint.x, endPoint.y);
              
              // Don't place coins too close to spawn or end points
              if (distanceFromSpawn > 100 && distanceFromEnd > 100) {
                // Randomly select coin type (gold is rarer)
                let coinType;
                const rand = Math.random();
                if (rand < 0.1) {
                  coinType = 'gold';
                } else if (rand < 0.4) {
                  coinType = 'silver';
                } else {
                  coinType = 'bronze';
                }
                
                try {
                  const coin = new Coin(this, worldX, worldY, coinType);
                  this.coins.push(coin);
                } catch (error) {
                  console.warn("Error creating coin:", error);
                }
              }
            }
          }
        }
      }
    });
    
    console.log(`Placed ${this.coins.length} coins in ${coinSpawnRegions.length} spawn regions`);
  }

  onPlayerCoinCollide({ gameObjectB }) {
    // Check if the collision is with a coin
    if (gameObjectB && gameObjectB.texture) {
      // Find the coin object that matches this sprite
      const coin = this.coins.find(c => c.sprite === gameObjectB);
      if (coin && !coin.isCollected) {
        this.onCoinCollect(coin);
      }
    }
  }

  updateScoreDisplay() {
    if (this.scoreText) {
      this.scoreText.setText(`Coins: ${this.score}`);
    }
  }

  onCoinCollect(coin) {
    // Add score based on coin type
    const points = this.coinValues[coin.coinType] || 0;
    this.score += points;
    
    // Update score display
    this.updateScoreDisplay();
        
    // Remove coin from the coins array
    const index = this.coins.indexOf(coin);
    if (index > -1) {
      this.coins.splice(index, 1);
    }
    
    // Collect the coin
    coin.collect();
  }

  updateOpenedChestCount() {
    this.openedChests = this.chests.filter(chest => chest.isOpened).length;
  }

  updateChestCountDisplay() {
    if (this.chestCountText) {
      this.chestCountText.setText(`Chests: ${this.openedChests}/${this.totalChests}`);
    }
  }

  updateDeathCountDisplay() {
    if (this.deathCountText) {
      this.deathCountText.setText(`Deaths: ${this.deathCount}`);
    }
  }

  updateTimerDisplay() {
    if (this.timerText && this.startTime !== undefined) {
      // Calculate elapsed time in seconds
      const currentTime = this.time.now;
      const elapsedMs = currentTime - this.startTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      
      // Format time as MM:SS
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      this.timerText.setText(`Time: ${formattedTime}`);
    }
  }

  handleChestInteraction(chest) {
    if (chest.isOpened) {
      // Chest is open, allow closing for free
      chest.close();
      this.updateOpenedChestCount();
      this.updateChestCountDisplay();
      console.log("Chest closed!");
    } else {
      // Chest is closed, check if player has enough coins to open
      if (this.score >= this.chestCost) {
        // Player has enough coins, deduct cost and open chest
        this.score -= this.chestCost;
        this.updateScoreDisplay();
        chest.open();
        
        // Add chest script to player inventory if it exists and hasn't been collected yet
        if (chest.script && !chest.scriptCollected) {
          this.inventory.push({
            script: chest.script,
            number: chest.number || 0
          });
          chest.scriptCollected = true;
          console.log(`Added script to inventory: "${chest.script}" (Number: ${chest.number})`);
        }
        
        this.updateOpenedChestCount();
        this.updateChestCountDisplay();
        console.log(`Chest opened! Cost: ${this.chestCost} coins (Remaining score: ${this.score})`);
        
        // Check if all chests are now opened
        this.checkAllChestsOpened();
      } else {
        // Not enough coins, show message
        this.showInsufficientFundsMessage();
        console.log(`Cannot open chest! Need ${this.chestCost} coins, but only have ${this.score}`);
      }
    }
  }

  showWelcomeAlert() {
    // Create a prominent welcome alert in the center of the screen
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    
    const alertText = "🗺️ WELCOME TO RAHIL'S ADVENTURE! 🗝️\n\nOpen chests to collect scripts!\n\nYou need 3 coins to open a chest.";
    
    // Create background overlay
    const overlay = this.add.rectangle(screenWidth / 2, screenHeight / 2, screenWidth, screenHeight, 0x000000, 0.7);
    overlay.setScrollFactor(0).setDepth(4000);
    
    // Create alert box
    const alertBox = this.add.rectangle(screenWidth / 2, screenHeight / 2, 500, 200, 0x2C3E50, 0.95);
    alertBox.setScrollFactor(0).setDepth(4010);
    alertBox.setStrokeStyle(4, 0xF39C12);
    
    // Create alert text
    const alert = this.add.text(screenWidth / 2, screenHeight / 2, alertText, {
      fontSize: "20px",
      padding: { x: 20, y: 15 },
      fill: "#FFFFFF",
      align: "center",
      fontStyle: "bold"
    });
    alert.setOrigin(0.5, 0.5);
    alert.setScrollFactor(0);
    alert.setDepth(4020);
    
    // Create instruction text
    const instruction = this.add.text(screenWidth / 2, screenHeight / 2 + 80, "Press any key to continue", {
      fontSize: "16px",
      fill: "#BDC3C7",
      align: "center",
      fontStyle: "italic"
    });
    instruction.setOrigin(0.5, 0.5);
    instruction.setScrollFactor(0);
    instruction.setDepth(4020);
    
    // Make instruction text blink
    this.tweens.add({
      targets: instruction,
      alpha: 0.3,
      duration: 800,
      ease: 'Power2',
      yoyo: true,
      repeat: -1
    });
    
    // Store references for cleanup
    const alertElements = [overlay, alertBox, alert, instruction];
    
    // Set up input handler to dismiss the alert
    const dismissAlert = () => {
      // Remove all alert elements
      alertElements.forEach(element => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      
      // Remove the input listener
      this.input.keyboard.off('keydown', dismissAlert);
    };
    
    // Listen for any key press to dismiss the alert
    this.input.keyboard.on('keydown', dismissAlert);
    
    // Auto-dismiss after 10 seconds if no input
    this.time.delayedCall(10000, dismissAlert);
  }

  showInsufficientFundsMessage() {
    // Create a temporary message that appears near the player
    const coinsNeeded = this.chestCost - this.score;
    const messageText = `Need ${coinsNeeded} more coins to open chest!\nCollect more coins and try again.`;
    
    const message = this.add.text(this.player.sprite.x, this.player.sprite.y - 100, messageText, {
      fontSize: "18px",
      padding: { x: 10, y: 5 },
      backgroundColor: "#FF0000",
      fill: "#FFFFFF",
      align: "center",
      fontStyle: "bold"
    });
    message.setOrigin(0.5, 0.5);
    message.setDepth(2000);

    // Make the message fade out after 3 seconds
    this.tweens.add({
      targets: message,
      alpha: 0,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => {
        message.destroy();
      }
    });
  }

  showInventory() {
    // Sort inventory items by their number attribute in ascending order
    const sortedInventory = this.inventory.slice().sort((a, b) => a.number - b.number);
    
    if (sortedInventory.length === 0) {
      // Show message when inventory is empty
      const message = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 
        "Inventory is empty!\nOpen chests to collect scripts.", {
        fontSize: "24px",
        padding: { x: 20, y: 20 },
        backgroundColor: "#4A4A4A",
        fill: "#FFFFFF",
        align: "center",
        fontStyle: "bold"
      });
      message.setOrigin(0.5, 0.5);
      message.setScrollFactor(0);
      message.setDepth(3000);

      // Make the message fade out after 3 seconds
      this.tweens.add({
        targets: message,
        alpha: 0,
        duration: 3000,
        ease: 'Power2',
        onComplete: () => {
          message.destroy();
        }
      });
      return;
    }
    
    this.createScrollableInventory(sortedInventory);
  }

  createScrollableInventory(sortedInventory) {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    
    // Container dimensions
    const containerWidth = Math.min(600, screenWidth - 80);
    const containerHeight = Math.min(400, screenHeight - 120);
    const containerX = screenWidth / 2 - containerWidth / 2;
    const containerY = screenHeight / 2 - containerHeight / 2;
    
    // Create main container group
    this.inventoryContainer = this.add.group();
    
    // Create background
    const background = this.add.rectangle(screenWidth / 2, screenHeight / 2, containerWidth + 20, containerHeight + 60, 0x2C3E50, 0.95);
    background.setScrollFactor(0).setDepth(2990);
    background.setStrokeStyle(3, 0x34495E);
    this.inventoryContainer.add(background);
    
    // Create title
    const title = this.add.text(screenWidth / 2, containerY - 15, "📜 COLLECTED SCRIPTS 📜", {
      fontSize: "24px",
      fill: "#F39C12",
      fontStyle: "bold",
      align: "center"
    });
    title.setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(3000);
    this.inventoryContainer.add(title);
    
    // Create instruction text
    const instructions = this.add.text(screenWidth / 2, containerY + containerHeight + 20, "↑/↓ Arrow Keys to scroll • R to close", {
      fontSize: "20px",
      fill: "#BDC3C7",
      fontStyle: "italic",
      align: "center"
    });
    instructions.setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(3000);
    this.inventoryContainer.add(instructions);
    
    // Create scroll container
    const scrollMask = this.make.graphics();
    scrollMask.fillRect(containerX, containerY, containerWidth, containerHeight);
    scrollMask.setScrollFactor(0);
    
    // Create scrollable content with dynamic sizing
    this.inventoryScrollY = 0;
    this.inventoryItems = [];
    this.inventoryItemData = []; // Store item positions and heights
    
    let currentY = containerY + 10; // Start position with padding
    let totalContentHeight = 0;
    
    // Create individual script items with dynamic sizing
    sortedInventory.forEach((item, index) => {
      // Create temporary text to measure actual dimensions
      const tempText = this.add.text(0, 0, item.script, {
        fontSize: "18px",
        fontStyle: "normal",
        wordWrap: { width: containerWidth - 100, useAdvancedWrap: true }
      });
      
      // Measure the wrapped text dimensions
      const textHeight = tempText.height;
      const textWidth = tempText.width;
      
      // Clean up temporary text
      tempText.destroy();
      
      // Calculate item height based on content (minimum 60px, with padding)
      const itemHeight = Math.max(60, textHeight + 30);
      const itemY = currentY + itemHeight / 2;
      
      // Create item background that fits content
      const itemBg = this.add.rectangle(screenWidth / 2, itemY, containerWidth - 20, itemHeight, 0x34495E, 0.8);
      itemBg.setScrollFactor(0).setDepth(2995);
      itemBg.setStrokeStyle(2, 0x7F8C8D);
      itemBg.setData('originalY', itemY); // Store original position
      
      // Create item number badge (positioned at top-left of item)
      const badgeY = currentY + 25;
      const numberBadge = this.add.circle(containerX + 30, badgeY, 15, 0xE74C3C);
      numberBadge.setScrollFactor(0).setDepth(3000);
      numberBadge.setStrokeStyle(2, 0xC0392B);
      numberBadge.setData('originalY', badgeY); // Store original position
      
      const numberText = this.add.text(containerX + 30, badgeY, item.number.toString(), {
        fontSize: "20px",
        fill: "#FFFFFF",
        fontStyle: "bold",
        align: "center"
      });
      numberText.setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(3001);
      numberText.setData('originalY', badgeY); // Store original position
      
      // Create script content positioned within the flexible container
      const textY = currentY + 15;
      const scriptText = this.add.text(containerX + 60, textY, item.script, {
        fontSize: "18px",
        fill: "#ECF0F1",
        fontStyle: "normal",
        align: "left",
        wordWrap: { width: containerWidth - 100, useAdvancedWrap: true }
      });
      scriptText.setOrigin(0, 0).setScrollFactor(0).setDepth(3000);
      scriptText.setData('originalY', textY); // Store original position
      
      // Store item data for scrolling calculations
      this.inventoryItemData.push({
        y: currentY,
        height: itemHeight,
        elements: [itemBg, numberBadge, numberText, scriptText]
      });
      
      // Store items for scrolling
      this.inventoryItems.push(itemBg, numberBadge, numberText, scriptText);
      this.inventoryContainer.add(itemBg);
      this.inventoryContainer.add(numberBadge);
      this.inventoryContainer.add(numberText);
      this.inventoryContainer.add(scriptText);
      
      // Move to next item position
      currentY += itemHeight + 10; // Add spacing between items
      totalContentHeight += itemHeight + 10;
    });
    
    // Calculate max scroll based on actual content height
    this.inventoryMaxScroll = Math.max(0, totalContentHeight - containerHeight + 20);
    
    // Apply mask to scrollable content
    this.inventoryItems.forEach(item => {
      if (item.type !== 'Rectangle' || item.fillColor !== 0x2C3E50) { // Don't mask the main background
        item.setMask(scrollMask.createGeometryMask());
      }
    });
    
    // Create scroll indicators if needed
    if (this.inventoryMaxScroll > 0) {
      this.scrollUpIndicator = this.add.text(screenWidth / 2, containerY - 5, "▲", {
        fontSize: "20px",
        fill: "#95A5A6",
        align: "center"
      });
      this.scrollUpIndicator.setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(3000);
      this.scrollUpIndicator.setAlpha(0.5);
      this.inventoryContainer.add(this.scrollUpIndicator);
      
      this.scrollDownIndicator = this.add.text(screenWidth / 2, containerY + containerHeight + 5, "▼", {
        fontSize: "20px",
        fill: "#95A5A6",
        align: "center"
      });
      this.scrollDownIndicator.setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(3000);
      this.scrollDownIndicator.setAlpha(1);
      this.inventoryContainer.add(this.scrollDownIndicator);
    }
    
    // Store reference for input handling
    this.currentInventoryDisplay = this.inventoryContainer;
    this.inventoryScrollMask = scrollMask;
    
    // Set up input listeners
    this.setupInventoryControls();
  }
  
  setupInventoryControls() {
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    
    // Set up a timer for continuous scrolling
    this.inventoryScrollTimer = 0;
    this.inventoryScrollDelay = 10; // milliseconds between scroll steps when holding key
    
    const closeInventoryHandler = () => {
      if (Phaser.Input.Keyboard.JustDown(this.rKey) && this.currentInventoryDisplay) {
        this.closeInventory();
      }
    };
    
    this.input.keyboard.on('keydown-R', closeInventoryHandler);
    
    // Store handlers for cleanup
    this.inventoryCloseHandler = closeInventoryHandler;
  }
  
  updateInventoryScroll() {
    // Move all items using the stored item data with dynamic heights
    this.inventoryItemData.forEach(itemData => {
      itemData.elements.forEach(element => {
        const originalY = element.getData('originalY');
        if (originalY !== undefined) {
          element.y = originalY - this.inventoryScrollY;
        }
      });
    });
    
    // Update scroll indicators
    if (this.scrollUpIndicator) {
      this.scrollUpIndicator.setAlpha(this.inventoryScrollY > 0 ? 1 : 0.3);
    }
    if (this.scrollDownIndicator) {
      this.scrollDownIndicator.setAlpha(this.inventoryScrollY < this.inventoryMaxScroll ? 1 : 0.3);
    }
  }
  
  updateInventoryScrolling(time, delta) {
    if (!this.currentInventoryDisplay || this.inventoryMaxScroll <= 0) return;
    
    const scrollSpeed = 5; // pixels per scroll step
    let scrollChanged = false;
    
    // Update scroll timer
    this.inventoryScrollTimer += delta;
    
    // Check if enough time has passed for the next scroll step
    if (this.inventoryScrollTimer >= this.inventoryScrollDelay) {
      if (this.upKey.isDown) {
        this.inventoryScrollY = Math.max(0, this.inventoryScrollY - scrollSpeed);
        scrollChanged = true;
      } else if (this.downKey.isDown) {
        this.inventoryScrollY = Math.min(this.inventoryMaxScroll, this.inventoryScrollY + scrollSpeed);
        scrollChanged = true;
      }
      
      // Reset timer for next scroll step
      if (scrollChanged) {
        this.inventoryScrollTimer = 0;
        this.updateInventoryScroll();
      }
    }
  }

  closeInventory() {
    if (this.currentInventoryDisplay) {
      // Clean up all inventory elements
      this.inventoryContainer.clear(true, true);
      this.inventoryContainer.destroy();
      
      if (this.inventoryScrollMask) {
        this.inventoryScrollMask.destroy();
        this.inventoryScrollMask = null;
      }
      
      // Clean up references
      this.currentInventoryDisplay = null;
      this.inventoryItems = [];
      this.scrollUpIndicator = null;
      this.scrollDownIndicator = null;
      
      // Remove input listeners
      this.input.keyboard.off('keydown-R', this.inventoryCloseHandler);
      
      // Clean up keys
      if (this.upKey) {
        this.input.keyboard.removeKey(this.upKey);
        this.upKey = null;
      }
      if (this.downKey) {
        this.input.keyboard.removeKey(this.downKey);
        this.downKey = null;
      }
    }
  }

  onPlayerWin() {

    // Drop some heart-eye emojis
    for (let i = 0; i < 35; i++) {
      const x = this.player.sprite.x + Phaser.Math.RND.integerInRange(-50, 50);
      const y = this.player.sprite.y - 150 + Phaser.Math.RND.integerInRange(-10, 10);
      this.matter.add
        .image(x, y, "emoji", "1f60d", {
          restitution: 1,
          friction: 0,
          density: 0.0001,
          shape: "circle",
        })
        .setScale(0.3);
    }

    this.time.delayedCall(100, () => {
      this.transitionToEndScene('endPoint');
    });
  }

  checkAllChestsOpened() {
    // Check if all chests are opened
    if (this.totalChests > 0 && this.openedChests >= this.totalChests) {
      // All chests opened! Trigger win condition
      this.transitionToEndScene('allChests');
    }
  }

  transitionToEndScene(winCondition) {
    // Calculate elapsed time in milliseconds and seconds
    const endTime = this.time.now;
    const elapsedTimeMs = endTime - this.startTime;
    const elapsedTimeSeconds = Math.floor(elapsedTimeMs / 1000);
    // Prepare data to pass to end scene
    const endSceneData = {
      inventory: this.inventory,
      score: this.score,
      winCondition: winCondition,
      openedChests: this.openedChests,
      deathCount: this.deathCount,
      elapsedTimeSeconds: elapsedTimeSeconds
    };

    // Freeze the player
    this.player.freeze();
    // Fade out camera and transition to end scene
    const cam = this.cameras.main;
    cam.fade(1000, 0, 0, 0);
    cam.once("camerafadeoutcomplete", () => {
      this.scene.start('EndScene', endSceneData);
    });
    
  }

}
