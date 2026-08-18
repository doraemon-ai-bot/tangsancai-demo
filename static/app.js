import { PoseDetector } from './pose.js';
import { AvatarRenderer } from './three_scene.js';
import { CanvasRecorder } from './recorder.js';

// App State
let detector = null;
let renderer = null;
let recorder = null;
let recordedBlob = null;

let isVideoLoaded = false;
let isCameraActive = false;
let isProcessing = false;
let isRecording = false;
let lastFrameTime = -1;
let poseTimestamp = 0; // Monotonically increasing timestamp counter to prevent MediaPipe crashes
let lastWorldLandmarks = null; // Track previous frame joint positions for speed calculation

// DOM elements
const videoEl = document.getElementById('input-video');
const videoUpload = document.getElementById('video-upload');
const videoCanvas = document.getElementById('video-canvas');
const videoCtx = videoCanvas ? videoCanvas.getContext('2d') : null;
const btnLoadPreset = document.getElementById('btn-load-preset');
const btnCamera = document.getElementById('btn-camera');
const btnProcess = document.getElementById('btn-process');
const btnAiMatch = document.getElementById('btn-ai-match');
const btnDance = document.getElementById('btn-dance');
const btnRecord = document.getElementById('btn-record');
const btnDownload = document.getElementById('btn-download');
const statusLog = document.getElementById('status-log');
const matchOverlay = document.getElementById('match-overlay');
const btnCloseOverlay = document.getElementById('btn-close-overlay');
const avatarNameEl = document.getElementById('match-avatar-name');
const avatarDescEl = document.getElementById('match-avatar-desc');

// Logging helper
function log(message) {
    console.log("[App LOG]:", message);
    statusLog.innerText = message;
}

// Initialize Modules
async function init() {
    log("正在载入 3D 引擎与骨骼库...");
    
    // 1. Initialize Three.js Scene
    renderer = new AvatarRenderer('three-canvas');
    renderer.initialize();
    
    // 2. Initialize Canvas Recorder
    const canvas = document.getElementById('three-canvas');
    recorder = new CanvasRecorder(canvas);

    // 3. Initialize Pose Detector
    videoEl.addEventListener('loadedmetadata', adjustPipAspectRatio);
    detector = new PoseDetector();
    try {
        await detector.initialize((progressMsg) => log(progressMsg));
    } catch (e) {
        log("动捕模块载入失败，请刷新重试。");
        return;
    }

    log("系统就绪！请上传测试视频或启动摄像头。");
    setupEventListeners();
}

function setupEventListeners() {
    // Handle Video Upload
    videoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            isCameraActive = false;
            const url = URL.createObjectURL(file);
            videoEl.srcObject = null;
            videoEl.onloadedmetadata = () => {
                isVideoLoaded = true;
                log(`视频上传成功: ${file.name} (${videoEl.videoWidth}x${videoEl.videoHeight})`);
                btnProcess.disabled = false;
                btnAiMatch.disabled = false;
                mixVideoBackground();

                // Explicitly play the video to kick off frame pipeline
                videoEl.play()
                    .then(() => log("视频已自动播放，动捕管道就绪。"))
                    .catch(err => console.warn("Autoplay deferred:", err));
            };
            videoEl.src = url;
            videoEl.load();
        }
    });

    // Handle Load Preset Test Video
    btnLoadPreset.addEventListener('click', async () => {
        isCameraActive = false;
        videoEl.srcObject = null;
        videoEl.muted = true; // Force muted to satisfy autoplay security policies
        
        log("正在从云端安全提取内置视频数据包...");
        try {
            const response = await fetch('/api/preset-video');
            const data = await response.json();
            
            if (data && data.success) {
                videoEl.onloadedmetadata = () => {
                    isVideoLoaded = true;
                    log("内置测试视频加载成功！");
                    btnProcess.disabled = false;
                    btnAiMatch.disabled = false;
                    mixVideoBackground();
                    
                    // Explicitly play the video to kick off frame pipeline
                    videoEl.play()
                        .then(() => log("视频已启动自动播放。"))
                        .catch(err => console.warn("Autoplay deferred:", err));
                };
                videoEl.src = data.videoData; // Load as standard high-performance Base64 Data URL!
                videoEl.load();
            } else {
                log("数据解析失败，请检查服务器。");
            }
        } catch (err) {
            console.error("Failed to fetch preset video:", err);
            log("网络读取失败，建议刷新重试或直接“上传测试视频”进行本地流畅驱动！");
        }
    });

    // Handle Camera Toggle
    btnCamera.addEventListener('click', async () => {
        if (isCameraActive) {
            stopCamera();
        } else {
            await startCamera();
        }
    });

    // Handle skeleton extraction / processing
    btnProcess.addEventListener('click', () => {
        if (isProcessing) {
            stopProcessing();
        } else {
            startProcessing();
        }
    });

    // Handle AI Multimodal alignment
    btnAiMatch.addEventListener('click', async () => {
        await triggerAiMatch();
    });

    // Handle Close Overlay
    btnCloseOverlay.addEventListener('click', () => {
        matchOverlay.classList.remove('active');
        btnDance.disabled = false;
        
        // Automatically trigger dance sync for immediate immersive experience!
        videoEl.play();
        btnDance.innerText = "暂停共舞";
        log("与仕女跨时空意象融合，翩翩起舞！");
        if (!isProcessing) {
            startProcessing();
        }
        btnRecord.disabled = false;
    });

    // Handle Dance Sync
    btnDance.addEventListener('click', () => {
        // Ensure we are playing and processing
        if (!videoEl.paused) {
            videoEl.pause();
            btnDance.innerText = "恢复共舞";
            log("暂停舞姿同步。");
        } else {
            videoEl.play();
            btnDance.innerText = "暂停共舞";
            log("正在同步人俑骨骼，翩翩起舞！");
            if (!isProcessing) {
                startProcessing();
            }
        }
        btnRecord.disabled = false;
    });

    // Handle Recording
    btnRecord.addEventListener('click', async () => {
        if (isRecording) {
            await stopRecording();
        } else {
            startRecording();
        }
    });

    // Handle Download
    btnDownload.addEventListener('click', () => {
        if (recordedBlob) {
            recorder.download(recordedBlob, `人俑共舞_Tangsancai_${Date.now()}.webm`);
        }
    });
}

