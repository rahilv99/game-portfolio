import Phaser from "phaser";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  init(data) {
    // Receive data from main scene
    this.playerInventory = data.inventory || [];
    this.winCondition = data.winCondition || 'unknown'; // 'endPoint' or 'allChests'
    this.openedChests = data.openedChests || 0;
    
    // Timer data from main scene
    this.elapsedTimeSeconds = data.elapsedTimeSeconds || 0;
    
    this.coins = data.score;
    // Get death count from localStorage
    this.deathCount = data.deathCount || 0;
    
    this.score = data.score - (this.deathCount * 5) + (this.openedChests * 4) + Math.min(10, Math.max(0, 0.1 * (180 - this.elapsedTimeSeconds)));
    // Initialize leaderboard state
    this.leaderboardVisible = false;
    this.nameInputActive = false;
    this.playerName = '';
    this.leaderboardData = [];
    this.currentLeaderboardDisplay = null;
  }

  preload() {
    // Load any additional assets needed for the end scene
    // We can reuse existing assets from the main scene
  }

  create() {
    // Create a congratulations display
    const width = this.sys.game.config.width;
      const height = this.sys.game.config.height;
    
    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');
    
    // Main congratulations title
    const title = this.add.text(width / 2, height / 6, 'CONGRATULATIONS!', {
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      fill: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    title.setOrigin(0.5);
    
    // Win condition specific message
    let winMessage = '';
    if (this.winCondition === 'endPoint') {
      winMessage = 'You successfully reached the end of your adventure!';
    } else if (this.winCondition === 'allChests') {
      winMessage = 'Amazing! You collected all the treasure chests!';
    } else {
      winMessage = 'You completed the game!';
    }
    
    const winText = this.add.text(width / 2, height / 3, winMessage, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fill: '#ffffff',
      align: 'center',
      wordWrap: { width: width - 100 }
    });
    winText.setOrigin(0.5);
    
    // Format and display completion time
    const minutes = Math.floor(this.elapsedTimeSeconds / 60);
    const seconds = this.elapsedTimeSeconds % 60;
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const timeText = this.add.text(width / 2, height / 3 + 60, `⏱️ Completion Time: ${timeFormatted}`, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fill: '#00ff88',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    });
    timeText.setOrigin(0.5);
    
    // Initialize inventory variables
    this.currentInventoryDisplay = null;
    this.inventoryVisible = false;
    
    // Inventory Button
    const inventoryButton = this.add.rectangle(width / 2 - 120, height * 0.7, 180, 50, 0x9C27B0);
    inventoryButton.setInteractive({ useHandCursor: true });
    
    const inventoryText = this.add.text(width / 2 - 120, height * 0.7, '📜 INVENTORY', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fill: '#ffffff',
      fontStyle: 'bold'
    });
    inventoryText.setOrigin(0.5);
    
    // Leaderboard Button
    const leaderboardButton = this.add.rectangle(width / 2 + 120, height * 0.7, 180, 50, 0xFF9800);
    leaderboardButton.setInteractive({ useHandCursor: true });
    
    const leaderboardText = this.add.text(width / 2 + 120, height * 0.7, '🏆 LEADERBOARD', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fill: '#ffffff',
      fontStyle: 'bold'
    });
    leaderboardText.setOrigin(0.5);
    
    // Play Again Button
    const playAgainButton = this.add.rectangle(width / 2, height * 0.8, 200, 50, 0x4CAF50);
    playAgainButton.setInteractive({ useHandCursor: true });
    
    const playAgainText = this.add.text(width / 2, height * 0.8, 'PLAY AGAIN', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fill: '#ffffff',
      fontStyle: 'bold'
    });
    playAgainText.setOrigin(0.5);
    
    // Inventory Button hover effects
    inventoryButton.on('pointerover', () => {
      inventoryButton.setFillStyle(0xAD29C0);
      inventoryText.setScale(1.1);
    });
    
    inventoryButton.on('pointerout', () => {
      inventoryButton.setFillStyle(0x9C27B0);
      inventoryText.setScale(1);
    });
    
    inventoryButton.on('pointerdown', () => {
      if (!this.currentInventoryDisplay && !this.leaderboardVisible && !this.nameInputActive) {
        this.showInventory();
      }
    });
    
    // Leaderboard Button hover effects
    leaderboardButton.on('pointerover', () => {
      leaderboardButton.setFillStyle(0xFFB74D);
      leaderboardText.setScale(1.1);
    });
    
    leaderboardButton.on('pointerout', () => {
      leaderboardButton.setFillStyle(0xFF9800);
      leaderboardText.setScale(1);
    });
    
    leaderboardButton.on('pointerdown', () => {
      if (!this.leaderboardVisible && !this.currentInventoryDisplay && !this.nameInputActive) {
        this.showLeaderboard();
      }
    });
    
    // Play Again Button hover effects
    playAgainButton.on('pointerover', () => {
      playAgainButton.setFillStyle(0x45a049);
      playAgainText.setScale(1.1);
    });
    
    playAgainButton.on('pointerout', () => {
      playAgainButton.setFillStyle(0x4CAF50);
      playAgainText.setScale(1);
    });
    
    playAgainButton.on('pointerdown', () => {
      this.restartGame();
    });
    
    // Instructions
    const instructionText = this.add.text(width / 2, height * 0.9, 'Click buttons above or use keyboard shortcuts:\nR for inventory • L for leaderboard • SPACE to play again', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fill: '#888888',
      align: 'center'
    });
    instructionText.setOrigin(0.5);
    
    // Add some sparkle effects
    this.createSparkles();
    
    // Set up input to restart the game and show inventory
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.lKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    
    // Make instruction text blink
    this.tweens.add({
      targets: instructionText,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  showInventory() {
    // Sort inventory items by their number attribute in ascending order
    const sortedInventory = this.playerInventory.slice().sort((a, b) => a.number - b.number);
    
    if (sortedInventory.length === 0) {
      // Show message when inventory is empty
      const message = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 
        "No treasures collected this time.\nTry opening more chests in your next adventure!", {
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
    const title = this.add.text(screenWidth / 2, containerY - 15, "📜 YOUR COLLECTED TREASURES 📜", {
      fontSize: "24px",
      fill: "#F39C12",
      fontStyle: "bold",
      align: "center"
    });
    title.setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(3000);
    this.inventoryContainer.add(title);
    
    // Create instruction text
    const instructions = this.add.text(screenWidth / 2, containerY + containerHeight + 20, "↑/↓ Arrow Keys to scroll • R to close", {
      fontSize: "16px",
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
    this.inventoryVisible = true;
    
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
      this.inventoryVisible = false;
      
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

  // Leaderboard Methods
  async fetchLeaderboard() {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('name, score, coins, deaths, chests, time')
        .order('score', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  async savePlayerScore(name) {
    try {
      // Check if player already exists in leaderboard
      const { data: existing, error: fetchError } = await supabase
        .from('leaderboard')
        .select('id')
        .eq('name', name)
        .limit(1);

      if (fetchError) {
        console.error('Error checking existing player:', fetchError);
        return false;
      }

      if (existing && existing.length > 0) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('leaderboard')
          .update({
            score: this.score,
            coins: this.coins,
            deaths: this.deathCount,
            chests: this.openedChests,
            time: this.elapsedTimeSeconds
          })
          .eq('id', existing[0].id);

        if (updateError) {
          console.error('Error updating player score:', updateError);
          return false;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('leaderboard')
          .insert([
            {
              name: name,
              score: this.score,
              coins: this.coins,
              deaths: this.deathCount,
              chests: this.openedChests
            }
          ]);

        if (insertError) {
          console.error('Error saving player score:', insertError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving player score:', error);
      return false;
    }
  }

  async showLeaderboard() {
    if (this.leaderboardVisible) return;

    // Fetch latest leaderboard data
    this.leaderboardData = await this.fetchLeaderboard();
    
    const width = this.sys.game.config.width;
    const height = this.sys.game.config.height;
    
    // Create leaderboard container
    this.leaderboardContainer = this.add.group();
    
    // Background
    const background = this.add.rectangle(width / 2, height / 2, width - 100, height - 100, 0x2C3E50, 0.95);
    background.setScrollFactor(0).setDepth(4000);
    background.setStrokeStyle(3, 0x34495E);
    this.leaderboardContainer.add(background);
    
    // Title
    const title = this.add.text(width / 2, height / 2 - 200, '🏆 LEADERBOARD 🏆', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      fill: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    title.setOrigin(0.5).setScrollFactor(0).setDepth(4001);
    this.leaderboardContainer.add(title);

    // Column headers
    const headerY = height / 2 - 150;
    const headers = [
      { text: 'RANK', x: width / 2 - 200 },
      { text: 'NAME', x: width / 2 - 100 },
      { text: 'SCORE', x: width / 2 },
      { text: 'COINS', x: width / 2 + 80 },
      { text: 'DEATHS', x: width / 2 + 160 },
      { text: 'CHESTS', x: width / 2 + 240 }
    ];

    headers.forEach(header => {
      const headerText = this.add.text(header.x, headerY, header.text, {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        fill: '#BDC3C7',
        fontStyle: 'bold'
      });
      headerText.setOrigin(0.5).setScrollFactor(0).setDepth(4001);
      this.leaderboardContainer.add(headerText);
    });

    // Leaderboard entries
    this.leaderboardData.forEach((entry, index) => {
      const entryY = headerY + 40 + (index * 30);
      const rank = index + 1;
      
      // Rank with medal emoji for top 3
      let rankText = rank.toString();
      if (rank === 1) rankText = '🥇 1';
      else if (rank === 2) rankText = '🥈 2';
      else if (rank === 3) rankText = '🥉 3';

      const entryData = [
        { text: rankText, x: width / 2 - 200 },
        { text: entry.name, x: width / 2 - 100 },
        { text: entry.score.toString(), x: width / 2 },
        { text: entry.coins.toString(), x: width / 2 + 80 },
        { text: entry.deaths.toString(), x: width / 2 + 160 },
        { text: entry.chests.toString(), x: width / 2 + 240 }
      ];

      entryData.forEach(item => {
        const text = this.add.text(item.x, entryY, item.text, {
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          fill: rank <= 3 ? '#FFD700' : '#FFFFFF'
        });
        text.setOrigin(0.5).setScrollFactor(0).setDepth(4001);
        this.leaderboardContainer.add(text);
      });
    });

    // Player's current stats
    const currentStatsY = height / 2 + 50;
    const currentStatsTitle = this.add.text(width / 2, currentStatsY, 'Your Current Run:', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fill: '#F39C12',
      fontStyle: 'bold'
    });
    currentStatsTitle.setOrigin(0.5).setScrollFactor(0).setDepth(4001);
    this.leaderboardContainer.add(currentStatsTitle);

    const statsText = `Score: ${this.score} | Coins: ${this.coins} | Deaths: ${this.deathCount} | Chests: ${this.openedChests}`;
    const currentStats = this.add.text(width / 2, currentStatsY + 30, statsText, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      fill: '#FFFFFF'
    });
    currentStats.setOrigin(0.5).setScrollFactor(0).setDepth(4001);
    this.leaderboardContainer.add(currentStats);

    // Save score button
    const saveButton = this.add.rectangle(width / 2, currentStatsY + 80, 200, 40, 0x27AE60);
    saveButton.setInteractive({ useHandCursor: true });
    saveButton.setScrollFactor(0).setDepth(4001);
    
    const saveButtonText = this.add.text(width / 2, currentStatsY + 80, 'SAVE SCORE', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      fill: '#FFFFFF',
      fontStyle: 'bold'
    });
    saveButtonText.setOrigin(0.5).setScrollFactor(0).setDepth(4001);

    this.leaderboardContainer.add(saveButton);
    this.leaderboardContainer.add(saveButtonText);

    // Button interactions
    saveButton.on('pointerover', () => {
      saveButton.setFillStyle(0x2ECC71);
      saveButtonText.setScale(1.1);
    });

    saveButton.on('pointerout', () => {
      saveButton.setFillStyle(0x27AE60);
      saveButtonText.setScale(1);
    });

    saveButton.on('pointerdown', () => {
      this.showNameInput();
    });

    // Instructions
    const instructions = this.add.text(width / 2, height / 2 + 180, 'Press L to close leaderboard', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fill: '#888888',
      align: 'center'
    });
    instructions.setOrigin(0.5).setScrollFactor(0).setDepth(4001);
    this.leaderboardContainer.add(instructions);

    this.currentLeaderboardDisplay = this.leaderboardContainer;
    this.leaderboardVisible = true;
  }

  showNameInput() {
    // Create name input overlay
    const width = this.sys.game.config.width;
      const height = this.sys.game.config.height;
    
    this.nameInputContainer = this.add.group();
    
    // Semi-transparent overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setScrollFactor(0).setDepth(5000);
    this.nameInputContainer.add(overlay);

    // Input dialog background
    const dialogBg = this.add.rectangle(width / 2, height / 2, 400, 200, 0x34495E, 0.95);
    dialogBg.setScrollFactor(0).setDepth(5001);
    dialogBg.setStrokeStyle(3, 0x2C3E50);
    this.nameInputContainer.add(dialogBg);

    // Title
    const inputTitle = this.add.text(width / 2, height / 2 - 50, 'Enter Your Name:', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fill: '#FFFFFF',
      fontStyle: 'bold'
    });
    inputTitle.setOrigin(0.5).setScrollFactor(0).setDepth(5002);
    this.nameInputContainer.add(inputTitle);

    // Name display
    this.nameDisplay = this.add.text(width / 2, height / 2 - 10, this.playerName + '_', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fill: '#F39C12',
      backgroundColor: '#2C3E50',
      padding: { x: 10, y: 5 }
    });
    this.nameDisplay.setOrigin(0.5).setScrollFactor(0).setDepth(5002);
    this.nameInputContainer.add(this.nameDisplay);

    // Instructions
    const inputInstructions = this.add.text(width / 2, height / 2 + 30, 'Type your name and press ENTER to save\nPress ESC to cancel', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fill: '#BDC3C7',
      align: 'center'
    });
    inputInstructions.setOrigin(0.5).setScrollFactor(0).setDepth(5002);
    this.nameInputContainer.add(inputInstructions);

    this.nameInputActive = true;
    this.playerName = '';
    
    // Set up text input listeners
    this.setupNameInputControls();
  }

  setupNameInputControls() {
    // Add keyboard listener for text input
    this.input.keyboard.on('keydown', this.handleNameInput, this);
    
    // Store the handler for cleanup
    this.nameInputHandler = this.handleNameInput.bind(this);
  }

  handleNameInput(event) {
    if (!this.nameInputActive) return;

    if (event.key === 'Enter') {
      if (this.playerName.trim().length > 0) {
        this.submitPlayerScore();
      }
    } else if (event.key === 'Escape') {
      this.closeNameInput();
    } else if (event.key === 'Backspace') {
      this.playerName = this.playerName.slice(0, -1);
      this.updateNameDisplay();
    } else if (event.key.length === 1 && this.playerName.length < 15) {
      // Only allow alphanumeric and space characters
      if (/[a-zA-Z0-9 ]/.test(event.key)) {
        this.playerName += event.key;
        this.updateNameDisplay();
      }
    }
  }

  updateNameDisplay() {
    if (this.nameDisplay) {
      this.nameDisplay.setText(this.playerName + '_');
    }
  }

  async submitPlayerScore() {
    const success = await this.savePlayerScore(this.playerName.trim());
    
    if (success) {
      // Show success message
      const width = this.sys.game.config.width;
      const height = this.sys.game.config.height;
      const successMessage = this.add.text(width / 2, height / 2 + 100, 'Score saved successfully!', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        fill: '#2ECC71',
        fontStyle: 'bold'
      });
      successMessage.setOrigin(0.5).setScrollFactor(0).setDepth(5003);

      // Fade out success message
      this.tweens.add({
        targets: successMessage,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => {
          successMessage.destroy();
        }
      });

      // Refresh leaderboard
      this.closeNameInput();
      this.closeLeaderboard();
      this.showLeaderboard();
    } else {
      // Show error message
      const errorMessage = this.add.text(width / 2, height / 2 + 100, 'Failed to save score. Please try again.', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        fill: '#E74C3C',
        fontStyle: 'bold'
      });
      errorMessage.setOrigin(0.5).setScrollFactor(0).setDepth(5003);

      // Fade out error message
      this.tweens.add({
        targets: errorMessage,
        alpha: 0,
        duration: 3000,
        ease: 'Power2',
        onComplete: () => {
          errorMessage.destroy();
        }
      });
    }
  }

  closeNameInput() {
    if (this.nameInputContainer) {
      this.nameInputContainer.clear(true, true);
      this.nameInputContainer.destroy();
      this.nameInputContainer = null;
    }
    this.nameDisplay = null;

    this.nameInputActive = false;
    this.playerName = '';

    // Remove input listeners
    if (this.nameInputHandler) {
      this.input.keyboard.off('keydown', this.nameInputHandler);
    }
  }

  closeLeaderboard() {
    if (this.currentLeaderboardDisplay) {
      this.leaderboardContainer.clear(true, true);
      this.leaderboardContainer.destroy();
      this.currentLeaderboardDisplay = null;
      this.leaderboardVisible = false;
    }
  }
  
  restartGame() {
    // Reset game state and return to main scene
    localStorage.setItem('gameDeathCount', '0'); // Reset death count
    this.scene.start('MainScene');
  }

  createSparkles() {
    // Create some celebratory sparkle effects
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
      const y = Phaser.Math.Between(50, this.cameras.main.height - 50);
      
      const sparkle = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xffd700);
      sparkle.setAlpha(0);
      
      // Animate sparkles to fade in and out
      this.tweens.add({
        targets: sparkle,
        alpha: 1,
        duration: Phaser.Math.Between(500, 1500),
        delay: Phaser.Math.Between(0, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Make some sparkles move slightly
      if (Math.random() < 0.5) {
        this.tweens.add({
          targets: sparkle,
          y: y - 20,
          duration: Phaser.Math.Between(2000, 4000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }
  }
  
  update(time, delta) {
    // Check for input to show inventory
    if (Phaser.Input.Keyboard.JustDown(this.rKey) && !this.currentInventoryDisplay) {
      this.showInventory();
    }

    // Check for input to show/hide leaderboard
    if (Phaser.Input.Keyboard.JustDown(this.lKey)) {
      if (!this.leaderboardVisible && !this.currentInventoryDisplay && !this.nameInputActive) {
        this.showLeaderboard();
      } else if (this.leaderboardVisible && !this.nameInputActive) {
        this.closeLeaderboard();
      }
    }

    // Handle inventory scrolling when inventory is open
    if (this.currentInventoryDisplay) {
      this.updateInventoryScrolling(time, delta);
    }
  }
}
