// Weapons Database (6 Weapons)
const WEAPONS = {
    DAGGER: { name: 'Dagger', color: '#e74c3c', speed: 12, damage: 20, size: 4, cooldown: 180 },
    GUN: { name: 'Handgun', color: '#f1c40f', speed: 16, damage: 35, size: 5, cooldown: 300 },
    SPEAR: { name: 'Spear', color: '#3498db', speed: 10, damage: 65, size: 7, cooldown: 550 },
    BOW: { name: 'Longbow', color: '#2ecc71', speed: 14, damage: 45, size: 4, cooldown: 400 },
    AXE: { name: 'Battle Axe', color: '#e67e22', speed: 8, damage: 85, size: 9, cooldown: 700 },
    BONE: { name: 'Bone Wand', color: '#ecf0f1', speed: 11, damage: 50, size: 6, cooldown: 350 }
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

    let speed = 3.5, icon = '👨', name = 'Male Warrior';
    if (gender === 'female') { speed = 4.8; icon = '👩'; name = 'Female Huntress'; }
    else if (gender === 'old') { speed = 2.8; icon = '👨‍🦳'; name = 'Elder Mage'; }

    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 16,
        speed: speed,
        icon: icon,
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

    setInterval(spawnMonster, 1200);
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
        knob.style.top = '30px';
        knob.style.left = '30px';
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
        const maxDist = 35;

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        knob.style.left = `${30 + dx}px`;
        knob.style.top = `${30 + dy}px`;
        joystickVector = { x: dx / maxDist, y: dy / maxDist };
    }

    attackBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        // Auto-target nearest monster on touch attack
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
    document.getElementById('ui-skill-pts').innerText = player.skillPoints;

    const skillMenu = document.getElementById('skill-menu');
    if (player.skillPoints > 0) skillMenu.classList.remove('hidden');
    else skillMenu.classList.add('hidden');
}

function upgradeSkill(type) {
    if (player.skillPoints <= 0) return;
    if (type === 'dmg') player.bonusDamage += 10;
    if (type === 'spd') player.speed += 0.5;
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
    if (monsters.length >= 12) return;

    let x = Math.random() < 0.5 ? -20 : canvas.width + 20;
    let y = Math.random() * canvas.height;

    monsters.push({
        x: x,
        y: y,
        hp: 40 + (player.level * 12),
        maxHp: 40 + (player.level * 12),
        speed: 1.2 + Math.random() * 1.0,
        damage: 8 + (player.level * 2),
        radius: 14,
        color: '#8e44ad'
    });
}

function dropRandomWeapon() {
    const keys = Object.keys(WEAPONS);
    const newWeapon = WEAPONS[keys[Math.floor(Math.random() * keys.length)]];
    player.weapon = newWeapon;
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
    // Movement (Keyboard or Joystick)
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

    // Keep inside bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.dx;
        b.y += b.dy;
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }

    // Update Monsters & Combat
    for (let mIndex = monsters.length - 1; mIndex >= 0; mIndex--) {
        let m = monsters[mIndex];
        const angle = Math.atan2(player.y - m.y, player.x - m.x);
        m.x += Math.cos(angle) * m.speed;
        m.y += Math.sin(angle) * m.speed;

        // Monster Hits Player
        const distToPlayer = Math.hypot(player.x - m.x, player.y - m.y);
        if (distToPlayer < player.radius + m.radius) {
            player.hp -= 0.3; // Continuous damage on touch
            updateUI();
            if (player.hp <= 0) {
                gameOver();
                return;
            }
        }

        // Bullets Hit Monsters
        for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
            let b = bullets[bIndex];
            if (Math.hypot(b.x - m.x, b.y - m.y) < m.radius + b.size) {
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

function drawLighting() {
    // Ambient Dark Overlay
    ctx.fillStyle = 'rgba(8, 8, 12, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Player Light Source Gradient
    const lightRadius = 180;
    const gradient = ctx.createRadialGradient(
        player.x, player.y, 10,
        player.x, player.y, lightRadius
    );
    gradient.addColorStop(0, 'rgba(255, 230, 180, 0.35)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 120, 0.15)');
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

    // Draw Map Floor Grid
    ctx.strokeStyle = '#181822';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw Monsters
    monsters.forEach(m => {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.fill();

        // Monster HP Bar
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(m.x - 12, m.y - 20, 24, 3);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(m.x - 12, m.y - 20, (m.hp / m.maxHp) * 24, 3);
    });

    // Draw Bullets
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
    });

    // Draw Player
    ctx.font = '26px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.icon, player.x, player.y);

    // Render Ambient Lighting Layer
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
