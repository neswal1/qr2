// --- 1. CONFIG ---
const particleCount = 25000; // Tăng số lượng hạt lên cực cao để hình siêu nét
let isExploded = false;
let wasExploded = false;
let isHandPresent = false;
let targetRotX = 0, targetRotY = 0;
let targetScale = 1.0, currentScale = 1.0;
let currentColor = new THREE.Color(0xff0055);

const HEART_SIZE = 25; // Tăng kích thước lên để hình to rõ hơn
const REST_INTENSITY = 1.8; 
const EXPLODE_INTENSITY = 4.0;

// --- 2. THREE.JS SETUP ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 65);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));
composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.8, 0.4, 0.0));

const pLight = new THREE.PointLight(currentColor, 2, 200);
scene.add(pLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.2));

// --- 3. PARTICLE SYSTEM ---
let mesh;
const dummy = new THREE.Object3D();
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const mat = new THREE.MeshPhysicalMaterial({
    color: currentColor,
    emissive: currentColor,
    emissiveIntensity: REST_INTENSITY,
    metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.95
});

function isPointInStandingHeart(x, y, z) {
    // Bỏ hệ số 1.2 để trái tim cao hơn, chuẩn dáng hơn
    // y = y * 1.2; 
    const part1 = x * x + (9 / 4) * (z * z) + y * y - 1;
    const term2 = x * x * Math.pow(y, 3);
    const term3 = (9 / 80) * (z * z) * Math.pow(y, 3);
    return (Math.pow(part1, 3) - term2 - term3) <= 0;
}

function initParticles(font) {
    if (mesh) { scene.remove(mesh); mesh.dispose(); }
    // --- Thêm vào trong hàm initParticles(font) ---
const wishPositions = [];
const wishGeo = new THREE.TextGeometry('MAI YEU', { // Thay lời chúc ở đây
    font: font,
    size: 10,
    height: 2,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 0.5
});
wishGeo.center();

const wishPosAttr = wishGeo.attributes.position;
// Logic lấy mẫu điểm từ chữ "MÃI YÊU"
for (let k = 0; k < particleCount; k++) {
    const p = new THREE.Vector3().fromBufferAttribute(wishPosAttr, Math.floor(Math.random() * wishPosAttr.count));
    wishPositions.push(p);
}

// Cập nhật userData để animate có thể dùng
mesh.userData = { 
    heartPositions, 
    textPositions, 
    wishPositions, // Thêm cái này
    currentPos, 
    velocity, 
    randomRot, 
    baseSize: particleSize 
};
    // Tăng kích thước hạt lên một chút để lấp đầy khoảng trống
    const particleSize = 45.0 / Math.sqrt(particleCount);

    mesh = new THREE.InstancedMesh(boxGeo, mat, particleCount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const heartPositions = [];
    const textPositions = [];
    const currentPos = [];
    const velocity = [];
    const randomRot = [];

    // 1. Generate Heart Positions
    let i = 0;
    while (i < particleCount) {
        const x = (Math.random() * 3) - 1.5;
        const y = (Math.random() * 3) - 1.5;
        const z = (Math.random() * 3) - 1.5;

        if (isPointInStandingHeart(x, y, z)) {
            const wx = x * HEART_SIZE;
            const wy = y * HEART_SIZE;
            const wz = z * HEART_SIZE;
            heartPositions.push(new THREE.Vector3(wx, wy, wz));
            i++;
        }
    }

    // 2. Generate Text Positions ("I LOVE YOU")
    const textGeo = new THREE.TextGeometry('I LOVE YOU', {
        font: font,
        size: 12,
        height: 2,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 0.5,
        bevelOffset: 0,
        bevelSegments: 5
    });
    
    textGeo.center(); // Center the text
    textGeo.computeBoundingBox();

    // Sample points from Text Surface
    const posAttribute = textGeo.attributes.position;
    const faces = [];
    // Extract triangles (faces)
    for (let j = 0; j < posAttribute.count; j += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(posAttribute, j);
        const b = new THREE.Vector3().fromBufferAttribute(posAttribute, j + 1);
        const c = new THREE.Vector3().fromBufferAttribute(posAttribute, j + 2);
        const area = 0.5 * new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a)).length();
        faces.push({ a, b, c, area });
    }

    // Calculate total area for weighting
    const totalArea = faces.reduce((sum, f) => sum + f.area, 0);

    for (let k = 0; k < particleCount; k++) {
        // Weighted random selection of a face
        let r = Math.random() * totalArea;
        let selectedFace = faces[0];
        for (const face of faces) {
            r -= face.area;
            if (r <= 0) {
                selectedFace = face;
                break;
            }
        }

        // Random point in triangle
        const r1 = Math.sqrt(Math.random());
        const r2 = Math.random();
        const a = 1 - r1;
        const b = r1 * (1 - r2);
        const c = r1 * r2;

        const p = new THREE.Vector3()
            .addScaledVector(selectedFace.a, a)
            .addScaledVector(selectedFace.b, b)
            .addScaledVector(selectedFace.c, c);
        
        textPositions.push(p);
        
        // Initialize at Text Position (Start state)
        currentPos.push(p.clone());
        velocity.push(new THREE.Vector3(0, 0, 0));
        randomRot.push({ x: Math.random() * Math.PI, y: Math.random() * Math.PI });

        dummy.position.copy(p);
        dummy.scale.set(particleSize, particleSize, particleSize);
        dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
    }

    mesh.userData = { heartPositions, textPositions, currentPos, velocity, randomRot, baseSize: particleSize };
    scene.add(mesh);
}

