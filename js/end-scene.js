import Phaser from "phaser";

export default class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  init(data) {
    // Receive data from main scene
    this.playerInventory = data.inventory || [];
    this.finalScore = data.score || 0;
    this.winCondition = data.winCondition || 'unknown'; // 'endPoint' or 'allChests'
    this.totalChests = data.totalChests || 0;
    this.openedChests = data.openedChests || 0;
  }

  preload() {
    // Load any additional assets needed for the end scene
    // We can reuse existing assets from the main scene
  }

  create() {
    // Create a congratulations display
    const { width, height } = this.cameras.main;
    
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
    
    // Game completion paragraph
    const completionText = `Your journey has come to an end, brave adventurer! 
Through courage, skill, and determination, you have overcome all obstacles 
and proven yourself worthy of victory. The treasures you've discovered 
and the challenges you've conquered will be remembered forever.

Final Score: ${this.finalScore} coins
Chests Opened: ${this.openedChests}/${this.totalChests}`;
    
    const paragraph = this.add.text(width / 2, height / 2, completionText, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fill: '#e0e0e0',
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: width - 150 }
    });
    paragraph.setOrigin(0.5);
    
    // Inventory section
    if (this.playerInventory.length > 0) {
      const inventoryTitle = this.add.text(width / 2, height * 0.7, 'YOUR COLLECTED TREASURES:', {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        fill: '#ffd700',
        fontStyle: 'bold'
      });
      inventoryTitle.setOrigin(0.5);
      
      // Sort inventory by number
      const sortedInventory = this.playerInventory.slice().sort((a, b) => a.number - b.number);
      
      // Display inventory items
      let inventoryText = '';
      sortedInventory.forEach((item) => {
        inventoryText += `${item.number}. ${item.script}\n`;
      });
      
      const inventoryDisplay = this.add.text(width / 2, height * 0.8, inventoryText, {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        fill: '#ffffff',
        align: 'left',
        lineSpacing: 4,
        wordWrap: { width: width - 200 },
        backgroundColor: '#2c3e50',
        padding: { x: 15, y: 10 }
      });
      inventoryDisplay.setOrigin(0.5);
    } else {
      const noTreasureText = this.add.text(width / 2, height * 0.75, 'No treasures collected this time.\nTry opening more chests in your next adventure!', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        fill: '#cccccc',
        align: 'center',
        lineSpacing: 6
      });
      noTreasureText.setOrigin(0.5);
    }
    
    // Instructions to restart
    const restartText = this.add.text(width / 2, height * 0.92, 'Press SPACE or ENTER to return to the game', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      fill: '#888888',
      align: 'center'
    });
    restartText.setOrigin(0.5);
    
    // Add some sparkle effects
    this.createSparkles();
    
    // Set up input to restart the game
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    
    // Make restart text blink
    this.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
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
  
  update() {
    // Check for input to restart game
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || 
        Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      // Reset game state and return to main scene
      localStorage.setItem('gameDeathCount', '0'); // Reset death count
      this.scene.start('MainScene');
    }
  }
}