// Start Web Camera
async function startCamera() {
    try {
        log("正在启动摄像头...");
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false
        });
        videoEl.src = null;
        videoEl.srcObject = stream;
        videoEl.play();
        isVideoLoaded = true;
        isCameraActive = true;
        btnCamera.innerText = "关闭摄像头";
        btnProcess.disabled = false;
        btnAiMatch.disabled = false;
        log("摄像头开启，就绪。");
        mixVideoBackground();
    } catch (err) {
        console.error("Error accessing camera:", err);
        log("开启摄像头失败: " + err.message);
    }
}

function stopCamera() {
    if (videoEl.srcObject) {
        videoEl.srcObject.getTracks().forEach(track => track.stop());
        videoEl.srcObject = null;
    }
    isCameraActive = false;
    btnCamera.innerText = "开启摄像头";
    btnProcess.disabled = true;
    btnAiMatch.disabled = true;
    btnDance.disabled = true;
    log("摄像头已关闭。");
}

// Keep the professional dark 3D stage background
function mixVideoBackground() {
    if (renderer) {
        renderer.scene.background = new THREE.Color(0x111111);
    }
}

// Start Processing Loop
function startProcessing() {
    isProcessing = true;
    btnProcess.innerText = "停止姿态提取";
    btnProcess.classList.add('btn-primary');
    videoEl.play();
    log("正在实时提取 3D 骨骼姿态...");
    renderer.isTrackingActive = true;
    processFrame();
}

function stopProcessing() {
    isProcessing = false;
    btnProcess.innerText = "提取动作骨骼";
    btnProcess.classList.remove('btn-primary');
    videoEl.pause();
    renderer.isTrackingActive = false;
    log("姿态提取停止。");
}

// Frame Loop
function processFrame() {
    if (!isProcessing) return;

    const now = videoEl.currentTime;
    if (now !== lastFrameTime && videoEl.readyState >= 2) {
        lastFrameTime = now;
        
        // Auto-resize 2D overlay canvas to match the actual video display size
        if (videoCanvas && videoEl) {
            const rect = videoEl.getBoundingClientRect();
            videoCanvas.width = rect.width;
            videoCanvas.height = rect.height;
        }

        // Clear the 2D overlay context on every frame
        if (videoCtx && videoCanvas) {
            videoCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
        }

        // Guarantee strictly monotonically increasing timestamp
        poseTimestamp += 33; // Roughly 30 FPS step in milliseconds
        const pose = detector.detectFrame(videoEl, poseTimestamp);
        
        if (pose) {
            // 1. Draw 2D glowing skeleton lines on top of the human dancer!
            draw2DSkeleton(pose.landmarks);

            // 2. Drive 3D model bones on the right panel
            if (pose.worldLandmarks) {
                renderer.updatePose(pose.worldLandmarks);

                // 3. Calculate human body movement velocity (average speed of hands and feet)
                let velocity = 0;
                if (lastWorldLandmarks) {
                    const joints = [15, 16, 27, 28]; // Left/Right Wrists, Left/Right Ankles
                    let totalDist = 0;
                    let validCount = 0;
                    
                    joints.forEach(j => {
                        const p1 = pose.worldLandmarks[j];
                        const p2 = lastWorldLandmarks[j];
                        if (p1 && p2) {
                            const dx = p1.x - p2.x;
                            const dy = p1.y - p2.y;
                            const dz = p1.z - p2.z;
                            totalDist += Math.sqrt(dx*dx + dy*dy + dz*dz);
                            validCount++;
                        }
                    });
                    
                    if (validCount > 0) {
                        velocity = (totalDist / validCount) / 0.033; // Velocity in meters per second
                    }
                }
                
                // Save current landmarks for the next frame's velocity calculation
                lastWorldLandmarks = pose.worldLandmarks;

                // 4. Feed speed into the PBR dynamic Sancai glaze melting shader!
                renderer.updateVelocity(velocity);
            }
        }
    }

    requestAnimationFrame(processFrame);
}

