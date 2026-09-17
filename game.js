// GBA 16-bit Weapons Config
const WEAPONS = {
    DAGGER: { name: 'DAGGER', color: '#e74c3c', speed: 6, damage: 20, size: 3, cooldown: 180 },
    GUN: { name: 'HANDGUN', color: '#f1c40f', speed: 8, damage: 35, size: 3, cooldown: 300 },
    SPEAR: { name: 'SPEAR', color: '#3498db', speed: 5, damage: 65, size: 5, cooldown: 550 },
    BOW: { name: 'BOW', color: '#2ecc71', speed: 7, damage: 45, size: 3, cooldown: 400 },
    AXE: { name: 'AXE', color: '#e67e22', speed: 4, damage: 85, size: 6, cooldown: 700 },
    BONE: { name: 'BONE', color: '#ecf0f1', speed: 5.5, damage: 50, size: 4, cooldown: 350 }
};

let canvas, ctx;
let player;
let monsters = [];
let bullets = [];
let keys = {};
let mousePos = { x: 0, y: 0 };
let lastShotTime = 0;
let killsCount = 0;
let joystickVector = { x: 0, y: 0 };

function selectCharacter(gender) {
    document.getElementById('character-select').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    let speed = 2.0, color = '#1565c0', name = 'BOY';
    if (gender === 'female') { speed = 2.6; color = '#ad1457'; name = 'GIRL'; }
    else if (gender === 'old') { speed = 1.6; color = '#424242'; name = 'ELDER'; }

    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 16,
        height: 16,
        speed: speed,
        color: color,
        name: name,
        hp: 100,
        maxHp: 100,
        level: 1,
        exp: 0,
        maxExp: 100,
        skillPoints: 0,
        bonusDamage: 0,
        weapon: WEAPONS.DAGGER
    };

    updateUI();
    initEventListeners();
    setupTouchControls();

    setInterval(spawnMonster, 1400);
    requestAnimationFrame(gameLoop);
}

function initEventListeners() {
    window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', e => {
        if (e.button === 0) shoot();
    });
}

function setupTouchControls() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    const attackBtn = document.getElementById('attack-btn');

    let activeTouchId = null;

    zone.addEventListener('touchstart', e => {
        const touch = e.changedTouches[0];
        activeTouchId = touch.identifier;
        updateJoystick(touch);
    });

    zone.addEventListener('touchmove', e => {
        for (let t of e.changedTouches) {
            if (t.identifier === activeTouchId) updateJoystick(t);
        }
    });

    const resetJoystick = () => {
        knob.style.top = '23px';
        knob.style.left = '23px';
        joystickVector = { x: 0, y: 0 };
    };

    zone.addEventListener('touchend', resetJoystick);
    zone.addEventListener('touchcancel', resetJoystick);

    function updateJoystick(touch) {
        const rect = zone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const maxDist = 28;

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        knob.style.left = `${23 + dx}px`;
        knob.style.top = `${23 + dy}px`;
        joystickVector = { x: dx / maxDist, y: dy / maxDist };
    }

    attackBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        if (monsters.length > 0) {
            let nearest = monsters[0];
            let minDist = Math.hypot(monsters[0].x - player.x, monsters[0].y - player.y);
            for (let m of monsters) {
                let d = Math.hypot(m.x - player.x, m.y - player.y);
                if (d < minDist) { minDist = d; nearest = m; }
            }
            mousePos = { x: nearest.x, y: nearest.y };
        }
        shoot();
    });
}

function updateUI() {
    document.getElementById('ui-char-name').innerText = player.name;
    document.getElementById('ui-hp').innerText = Math.max(0, Math.floor(player.hp));
    document.getElementById('ui-max-hp').innerText = player.maxHp;
    document.getElementById('ui-level').innerText = player.level;
    document.getElementById('ui-exp').innerText = player.exp;
    document.getElementById('ui-max-exp').innerText = player.maxExp;
    document.getElementById('ui-weapon').innerText = player.weapon.name;

    const skillMenu = document.getElementById('skill-menu');
    if (player.skillPoints > 0) skillMenu.classList.remove('hidden');
    else skillMenu.classList.add('hidden');
}

function upgradeSkill(type) {
    if (player.skillPoints <= 0) return;
    if (type === 'dmg') player.bonusDamage += 10;
    if (type === 'spd') player.speed += 0.4;
    if (type === 'hp') { player.maxHp += 25; player.hp += 25; }
    player.skillPoints--;
    updateUI();
}

function shoot() {
    const now = Date.now();
    if (now - lastShotTime < player.weapon.cooldown) return;
    lastShotTime = now;

    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    bullets.push({
        x: player.x,
        y: player.y,
        dx: Math.cos(angle) * player.weapon.speed,
        dy: Math.sin(angle) * player.weapon.speed,
        damage: player.weapon.damage + player.bonusDamage,
        color: player.weapon.color,
        size: player.weapon.size
    });
}