// Load Font and Start
const loader = new THREE.FontLoader();
// Bạn có thể đổi font khác bằng cách thay đổi URL bên dưới:
// - optimer_bold.typeface.json (Mềm mại hơn)
// - gentilis_bold.typeface.json (Cứng cáp)
// - helvetiker_bold.typeface.json (Mặc định)
// - droid/droid_serif_bold.typeface.json (Có chân, cổ điển)
loader.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/optimer_bold.typeface.json', function (font) {
    initParticles(font);
});

// --- 4. ANIMATION (SLOW PHYSICS PRESERVED) ---
const heartGroup = new THREE.Group();
scene.add(heartGroup);

const DUST_GRAVITY = -0.008;
const FLOOR = -50;
const tempVec = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);

    // Nội suy scale và rotation mượt mà
    currentScale += (targetScale - currentScale) * 0.1;
    heartGroup.rotation.y += (targetRotY - heartGroup.rotation.y) * 0.1;
    heartGroup.rotation.x += (targetRotX - heartGroup.rotation.x) * 0.1;
    heartGroup.scale.set(currentScale, currentScale, currentScale);

    if (mesh) {
        const targetIntensity = isExploded ? EXPLODE_INTENSITY : REST_INTENSITY;
        mesh.material.emissiveIntensity += (targetIntensity - mesh.material.emissiveIntensity) * 0.05;
        pLight.intensity = mesh.material.emissiveIntensity * 1.5;

        const { heartPositions, textPositions, currentPos, velocity, randomRot, baseSize } = mesh.userData;
        if (mesh.parent !== heartGroup) heartGroup.add(mesh);

        const isInitialBurst = isExploded && !wasExploded;

        for (let i = 0; i < particleCount; i++) {
            const cPos = currentPos[i];
            const vel = velocity[i];
            
            // Determine Target based on Hand Presence
            // If Hand Present -> Heart Shape
            // If No Hand -> Text Shape
            const targetPos = isHandPresent ? heartPositions[i] : textPositions[i];

            if (isExploded) {
                if (isInitialBurst) {
                    tempVec.copy(cPos).normalize();
                    const explosionForce = 0.5 + Math.random() * 1.5;
                    vel.addScaledVector(tempVec, explosionForce);
                    vel.x += (Math.random() - 0.5) * 0.8;
                    vel.y += (Math.random() - 0.5) * 0.8;
                    vel.z += (Math.random() - 0.5) * 0.8;
                }
                vel.y += DUST_GRAVITY;
                vel.multiplyScalar(0.92);
                vel.x += (Math.random() - 0.5) * 0.02;
                vel.z += (Math.random() - 0.5) * 0.02;
                cPos.add(vel);
                if (cPos.y < FLOOR) { cPos.y = FLOOR; vel.y *= -0.2; vel.x *= 0.8; vel.z *= 0.8; }

            } else {
                // Attraction to Target (Heart or Text)
                const forceX = targetPos.x - cPos.x;
                const forceY = targetPos.y - cPos.y;
                const forceZ = targetPos.z - cPos.z;

                // Adjust attraction strength for smoother transition
                const attractionStrength = 0.02; // Hút mạnh hơn để giữ form chặt hơn
                vel.x += forceX * attractionStrength;
                vel.y += forceY * attractionStrength;
                vel.z += forceZ * attractionStrength;

                // Giảm nhiễu loạn (Noise) để hình không bị rung, mờ
                const noiseScale = 0.01; 
                vel.x += (Math.random() - 0.5) * noiseScale;
                vel.y += (Math.random() - 0.5) * noiseScale;
                vel.z += (Math.random() - 0.5) * noiseScale;

                vel.multiplyScalar(0.90); // Tăng ma sát để hạt đứng yên hơn
                cPos.add(vel);
            }
            const time = Date.now() * 0.0005;
            dummy.rotation.set(randomRot[i].x + time, randomRot[i].y + time, 0);
            dummy.position.copy(cPos);
            dummy.scale.set(baseSize, baseSize, baseSize);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        wasExploded = isExploded;
    }
    composer.render();
}
animate();