// Capture current frame and send to Gemini
async function triggerAiMatch() {
    log("正在捕捉当前动作与表情，唤醒 Gemma-4-Vision 智能匹配...");
    
    // 1. Capture a thumbnail from the video using a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoEl.videoWidth || 640;
    tempCanvas.height = videoEl.videoHeight || 480;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // 2. Convert to Base64 Data URL
    const imageData = tempCanvas.toDataURL('image/jpeg', 0.8);

    try {
        // 3. Send to Python Backend API
        const response = await fetch('/api/match-avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageData })
        });
        
        const result = await response.json();
        
        if (result && result.success) {
            log(result.analysis);
            
            // 4. Load the matched model inside Three.js
            const matched = result.matched;
            avatarNameEl.innerText = matched.name;
            avatarDescEl.innerText = `${result.analysis}\n\n【匹配详情】${matched.desc}`;
            
            // Load model - DISABLED override to preserve raw_model.stl!
            // await renderer.loadCustomModel(matched.modelPath);
            console.log("[App]: Preserving custom raw_model.stl on stage.");
            
            // Re-enable background video texture if model changed
            mixVideoBackground();
            
            // Show overlay
            matchOverlay.classList.add('active');
        } else {
            log("匹配服务异常，请稍后重试。");
        }
    } catch (e) {
        console.error("API match failed:", e);
        log("网络连接失败。已自动切换至本地体验模式。");
        
        // Simple local simulation
        avatarNameEl.innerText = "三元唐俑·仕女化身 (模拟)";
        avatarDescEl.innerText = "（本地模拟匹配成功）契合度 98%。您的姿态温婉大方，精准折射了唐三彩仕女俑的典雅神韵。";
        matchOverlay.classList.add('active');
    }
}

// Recording
function startRecording() {
    isRecording = true;
    btnRecord.innerText = "停止录制";
    btnRecord.classList.add('btn-primary');
    btnDownload.disabled = true;
    
    log("正在录制高清“人俑共舞”视频，请尽情律动...");
    recorder.start(30); // 30 FPS
}

async function stopRecording() {
    isRecording = false;
    btnRecord.innerText = "录制短视频";
    btnRecord.classList.remove('btn-primary');
    
    log("正在导出合成视频，零算力秒级渲染...");
    recordedBlob = await recorder.stop();
    
    if (recordedBlob) {
        btnDownload.disabled = false;
        log("专属“人俑共舞”小视频渲染成功！点击即可导出。");
    } else {
        log("录制失败，未捕获到有效数据。");
    }
}

// Draw 2D skeletal lines on top of the video stream for diagnostic visualization
function draw2DSkeleton(landmarks) {
    if (!videoCtx || !videoCanvas || !landmarks) return;

    const w = videoCanvas.width;
    const h = videoCanvas.height;

    // Joint connections for drawing lines (MediaPipe landmarks connections)
    const connections = [
        // Torso
        [11, 12], [12, 24], [24, 23], [23, 11],
        // Left Arm
        [11, 13], [13, 15],
        // Right Arm
        [12, 14], [14, 16],
        // Left Leg
        [23, 25], [25, 27],
        // Right Leg
        [24, 26], [26, 28]
    ];

    // 1. Draw Connections (Glow-in-the-dark neon green)
    videoCtx.strokeStyle = "#00ff00";
    videoCtx.lineWidth = 4;
    videoCtx.lineCap = "round";
    
    connections.forEach(([i, j]) => {
        const lmI = landmarks[i];
        const lmJ = landmarks[j];
        if (lmI && lmJ && lmI.visibility > 0.5 && lmJ.visibility > 0.5) {
            videoCtx.beginPath();
            videoCtx.moveTo(lmI.x * w, lmI.y * h);
            videoCtx.lineTo(lmJ.x * w, lmJ.y * h);
            videoCtx.stroke();
        }
    });

    // 2. Draw Keypoints (Bright glowing red)
    videoCtx.fillStyle = "#ff0000";
    landmarks.forEach((lm, index) => {
        const majorJoints = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
        if (majorJoints.includes(index) && lm.visibility > 0.5) {
            videoCtx.beginPath();
            videoCtx.arc(lm.x * w, lm.y * h, 6, 0, 2 * Math.PI);
            videoCtx.fill();
        }
    });
}

// Adjust PIP container height dynamically based on video aspect ratio
function adjustPipAspectRatio() {
    if (videoEl && videoEl.videoWidth > 0) {
        const container = document.querySelector('.pip-video-container');
        if (container) {
            const aspectRatio = videoEl.videoHeight / videoEl.videoWidth;
            const width = 280; // Fixed width from CSS
            container.style.height = `${width * aspectRatio + 24}px`; // 24px for the .pip-header height
            console.log(`[PIP Aspect Ratio]: Adjusted container height to ${Math.round(width * aspectRatio + 24)}px`);
        }
    }
}

// Run
window.addEventListener('DOMContentLoaded', init);
