import Coin from '../game/coin.js'
import Phaser from "../lib/phaser.js"


export default class Game extends Phaser.Scene
{
    coinCollected = 0

    /** @type {Phaser.Physics.Arcade.StaticGroup} */
    platforms
    /** @type {Phaser.Physics.Arcade.Sprite} */
    player
    /** @type {Phaser.Physics.Arcade.Group} */
    coins
    /** @type {Phaser.Types.Input.Keyboard.CursorKeys} */
    cursors
    /** @type {Phaser.GameObjects.Text} */
    coinCollectedText

    constructor()
    {
        super('game')
    }

    init()
    {
        this.coinCollected = 0
    }

    preload()
    {
        this.load.image('background', 'https://images.pexels.com/photos/3289880/pexels-photo-3289880.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')
        this.load.image('platform', 'assets/cloud_m.png')
        this.load.image('pikachu-stand', 'assets/pikachu_stand.png')
        this.load.image('pikachu-jump-left', 'assets/pikachu_jump_left.png')
        this.load.image('pikachu-jump-right', 'assets/pikachu_jump_right.png')
        this.load.image('coin', 'assets/coin.png')
        this.load.audio('jump-sound', 'assets/sound/jump_sound.mp3')

        this.cursors = this.input.keyboard.createCursorKeys()
    }

    create()
    {
        const background = this.add.image(240, 320, 'background')  // (240, 320) is the coordinate of the center point
        background.displayWidth = 480
        background.displayHeight = 640
        background.setScrollFactor(1, 0)

        // const platform = this.add.image(240, 320, 'platform')
        // platform.setScale(0.25)

        // this.physics.add.image(240, 320, 'platform')
        //     .setScale(0.25)
        
        // create multiple platforms from the group
        this.platforms = this.physics.add.staticGroup()
        for (let i = 0; i < 5; ++i)
        {
            const x = Phaser.Math.Between(80, 400)
            const y = 150 * i

            /** @type {Phaser.physics.Arcade.Sprite} */
            const platform = this.platforms.create(x, y, 'platform')
            platform.scale = 0.25

            /** @type {Phaser.physics.Arcade.StaticBody} */
            const body = platform.body
            body.updateFromGameObject()
        }

        // create multiple coins from the group
        this.coins = this.physics.add.group({
            classType: Coin
        })
        // this.coins.get(240, 320, 'coin')

        // create a sprite
        this.player = this.physics.add.sprite(240, 320, 'pikachu-stand').setScale(0.03)
        this.player.body.checkCollision.up = false
        this.player.body.checkCollision.left = false
        this.player.body.checkCollision.right = false

        // add colliders
        this.physics.add.collider(this.platforms, this.player)
        this.physics.add.collider(this.platforms, this.coins)

        this.physics.add.overlap(
            this.player,
            this.coins,
            this.handleCollectCoin,
            undefined,
            this
        )

        // set camera
        this.cameras.main.startFollow(this.player)
        this.cameras.main.setDeadzone(this.scale.width * 1.5)

        const style = {color: 'white', fontSize: 24}
        this.coinCollectedText = this.add.text(240, 10, 'Coins: 0', style)
            .setScrollFactor(0)
            .setOrigin(0.5, 0)
    }

    update()
    {
        // remove orphaned coins
        this.coins.children.iterate(chilld => {
            /** @type {Phaser.Physics.Arcade.Sprite} */
            const coin = chilld
            const scrollY = this.cameras.main.scrollY
            if (coin.y >= scrollY + 700)
            {
                this.removeCoin(coin)
            }
        })

        // platform reuse
        this.platforms.children.iterate(child => {
            /** @type {Phaser.Physics.Arcade.Sprite} */
            const platform = child
            const scrollY = this.cameras.main.scrollY
            if (platform.y >= scrollY + 700)
            {
                platform.y = scrollY - Phaser.Math.Between(50, 100)
                platform.body.updateFromGameObject()

                // create a coin above the platform being reused
                this.addCoinAbove(platform)
            }
        })

        // jump when thouching
        const touchingDown = this.player.body.touching.down
        if (touchingDown)
        {
            this.player.setVelocityY(-300)
            // this.setPlayerJump(1)
            this.sound.play('jump-sound')
        }

        // while falling or standing
        const velocityX = this.player.body.velocity.x
        const velocityY = this.player.body.velocity.y
        if (velocityY >= 0)
        {
            this.setPlayerStand()
        }
        else if (velocityX > 0)
        {
            this.setPlayerJump(1)
        }
        else if (velocityX < 0)
        {
            this.setPlayerJump(-1)
        }

        // left and right input logic
        if (this.cursors.left.isDown && !touchingDown)
        {
            this.player.setVelocityX(-200)
        }
        else if (this.cursors.right.isDown && !touchingDown)
        {
            this.player.setVelocityX(200)
            
        }
        else
        {
            // stop movement if not left or right
            this.player.setVelocityX(0)
        }

        this.horizontalWrap(this.player)

        const bottomPlatform = this.findBottomMostPlatform()
        if (this.player.y > bottomPlatform.y + 200)
        {
            this.scene.start('game-over')
        }
    }

    /**
     * adjust the player`s position when he runs out of the sight
     * @param {Phaser.GameObjects.Sprite} sprite 
     */
    horizontalWrap(sprite)
    {
        const halfWidth = sprite.displayWidth * 0.5
        const gameWidth = this.scale.width
        if (sprite.x < -halfWidth)
        {
            sprite.x = gameWidth + halfWidth
        }
        else if (sprite.x > gameWidth + halfWidth)
        {
            sprite.x = -halfWidth
        }
    }

    /**
     * 
     * @param {Phaser.GameObjects.Sprite} sprite 
     */
    addCoinAbove(sprite)
    {
        const y = sprite.y - sprite.displayHeight

        /** @type {Phaser.Physics.Arcade.Sprite} */
        const coin = this.coins.get(sprite.x, y, 'coin')
        coin.setActive(true)
        coin.setVisible(true)

        this.add.existing(coin)

        coin.body.setSize(coin.width, coin.height)
        this.physics.world.enable(coin)

        return coin
    }

    /**
     * 
     * @param {@Coin} coin 
     */
    removeCoin(coin) {
        // hide from display
        this.coins.killAndHide(coin)

        // disable from physics world
        this.physics.world.disableBody(coin.body)
    }

    /**
     * 
     * @param {Phaser.Physics.Arcade.Sprite} player 
     * @param {Coin} coin 
     */
    handleCollectCoin(player, coin)
    {
        this.removeCoin(coin)

        this.coinCollected++
        // const value = 'Coins: ' + this.coinCollected
        const value = `Coins: ${this.coinCollected}`
        this.coinCollectedText.text = value
    }

    findBottomMostPlatform()
    {
        const platforms = this.platforms.getChildren()
        let bottomPlatform = platforms[0]

        for (let i = 1; i < platforms.length; ++i)
        {
            const platform = platforms[i]

            if (platform.y < bottomPlatform.y)
            {
                continue
            }

            bottomPlatform = platform
        }

        return bottomPlatform
    }

    /**
     * 
     * @param {number} direction jump right if direction > 0, else left
     */
    setPlayerJump(direction)
    {
        if (direction > 0)
        {
            this.player.setTexture('pikachu-jump-right').setScale(0.10)
        }
        else
        {
            this.player.setTexture('pikachu-jump-left').setScale(0.10)
        }
    }

    setPlayerStand()
    {
        if (this.player.texture.key != 'pikachu-stand') {
            this.player.setTexture('pikachu-stand').setScale(0.03)
        }
    }
}