// --- 5. MEDIAPIPE (DECOUPLED CONTROL LOGIC) ---
const videoEl = document.getElementById('video-input');
const statusText = document.getElementById('statusText');
const statusDot = document.querySelector('.dot');

function onResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        if (!isHandPresent) {
            statusText.innerText = "Đã kết nối"; statusDot.classList.add('active'); isHandPresent = true;
        }
        const hand = results.multiHandLandmarks[0];

        // 1. Check Trạng thái Nổ (Xòe tay)
        let fingersUp = 0;
        if (hand[8].y < hand[6].y) fingersUp++;   // Ngón trỏ
        if (hand[12].y < hand[10].y) fingersUp++; // Ngón giữa
        if (hand[16].y < hand[14].y) fingersUp++; // Ngón áp út
        if (hand[20].y < hand[18].y) fingersUp++; // Ngón út
        // Check ngón cái (tương đối)
        if (hand[4].x < hand[3].x) fingersUp++; 
        
        // Nếu xòe 4 ngón trở lên -> Nổ tung
        isExploded = (fingersUp >= 4);

        const wrist = hand[0];
        const middleTip = hand[12];
        const middleMCP = hand[9]; // Gốc ngón giữa

        // A. ZOOM LOGIC: Dựa trên khoảng cách (Độ lớn bàn tay)
        const handSize = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
        // Mapping: tay xa (0.1) -> nhỏ, tay gần (0.6) -> to
        targetScale = 0.5 + (handSize * 4.0);

        // B. ROTATION LOGIC: Dựa trên NGHIÊNG TAY (Joystick)
        const dx = middleMCP.x - wrist.x;
        const dy = middleMCP.y - wrist.y;

        // Chuẩn hóa: Giả sử tay dựng đứng là vị trí 0
        targetRotY = -dx * 6.0;
        targetRotX = dy * 6.0;

    } else {
        if (isHandPresent) { statusText.innerText = "Mất tín hiệu"; statusDot.classList.remove('active'); isHandPresent = false; }
        isExploded = false;
        // Reset về vị trí chuẩn khi mất tay (Text Mode)
        targetScale = 1.0; targetRotY = 0; targetRotX = 0;
    }
}

const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
hands.onResults(onResults);

const cam = new Camera(videoEl, { onFrame: async () => { await hands.send({ image: videoEl }); }, width: 640, height: 480 });
cam.start().then(() => { document.getElementById('loading').style.display = 'none'; });

document.getElementById('menu-toggle').onclick = (e) => { e.currentTarget.classList.toggle('active'); document.getElementById('ui-panel').classList.toggle('visible'); };
document.getElementById('colorPicker').addEventListener('input', (e) => {
    const hex = e.target.value; currentColor.set(hex);
    if (mesh) { mesh.material.color.set(hex); mesh.material.emissive.set(hex); }
    if (pLight) { pLight.color.set(hex); }
});
window.onresize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); };