function spawnMonster() {
    if (monsters.length >= 10) return;

    let x = Math.random() < 0.5 ? -16 : canvas.width + 16;
    let y = Math.random() * canvas.height;

    monsters.push({
        x: x,
        y: y,
        hp: 35 + (player.level * 10),
        maxHp: 35 + (player.level * 10),
        speed: 0.8 + Math.random() * 0.6,
        size: 16,
        color: '#7b1fa2'
    });
}

function dropRandomWeapon() {
    const keys = Object.keys(WEAPONS);
    player.weapon = WEAPONS[keys[Math.floor(Math.random() * keys.length)]];
    updateUI();
}

function addExp(amount) {
    player.exp += amount;
    if (player.exp >= player.maxExp) {
        player.level++;
        player.exp -= player.maxExp;
        player.maxExp = Math.floor(player.maxExp * 1.4);
        player.skillPoints++;
    }
    updateUI();
}

function update() {
    let moveX = 0, moveY = 0;
    if (keys['w'] || keys['arrowup']) moveY -= 1;
    if (keys['s'] || keys['arrowdown']) moveY += 1;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;

    if (joystickVector.x !== 0 || joystickVector.y !== 0) {
        moveX = joystickVector.x;
        moveY = joystickVector.y;
    }

    player.x += moveX * player.speed;
    player.y += moveY * player.speed;

    player.x = Math.max(8, Math.min(canvas.width - 8, player.x));
    player.y = Math.max(8, Math.min(canvas.height - 8, player.y));

    // Bullets Update
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.dx;
        b.y += b.dy;
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }

    // Monsters Update
    for (let mIndex = monsters.length - 1; mIndex >= 0; mIndex--) {
        let m = monsters[mIndex];
        const angle = Math.atan2(player.y - m.y, player.x - m.x);
        m.x += Math.cos(angle) * m.speed;
        m.y += Math.sin(angle) * m.speed;

        // Player Collision
        if (Math.hypot(player.x - m.x, player.y - m.y) < 12) {
            player.hp -= 0.25;
            updateUI();
            if (player.hp <= 0) { gameOver(); return; }
        }

        // Bullet Collision
        for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
            let b = bullets[bIndex];
            if (Math.hypot(b.x - m.x, b.y - m.y) < m.size / 2 + b.size) {
                m.hp -= b.damage;
                bullets.splice(bIndex, 1);

                if (m.hp <= 0) {
                    monsters.splice(mIndex, 1);
                    killsCount++;
                    addExp(30);
                    if (Math.random() < 0.35) dropRandomWeapon();
                    break;
                }
            }
        }
    }
}

// Draw GBA Tilemap Floor
function drawTileMap() {
    const tileSize = 32;
    for (let x = 0; x < canvas.width; x += tileSize) {
        for (let y = 0; y < canvas.height; y += tileSize) {
            ctx.fillStyle = ((x / tileSize + y / tileSize) % 2 === 0) ? '#43a047' : '#388e3c';
            ctx.fillRect(x, y, tileSize, tileSize);
            
            // Draw pixel grass dots
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(x + 8, y + 8, 2, 2);
            ctx.fillRect(x + 20, y + 18, 2, 2);
        }
    }
}

// Pixel Art Rendering Helpers
function drawPixelSprite(x, y, color, type) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 6, y - 6, 12, 12); // Body
    ctx.fillStyle = '#ffcc80';
    ctx.fillRect(x - 4, y - 8, 8, 5);  // Head
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 2, y - 6, 2, 2);  // Eye L
    ctx.fillRect(x + 2, y - 6, 2, 2);  // Eye R
}

function drawPixelMonster(x, y) {
    ctx.fillStyle = '#4a148c';
    ctx.fillRect(x - 7, y - 7, 14, 14);
    ctx.fillStyle = '#ab47bc';
    ctx.fillRect(x - 5, y - 5, 10, 10);
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(x - 3, y - 3, 2, 3); // Red Eyes
    ctx.fillRect(x + 1, y - 3, 2, 3);
}

function drawLighting() {
    ctx.fillStyle = 'rgba(10, 15, 25, 0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lightRadius = 110;
    const gradient = ctx.createRadialGradient(
        player.x, player.y, 5,
        player.x, player.y, lightRadius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, lightRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawTileMap();

    // Draw Monsters
    monsters.forEach(m => {
        drawPixelMonster(m.x, m.y);
        // HP Bar
        ctx.fillStyle = '#000';
        ctx.fillRect(m.x - 10, m.y - 14, 20, 3);
        ctx.fillStyle = '#c62828';
        ctx.fillRect(m.x - 9, m.y - 13, 18, 1);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(m.x - 9, m.y - 13, (m.hp / m.maxHp) * 18, 1);
    });

    // Draw Bullets
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x - b.size, b.y - b.size, b.size * 2, b.size * 2);
    });

    // Draw Player
    drawPixelSprite(player.x, player.y, player.color, player.name);

    drawLighting();
}

function gameOver() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-level').innerText = player.level;
    document.getElementById('final-kills').innerText = killsCount;
}

function gameLoop() {
    if (player && player.hp > 0) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}
