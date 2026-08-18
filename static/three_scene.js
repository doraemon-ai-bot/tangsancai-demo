// Three.js scene, model loading, and skeleton retargeting

export class AvatarRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.skeleton = null;
        this.bones = {}; // Map of bone name to Three.js Bone object
        this.isReady = false;
        this.clock = new THREE.Clock();

        // Materials for Sancai (Three-color glaze) - using MeshPhysicalMaterial for gorgeous ceramic glaze reflections!
        this.sancaiMaterials = {
            green: new THREE.MeshPhysicalMaterial({
                color: 0x2e7d32, // Tang green
                roughness: 0.1,
                metalness: 0.1,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1
            }),
            amber: new THREE.MeshPhysicalMaterial({
                color: 0xd84315, // Tang amber/orange
                roughness: 0.1,
                metalness: 0.1,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1
            }),
            white: new THREE.MeshPhysicalMaterial({
                color: 0xf5f5dc, // Tang cream/cream-white
                roughness: 0.2,
                metalness: 0.0,
                clearcoat: 0.8,
                clearcoatRoughness: 0.2
            }),
            dark: new THREE.MeshPhysicalMaterial({
                color: 0x2d2d2d, // Dark clay
                roughness: 0.8,
                metalness: 0.0
            })
        };
    }

    async initialize() {
        // 1. Scene & Renderer
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this.scene.fog = new THREE.FogExp2(0x111111, 0.05);

        this.camera = new THREE.PerspectiveCamera(45, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 100);
        this.camera.position.set(0, 1.2, 4);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true // Required for Canvas captureStream!
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // 2. Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 25;
        dirLight.shadow.camera.left = -3;
        dirLight.shadow.camera.right = 3;
        dirLight.shadow.camera.top = 3;
        dirLight.shadow.camera.bottom = -3;
        this.scene.add(dirLight);

        const pointLight = new THREE.PointLight(0xffb300, 1.5, 10); // Warm glowing gold light
        pointLight.position.set(-2, 1.5, 1);
        this.scene.add(pointLight);

        // 3. Stage / Floor
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid helper for classic Bauhaus spatial grid feel
        const gridHelper = new THREE.GridHelper(10, 20, 0xd4af37, 0x333333);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        // Handle Resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Try to load the custom GLB model immediately on startup!
        try {
            console.log("[3D Engine]: Checking for final_Rigging.glb...");
            await this.loadCustomModel('/static/models/final_Rigging.glb');
        } catch (err) {
            console.log("[3D Engine]: final_Rigging.glb not found or failed to load, using procedural avatar.", err);
            this.createProceduralBauhausAvatar();
        }

        this.isReady = true;
        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    /**
     * Creates a beautiful Bauhaus + Tang Sancai procedural puppet
     * Perfect fallback/placeholder with fully functional skeleton!
     */
    createProceduralBauhausAvatar() {
        if (this.model) {
            this.scene.remove(this.model);
        }

        const group = new THREE.Group();
        group.name = "BauhausAvatar";

        // Create standard Three.js bones
        const bonesList = [];
        
        const rootBone = new THREE.Bone();
        rootBone.name = "Root";
        rootBone.position.set(0, 0, 0);
        bonesList.push(rootBone);

        const spineBone = new THREE.Bone();
        spineBone.name = "Spine";
        spineBone.position.set(0, 0.5, 0);
        rootBone.add(spineBone);
        bonesList.push(spineBone);

        const neckBone = new THREE.Bone();
        neckBone.name = "Neck";
        neckBone.position.set(0, 0.4, 0);
        spineBone.add(neckBone);
        bonesList.push(neckBone);

        const headBone = new THREE.Bone();
        headBone.name = "Head";
        headBone.position.set(0, 0.2, 0);
        neckBone.add(headBone);
        bonesList.push(headBone);

        // Arms
        const leftShoulder = new THREE.Bone();
        leftShoulder.name = "LeftShoulder";
        leftShoulder.position.set(-0.2, 0.3, 0);
        spineBone.add(leftShoulder);
        bonesList.push(leftShoulder);

        const leftArm = new THREE.Bone();
        leftArm.name = "LeftArm";
        leftArm.position.set(-0.25, 0, 0);
        leftShoulder.add(leftArm);
        bonesList.push(leftArm);

        const leftForeArm = new THREE.Bone();
        leftForeArm.name = "LeftForeArm";
        leftForeArm.position.set(-0.25, 0, 0);
        leftArm.add(leftForeArm);
        bonesList.push(leftForeArm);

        const rightShoulder = new THREE.Bone();
        rightShoulder.name = "RightShoulder";
        rightShoulder.position.set(0.2, 0.3, 0);
        spineBone.add(rightShoulder);
        bonesList.push(rightShoulder);

        const rightArm = new THREE.Bone();
        rightArm.name = "RightArm";
        rightArm.position.set(0.25, 0, 0);
        rightShoulder.add(rightArm);
        bonesList.push(rightArm);

        const rightForeArm = new THREE.Bone();
        rightForeArm.name = "RightForeArm";
        rightForeArm.position.set(0.25, 0, 0);
        rightArm.add(rightForeArm);
        bonesList.push(rightForeArm);

        // Legs
        const leftUpLeg = new THREE.Bone();
        leftUpLeg.name = "LeftUpLeg";
        leftUpLeg.position.set(-0.15, -0.1, 0);
        rootBone.add(leftUpLeg);
        bonesList.push(leftUpLeg);

        const leftLeg = new THREE.Bone();
        leftLeg.name = "LeftLeg";
        leftLeg.position.set(0, -0.4, 0);
        leftUpLeg.add(leftLeg);
        bonesList.push(leftLeg);

        const rightUpLeg = new THREE.Bone();
        rightUpLeg.name = "RightUpLeg";
        rightUpLeg.position.set(0.15, -0.1, 0);
        rootBone.add(rightUpLeg);
        bonesList.push(rightUpLeg);

        const rightLeg = new THREE.Bone();
        rightLeg.name = "RightLeg";
        rightLeg.position.set(0, -0.4, 0);
        rightUpLeg.add(rightLeg);
        bonesList.push(rightLeg);

        // Let's build some elegant geometric meshes attached to the bones
        // This represents the Bauhaus Ballet meets Tang Figurine.
        
        // Spine/Torso: Elegant tapered hourglass using cone/cylinders (Bauhaus style)
        const torsoGeo = new THREE.CylinderGeometry(0.18, 0.08, 0.5, 8);
        const torsoMesh = new THREE.Mesh(torsoGeo, this.sancaiMaterials.green);
        torsoMesh.position.y = 0.25;
        torsoMesh.castShadow = true;
        torsoMesh.receiveShadow = true;
        spineBone.add(torsoMesh);

        // Head: A perfect sphere (Bauhaus) combined with a stylized ceramic "Tang hair bun"
        const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const headMesh = new THREE.Mesh(headGeo, this.sancaiMaterials.white);
        headMesh.position.y = 0.08;
        headMesh.castShadow = true;
        headBone.add(headMesh);

        // Tang Lady Hair Bun (High topknot)
        const bunGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
        const bunMesh = new THREE.Mesh(bunGeo, this.sancaiMaterials.dark);
        bunMesh.position.set(0, 0.2, -0.02);
        bunMesh.rotation.x = -0.2;
        headBone.add(bunMesh);

        // Hips/Skirt: A gorgeous flared bell cone mimicking the Tang skirt
        const skirtGeo = new THREE.CylinderGeometry(0.08, 0.3, 0.5, 16);
        const skirtMesh = new THREE.Mesh(skirtGeo, this.sancaiMaterials.amber);
        skirtMesh.position.y = -0.25;
        skirtMesh.castShadow = true;
        skirtMesh.receiveShadow = true;
        rootBone.add(skirtMesh);

        // Limbs as segments
        const addLimbMesh = (parentBone, length, direction, material) => {
            const limbGeo = new THREE.CylinderGeometry(0.04, 0.03, length, 8);
            const limbMesh = new THREE.Mesh(limbGeo, material);
            // Align cylinder with the bone direction
            if (direction.x !== 0) {
                limbMesh.rotation.z = -Math.PI / 2 * Math.sign(direction.x);
                limbMesh.position.x = direction.x / 2;
            } else {
                limbMesh.position.y = direction.y / 2;
            }
            limbMesh.castShadow = true;
            parentBone.add(limbMesh);
        };

        // Arms
        addLimbMesh(leftArm, 0.25, new THREE.Vector3(-0.25, 0, 0), this.sancaiMaterials.white);
        addLimbMesh(leftForeArm, 0.25, new THREE.Vector3(-0.25, 0, 0), this.sancaiMaterials.green);
        addLimbMesh(rightArm, 0.25, new THREE.Vector3(0.25, 0, 0), this.sancaiMaterials.white);
        addLimbMesh(rightForeArm, 0.25, new THREE.Vector3(0.25, 0, 0), this.sancaiMaterials.green);

        // Legs
        addLimbMesh(leftUpLeg, 0.4, new THREE.Vector3(0, -0.4, 0), this.sancaiMaterials.amber);
        addLimbMesh(leftLeg, 0.4, new THREE.Vector3(0, -0.4, 0), this.sancaiMaterials.white);
        addLimbMesh(rightUpLeg, 0.4, new THREE.Vector3(0, -0.4, 0), this.sancaiMaterials.amber);
        addLimbMesh(rightLeg, 0.4, new THREE.Vector3(0, -0.4, 0), this.sancaiMaterials.white);

        // Setup Skeleton
        const skeleton = new THREE.Skeleton(bonesList);
        group.add(rootBone);
        // Note: THREE.Group does not have a .bind() method. 
        // Since we parented the meshes to the bones directly, FK positioning works automatically.
        
        this.model = group;
        // Position overall avatar
        this.model.position.set(0, 0.8, 0);
        this.scene.add(this.model);

        // Map bones for direct access
        this.bones = {};
        bonesList.forEach(bone => {
            this.bones[bone.name] = bone;
        });

        this.skeleton = skeleton;
        console.log("Procedural Bauhaus Tang Sancai avatar created.");
    }

    /**
     * Load a custom GLTF model provided by the user
     * @param {string} url 
     */
    async loadCustomModel(url) {
        const loader = new THREE.GLTFLoader();
        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (gltf) => {
                    console.log("Loaded custom 3D model:", gltf);
                    
                    if (this.model) {
                        this.scene.remove(this.model);
                    }

                    this.model = gltf.scene;
                    
                    // --- 3D Debugging: Traverse and log all nodes ---
                    console.log("[3D Debug]: Traversing model nodes...");
                    gltf.scene.traverse((node) => {
                        if (node.isMesh) {
                            const meshBox = new THREE.Box3().setFromObject(node);
                            const meshSize = new THREE.Vector3();
                            meshBox.getSize(meshSize);
                            console.log(`[3D Debug] Mesh: "${node.name}", Size: X:${meshSize.x.toFixed(2)} Y:${meshSize.y.toFixed(2)} Z:${meshSize.z.toFixed(2)}, Position: X:${node.position.x.toFixed(2)} Y:${node.position.y.toFixed(2)} Z:${node.position.z.toFixed(2)}`);
                        }
                        if (node.isBone) {
                            console.log(`[3D Debug] Bone found: "${node.name}"`);
                        }
                    });
                    
                    // --- 3D Asset Auto-Scaling & Ground-Snapping Algorithm ---
                    // 1. Calculate the bounding box of the loaded model
                    const box = new THREE.Box3();
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            box.expandByObject(child);
                        }
                    });
                    if (box.isEmpty()) {
                        box.setFromObject(this.model);
                    }
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    
                    const height = size.y;
                    console.log(`[3D Engine]: Mapped asset original height: ${height.toFixed(3)} units`);
                    
                    // 2. Auto-scale to fit the screen beautifully (target height of 1.6 meters)
                    const targetHeight = 1.6;
                    const scaleFactor = height > 0 ? (targetHeight / height) : 1;
                    this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    
                    // 3. Ground-snap (place the bottom of the bounding box exactly at Y = 0 floor level)
                    // And center the model horizontally (X and Z axes)
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    
                    this.model.position.x = -center.x * scaleFactor;
                    this.model.position.z = -center.z * scaleFactor;
                    this.model.position.y = -box.min.y * scaleFactor;
                    
                    console.log(`[3D Engine]: Dynamic scale factor applied: ${scaleFactor.toFixed(6)}`);
                    
                    // Enable shadows
                    this.model.traverse((object) => {
                        if (object.isMesh) {
                            object.castShadow = true;
                            object.receiveShadow = true;
                            // Apply glazed ceramic materials for Sancai feel
                            object.material.roughness = 0.1;
                            object.material.metalness = 0.1;
                            if (object.material.clearcoat !== undefined) {
                                object.material.clearcoat = 1.0;
                            }
                        }
                    });

                    this.scene.add(this.model);

                    // Add Skeleton Helper for debugging (draws bone lines)
                    if (this.skeletonHelper) {
                        this.scene.remove(this.skeletonHelper);
                    }
                    this.skeletonHelper = new THREE.SkeletonHelper(this.model);
                    this.scene.add(this.skeletonHelper);

                    // Find bones inside GLTF
                    this.bones = {};
                    this.model.traverse((object) => {
                        if (object.isBone) {
                            // Map bone names to objects
                            // We look for standard VRM, Mixamo, or Tripo bone naming conventions
                            const name = object.name.toLowerCase();
                            
                            // 1. Core Spine Chain (Precise matching to avoid overwriting)
                            if (name === "hips" || name === "root" || name === "pelvis" || name === "spine") {
                                if (!this.bones["Root"] || name === "hips" || name === "root") {
                                    this.bones["Root"] = object;
                                }
                            }
                            else if (name === "spine.002" || name === "spine.003" || name === "spine02" || name === "chest" || name === "spine_02" || name === "spine.001") {
                                if (!this.bones["Spine"] || name.includes("002") || name.includes("003")) {
                                    this.bones["Spine"] = object;
                                }
                            }
                            else if (name.includes("neck") || name === "spine.005" || name === "spine.004") {
                                this.bones["Neck"] = object;
                            }
                            else if (name.includes("head") || name === "spine.006" || name === "face") {
                                this.bones["Head"] = object;
                            }
                            
                            // 2. Left Side Limbs (supporting .l, _l, left)
                            else if (name.includes("leftshoulder") || name.includes("l_shoulder") || name.includes("shoulderl") || name.includes("shoulder.l") || name.includes("shoulder_l")) {
                                this.bones["LeftShoulder"] = object;
                            }
                            else if (name.includes("leftarm") || name.includes("l_uparm") || name.includes("l_arm") || name.includes("upper_arml") || name.includes("up_arml") || name.includes("upper_arm.l") || name.includes("upper_arm_l")) {
                                this.bones["LeftArm"] = object;
                            }
                            else if (name.includes("leftforearm") || name.includes("l_forearm") || name.includes("forearml") || name.includes("forearm.l") || name.includes("forearm_l")) {
                                this.bones["LeftForeArm"] = object;
                            }
                            else if (name.includes("leftupleg") || name.includes("l_thigh") || name.includes("l_upleg") || name.includes("thighl") || name.includes("uplegl") || name.includes("thigh.l") || name.includes("thigh_l")) {
                                this.bones["LeftUpLeg"] = object;
                            }
                            else if (name.includes("leftleg") || name.includes("l_calf") || name.includes("l_leg") || name.includes("shinl") || name.includes("calfl") || name.includes("legl") || name.includes("shin.l") || name.includes("shin_l")) {
                                this.bones["LeftLeg"] = object;
                            }
                            
                            // 3. Right Side Limbs (supporting .r, _r, right)
                            else if (name.includes("rightshoulder") || name.includes("r_shoulder") || name.includes("shoulderr") || name.includes("shoulder.r") || name.includes("shoulder_r")) {
                                this.bones["RightShoulder"] = object;
                            }
                            else if (name.includes("rightarm") || name.includes("r_uparm") || name.includes("r_arm") || name.includes("upper_armr") || name.includes("up_armr") || name.includes("upper_arm.r") || name.includes("upper_arm_r")) {
                                this.bones["RightArm"] = object;
                            }
                            else if (name.includes("rightforearm") || name.includes("r_forearm") || name.includes("forearmr") || name.includes("forearm.r") || name.includes("forearm_r")) {
                                this.bones["RightForeArm"] = object;
                            }
                            else if (name.includes("rightupleg") || name.includes("r_thigh") || name.includes("r_upleg") || name.includes("thighr") || name.includes("uplegr") || name.includes("thigh.r") || name.includes("thigh_r")) {
                                this.bones["RightUpLeg"] = object;
                            }
                            else if (name.includes("rightleg") || name.includes("r_calf") || name.includes("r_leg") || name.includes("shinr") || name.includes("calfr") || name.includes("legr") || name.includes("shin.r") || name.includes("shin_r")) {
                                this.bones["RightLeg"] = object;
                            }
                        }
                    });

                    console.log("Mapped custom skeleton bones:", Object.keys(this.bones));
                    resolve(gltf);
                },
                (xhr) => {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                (error) => {
                    console.error("Error loading GLTF model. Falling back to procedural.", error);
                    // Recreate fallback
                    this.createProceduralBauhausAvatar();
                    resolve(null); // Resolve anyway so flow is not broken
                }
            );
        });
    }

    /**
     * Drive bones based on 3D world landmarks from MediaPipe
     * @param {Array} worldLandmarks MediaPipe 3D landmarks (meters)
     */
    updatePose(worldLandmarks) {
        if (!worldLandmarks || !this.isReady) return;

        // --- Helpers for Dynamic Skeletal Retargeting ---
        
        const getBoneChildDir = (bone) => {
            if (bone.children && bone.children.length > 0) {
                // Find the first child that is a bone or mesh to determine direction
                for (let i = 0; i < bone.children.length; i++) {
                    const child = bone.children[i];
                    if (child.isBone || child.isMesh) {
                        const pos = child.position.clone();
                        if (pos.lengthSq() > 0.0001) {
                            return pos.normalize();
                        }
                    }
                }
                const firstPos = bone.children[0].position.clone();
                if (firstPos.lengthSq() > 0.0001) {
                    return firstPos.normalize();
                }
            }
            return new THREE.Vector3(0, -1, 0); // Fallback (straight down)
        };

        const getActualParentWorldRotation = (bone) => {
            const rotations = [];
            let current = bone.parent;
            // Traverse up to the scene root (excluding the scene itself)
            while (current && current !== this.scene) {
                rotations.unshift(current.quaternion.clone()); // Add to front for top-to-bottom multiplication
                current = current.parent;
            }
            const worldRot = new THREE.Quaternion();
            rotations.forEach(q => {
                worldRot.multiply(q);
            });
            return worldRot;
        };

        const updateBoneSegment = (bone, childBone, targetWorldDir) => {
            if (!bone) return;
            
            // Safety Check: If the target world direction is zero-length, skip to prevent NaN
            if (targetWorldDir.lengthSq() < 0.0001) return;
            
            // 1. Get parent's world rotation dynamically from the actual Three.js scene graph!
            // This automatically accounts for model rotation, metarig scale, and intermediate bone bind poses!
            const parentWorldRotation = getActualParentWorldRotation(bone);
            
            // 2. Get default local direction of this segment
            let defaultLocalDir;
            if (childBone && childBone.parent === bone) {
                const pos = childBone.position.clone();
                if (pos.lengthSq() > 0.0001) {
                    defaultLocalDir = pos.normalize();
                } else {
                    defaultLocalDir = getBoneChildDir(bone);
                }
            } else {
                defaultLocalDir = getBoneChildDir(bone);
            }
            
            // 3. Transform target world direction into parent's local space
            const targetLocalDir = targetWorldDir.clone().applyQuaternion(parentWorldRotation.clone().invert());
            
            // Safety Check: If either direction vector is invalid, skip rotation to prevent skeleton explosion (NaN)
            if (defaultLocalDir.lengthSq() < 0.0001 || targetLocalDir.lengthSq() < 0.0001) {
                return;
            }
            
            // 4. Compute local rotation
            const localQuat = new THREE.Quaternion().setFromUnitVectors(defaultLocalDir, targetLocalDir);
            
            // 5. Apply to bone
            bone.quaternion.copy(localQuat);
        };

        // Helper index mappings for MediaPipe Pose
        const MP = {
            nose: 0,
            l_shoulder: 11, r_shoulder: 12,
            l_elbow: 13, r_elbow: 14,
            l_wrist: 15, r_wrist: 16,
            l_hip: 23, r_hip: 24,
            l_knee: 25, r_knee: 26,
            l_ankle: 27, r_ankle: 28
        };

        // Create Three.js Vector3 from landmarks
        const getVector = (id) => {
            const lm = worldLandmarks[id];
            if (!lm) return new THREE.Vector3();
            // We mirror X for natural interaction, Y is flipped, Z is flipped
            return new THREE.Vector3(-lm.x, -lm.y, -lm.z);
        };

        // Get joint positions
        const lShoulderPos = getVector(MP.l_shoulder);
        const rShoulderPos = getVector(MP.r_shoulder);
        const lElbowPos = getVector(MP.l_elbow);
        const rElbowPos = getVector(MP.r_elbow);
        const lWristPos = getVector(MP.l_wrist);
        const rWristPos = getVector(MP.r_wrist);

        const lHipPos = getVector(MP.l_hip);
        const rHipPos = getVector(MP.r_hip);
        const lKneePos = getVector(MP.l_knee);
        const rKneePos = getVector(MP.r_knee);
        const lAnklePos = getVector(MP.l_ankle);
        const rAnklePos = getVector(MP.r_ankle);

        // --- Hierarchical Retargeting Cascade ---
        // We update bones in top-to-bottom order.
        // As long as we do this, getActualParentWorldRotation will automatically collect 
        // the newly updated rotations of ancestor bones for the current child bone!

        // 1. Spine & Torso (parent: Root)
        if (this.bones["Spine"]) {
            const shoulderMid = new THREE.Vector3().addVectors(lShoulderPos, rShoulderPos).multiplyScalar(0.5);
            const hipMid = new THREE.Vector3().addVectors(lHipPos, rHipPos).multiplyScalar(0.5);
            const targetDir = new THREE.Vector3().subVectors(shoulderMid, hipMid).normalize();
            
            // Spine Amplification: Multiply X (sideways) and Z (depth) tilt by 2.2x to make subtle movements visible!
            const amplifiedTarget = new THREE.Vector3(targetDir.x * 2.2, targetDir.y, targetDir.z * 2.2).normalize();
            
            updateBoneSegment(this.bones["Spine"], this.bones["Neck"], amplifiedTarget);
        }

        // 2. Left Arm Chain (driven by user's RIGHT landmarks for mirror mode)
        if (this.bones["LeftArm"]) {
            let targetDir = new THREE.Vector3().subVectors(rElbowPos, rShoulderPos).normalize();
            // Soft A-pose constraint (pulls arm outwards-downwards) to prevent clipping into thick Sancai body
            const leftAPose = new THREE.Vector3(0.95, -0.3, 0).normalize();
            targetDir.lerp(leftAPose, 0.40).normalize();
            updateBoneSegment(this.bones["LeftArm"], this.bones["LeftForeArm"], targetDir);
        }
        if (this.bones["LeftForeArm"]) {
            const targetDir = new THREE.Vector3().subVectors(rWristPos, rElbowPos).normalize();
            updateBoneSegment(this.bones["LeftForeArm"], null, targetDir);
        }

        // 3. Right Arm Chain (driven by user's LEFT landmarks for mirror mode)
        if (this.bones["RightArm"]) {
            let targetDir = new THREE.Vector3().subVectors(lElbowPos, lShoulderPos).normalize();
            // Soft A-pose constraint (pulls arm outwards-downwards) to prevent clipping into thick Sancai body
            const rightAPose = new THREE.Vector3(-0.95, -0.3, 0).normalize();
            targetDir.lerp(rightAPose, 0.40).normalize();
            updateBoneSegment(this.bones["RightArm"], this.bones["RightForeArm"], targetDir);
        }
        if (this.bones["RightForeArm"]) {
            const targetDir = new THREE.Vector3().subVectors(lWristPos, lElbowPos).normalize();
            updateBoneSegment(this.bones["RightForeArm"], null, targetDir);
        }

        // 4. Left Leg Chain (driven by user's RIGHT landmarks for mirror mode)
        if (this.bones["LeftUpLeg"]) {
            const targetDir = new THREE.Vector3().subVectors(rKneePos, rHipPos).normalize();
            updateBoneSegment(this.bones["LeftUpLeg"], this.bones["LeftLeg"], targetDir);
        }
        if (this.bones["LeftLeg"]) {
            const targetDir = new THREE.Vector3().subVectors(rAnklePos, rKneePos).normalize();
            updateBoneSegment(this.bones["LeftLeg"], null, targetDir);
        }

        // 5. Right Leg Chain (driven by user's LEFT landmarks for mirror mode)
        if (this.bones["RightUpLeg"]) {
            const targetDir = new THREE.Vector3().subVectors(lKneePos, lHipPos).normalize();
            updateBoneSegment(this.bones["RightUpLeg"], this.bones["RightLeg"], targetDir);
        }
        if (this.bones["RightLeg"]) {
            const targetDir = new THREE.Vector3().subVectors(lAnklePos, lKneePos).normalize();
            updateBoneSegment(this.bones["RightLeg"], null, targetDir);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Slowly rotate camera or add nice idle breathing animations to bones if no tracking data
        const elapsed = this.clock.getElapsedTime();
        
        if (!this.isTrackingActive && this.bones["Spine"]) {
            // Soft breathing motion when idle
            this.bones["Spine"].rotation.z = Math.sin(elapsed * 2) * 0.02;
            this.bones["LeftArm"].rotation.z = -Math.PI / 2 + Math.sin(elapsed * 1.5) * 0.05;
            this.bones["RightArm"].rotation.z = Math.PI / 2 - Math.sin(elapsed * 1.5) * 0.05;
        }

        // Update Shader Time Uniform
        if (this.customUniforms) {
            this.customUniforms.u_time.value = elapsed;
        }

        if (this.skeletonHelper) {
            this.skeletonHelper.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    async loadSTLModel(url) {
        const loader = new THREE.STLLoader();
        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (geometry) => {
                    console.log("[3D Engine]: Loaded custom STL geometry:", geometry);
                    
                    if (this.model) {
                        this.scene.remove(this.model);
                    }

                    // --- 1. Mathematical Bounding Box & Geometry Coordinate Normalization ---
                    // Center the geometry pivot to make rotations perfectly clean
                    geometry.center();
                    
                    // Auto-convert Z-up to Y-up coordinate space!
                    // (Standard for CAD/3D printing STL files so they stand upright instead of laying on their backs)
                    geometry.rotateX(-Math.PI / 2);
                    
                    geometry.computeBoundingBox();
                    
                    const size = new THREE.Vector3();
                    geometry.boundingBox.getSize(size);
                    const height = size.y;
                    console.log(`[3D Engine STL]: Original geometry height: ${height.toFixed(3)} units`);
                    
                    // Scale geometry directly to exactly 1.6 meters tall!
                    const targetHeight = 1.6;
                    const scaleFactor = height > 0 ? (targetHeight / height) : 1;
                    geometry.scale(scaleFactor, scaleFactor, scaleFactor);
                    
                    // Recompute bounding box and translate Y so bottom of geometry is exactly at Y = 0 floor level!
                    geometry.computeBoundingBox();
                    const minY = geometry.boundingBox.min.y;
                    geometry.translate(0, -minY, 0);
                    
                    console.log(`[3D Engine STL]: Programmatic geometry scale & translate completed. Height is now 1.6m, bottom Y is 0.0m.`);

                    // 2. Create the Custom PBR Texture Projection and Sancai Glaze material!
                    const material = this.createSancaiTextureProjectionMaterial();
                    
                    // 3. Create mesh
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    
                    // Geometry is already pre-scaled, mesh position is at (0,0,0)
                    this.model = mesh;
                    this.scene.add(this.model);
                    
                    // 4. Local Auto-Rigging and Skin Weight segmenting (which now maps perfectly!)
                    this.autoSegmentAndRigSTL(geometry);

                    resolve(mesh);
                },
                (xhr) => {
                    console.log('[3D Engine STL Loading]: ' + (xhr.loaded / 1000000).toFixed(1) + 'MB loaded');
                },
                (error) => {
                    console.error("Error loading STL model:", error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Creates a highly glossy, glassy clearcoat Dehua white porcelain material
     * for the STL model, presenting a clean museum sculptural look!
     */
    createSancaiTextureProjectionMaterial() {
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xfaf7f0, // Warm cream-white glaze
            roughness: 0.1,
            metalness: 0.05,
            clearcoat: 1.0,
            clearcoatRoughness: 0.02, // High reflections
            side: THREE.DoubleSide,
            skinning: true
        });

        this.customUniforms = null; // Disable dynamic speed glaze drippings for now
        return material;
    }

    /**
     * Local bounding-box joint segmentation algorithm.
     * Rig the raw geometry, allocate vertex weights, and bind the standard skeleton in-memory!
     * @param {THREE.BufferGeometry} geometry 
     */
    autoSegmentAndRigSTL(geometry) {
        const bonesList = [];
        
        // 1. Create a standard 14-bone hierarchy matching our Pose tracker
        const rootBone = new THREE.Bone();
        rootBone.name = "Root";
        rootBone.position.set(0, 0.85, 0); // Center hips at 0.85m
        bonesList.push(rootBone);

        const spineBone = new THREE.Bone();
        spineBone.name = "Spine";
        spineBone.position.set(0, 0.25, 0); // Spine at Y = 1.10m
        rootBone.add(spineBone);
        bonesList.push(spineBone);

        const neckBone = new THREE.Bone();
        neckBone.name = "Neck";
        neckBone.position.set(0, 0.25, 0); // Neck at Y = 1.35m
        spineBone.add(neckBone);
        bonesList.push(neckBone);

        const headBone = new THREE.Bone();
        headBone.name = "Head";
        headBone.position.set(0, 0.10, 0); // Head base at Y = 1.45m
        neckBone.add(headBone);
        bonesList.push(headBone);

        // Arms (Shoulder Y=1.35m, Shoulder width X=±0.15m, upper arm length X=0.25m, forearm length X=0.25m)
        const leftShoulder = new THREE.Bone(); leftShoulder.name = "LeftShoulder"; leftShoulder.position.set(-0.15, 0.25, 0); spineBone.add(leftShoulder); bonesList.push(leftShoulder);
        const leftArm = new THREE.Bone(); leftArm.name = "LeftArm"; leftArm.position.set(-0.25, 0, 0); leftShoulder.add(leftArm); bonesList.push(leftArm);
        const leftForeArm = new THREE.Bone(); leftForeArm.name = "LeftForeArm"; leftForeArm.position.set(-0.25, 0, 0); leftArm.add(leftForeArm); bonesList.push(leftForeArm);

        const rightShoulder = new THREE.Bone(); rightShoulder.name = "RightShoulder"; rightShoulder.position.set(0.15, 0.25, 0); spineBone.add(rightShoulder); bonesList.push(rightShoulder);
        const rightArm = new THREE.Bone(); rightArm.name = "RightArm"; rightArm.position.set(0.25, 0, 0); rightShoulder.add(rightArm); bonesList.push(rightArm);
        const rightForeArm = new THREE.Bone(); rightForeArm.name = "RightForeArm"; rightForeArm.position.set(0.25, 0, 0); rightArm.add(rightForeArm); bonesList.push(rightForeArm);

        // Legs (Hips Y=0.80m, knees Y=0.40m, bottom Y=0.0m)
        const leftUpLeg = new THREE.Bone(); leftUpLeg.name = "LeftUpLeg"; leftUpLeg.position.set(-0.12, -0.05, 0); rootBone.add(leftUpLeg); bonesList.push(leftUpLeg);
        const leftLeg = new THREE.Bone(); leftLeg.name = "LeftLeg"; leftLeg.position.set(0, -0.40, 0); leftUpLeg.add(leftLeg); bonesList.push(leftLeg);

        const rightUpLeg = new THREE.Bone(); rightUpLeg.name = "RightUpLeg"; rightUpLeg.position.set(0.12, -0.05, 0); rootBone.add(rightUpLeg); bonesList.push(rightUpLeg);
        const rightLeg = new THREE.Bone(); rightLeg.name = "RightLeg"; rightLeg.position.set(0, -0.40, 0); rightUpLeg.add(rightLeg); bonesList.push(rightLeg);

        // Map bones list internally for updatePose to dynamically drive
        this.bones = {};
        bonesList.forEach(bone => {
            this.bones[bone.name] = bone;
        });

        // 2. Compute SkinIndices and SkinWeights based on vertex coordinates
        const positionAttr = geometry.attributes.position;
        const skinIndices = [];
        const skinWeights = [];

        // Bone Indices:
        // 0: Root, 1: Spine, 2: Neck, 3: Head,
        // 4: LeftShoulder, 5: LeftArm, 6: LeftForeArm,
        // 7: RightShoulder, 8: RightArm, 9: RightForeArm,
        // 10: LeftUpLeg, 11: LeftLeg,
        // 12: RightUpLeg, 13: RightLeg

        for (let i = 0; i < positionAttr.count; i++) {
            const x = positionAttr.getX(i);
            const y = positionAttr.getY(i);
            const z = positionAttr.getZ(i);

            let b1 = 1; // Spine by default
            let w1 = 1.0;
            let b2 = 1;
            let w2 = 0.0;

            // --- 1. Head & Neck Transition (around Y = 1.35m) ---
            if (y > 1.35) {
                const d = 0.10; // 10cm transition zone
                const yMin = 1.30;
                const yMax = 1.40;
                if (y > yMax) {
                    b1 = 3; // 100% Head
                    w1 = 1.0;
                } else {
                    // Blending Head and Spine
                    const t = (y - yMin) / d;
                    b1 = 3; // Head
                    w1 = t;
                    b2 = 1; // Spine
                    w2 = 1.0 - t;
                }
            } 
            // --- 2. Upper Body Torso / Arms Transition (Y between 0.70m and 1.30m) ---
            else if (y > 0.70) {
                // We are in Torso or Arms
                // Check Left Arm
                if (x < -0.15) {
                    const d = 0.08; // 8cm transition zone
                    const xMin = -0.23;
                    const xMax = -0.15;
                    
                    // Determine which left arm bone (Arm vs ForeArm)
                    let leftArmBone = 5; // LeftArm (Upper)
                    let leftArmWeight = 1.0;
                    let leftForeArmBone = 6;
                    let leftForeArmWeight = 0.0;
                    
                    if (y > 1.15) {
                        const dy = 0.10;
                        if (y > 1.20) {
                            leftArmBone = 5;
                            leftArmWeight = 1.0;
                        } else {
                            const ty = (y - 1.10) / dy;
                            leftArmBone = 5;
                            leftArmWeight = ty;
                            leftForeArmBone = 6;
                            leftForeArmWeight = 1.0 - ty;
                        }
                    } else {
                        leftArmBone = 6; // Forearm
                        leftArmWeight = 1.0;
                    }

                    if (x < xMin) {
                        // 100% Left Arm
                        b1 = leftArmBone;
                        w1 = leftArmWeight;
                        b2 = leftForeArmBone;
                        w2 = leftForeArmWeight;
                    } else {
                        // Blending Left Arm and Spine (1)
                        const t = (x - xMin) / d; // ranges 0 (at -0.23) to 1 (at -0.15)
                        b1 = 1; // Spine
                        w1 = t;
                        b2 = leftArmBone;
                        w2 = (1.0 - t) * leftArmWeight;
                        // In Three.js skin weights must sum to 1.0, so normalize them
                        const sum = w1 + w2;
                        if (sum > 0) {
                            w1 /= sum;
                            w2 /= sum;
                        }
                    }
                }
                // Check Right Arm
                else if (x > 0.15) {
                    const d = 0.08;
                    const xMin = 0.15;
                    const xMax = 0.23;
                    
                    let rightArmBone = 8; // RightArm (Upper)
                    let rightArmWeight = 1.0;
                    let rightForeArmBone = 9;
                    let rightForeArmWeight = 0.0;
                    
                    if (y > 1.15) {
                        const dy = 0.10;
                        if (y > 1.20) {
                            rightArmBone = 8;
                            rightArmWeight = 1.0;
                        } else {
                            const ty = (y - 1.10) / dy;
                            rightArmBone = 8;
                            rightArmWeight = ty;
                            rightForeArmBone = 9;
                            rightForeArmWeight = 1.0 - ty;
                        }
                    } else {
                        rightArmBone = 9; // Forearm
                        rightArmWeight = 1.0;
                    }

                    if (x > xMax) {
                        // 100% Right Arm
                        b1 = rightArmBone;
                        w1 = rightArmWeight;
                        b2 = rightForeArmBone;
                        w2 = rightForeArmWeight;
                    } else {
                        // Blending Spine (1) and Right Arm
                        const t = (x - xMin) / d; // ranges 0 (at 0.15) to 1 (at 0.23)
                        b1 = rightArmBone;
                        w1 = t * rightArmWeight;
                        b2 = 1; // Spine
                        w2 = 1.0 - t;
                        const sum = w1 + w2;
                        if (sum > 0) {
                            w1 /= sum;
                            w2 /= sum;
                        }
                    }
                }
                // Center Chest
                else {
                    b1 = 1; // Spine
                    w1 = 1.0;
                }
            }
            // --- 3. Torso to Hips / Legs transition (Y around 0.65m) ---
            else {
                // Lower body (Y <= 0.70)
                const d_hip = 0.10; // transition zone 0.60 to 0.70
                let hipBlendWeight = 0.0;
                
                if (y > 0.60) {
                    hipBlendWeight = (y - 0.60) / d_hip; // weight of Spine (1)
                }
                
                // Groin transition zone (X around 0.0)
                let legBone = 10; // Left thigh
                let legWeight = 1.0;
                let blendLegBone = 10;
                let blendLegWeight = 0.0;
                
                // First determine Thigh vs Shin (knee boundary 0.35m, zone 0.30 to 0.40)
                const determineLegSegment = (isLeft, py) => {
                    const upLeg = isLeft ? 10 : 12;
                    const lowLeg = isLeft ? 11 : 13;
                    if (py > 0.40) return [upLeg, 1.0, upLeg, 0.0];
                    if (py < 0.30) return [lowLeg, 1.0, lowLeg, 0.0];
                    const t = (py - 0.30) / 0.10;
                    return [upLeg, t, lowLeg, 1.0 - t];
                };
                
                // Groin center blending
                if (x > -0.04 && x < 0.04) {
                    const t = (x - (-0.04)) / 0.08; // 0 (left) to 1 (right)
                    const [lBone, lW, lBoneB, lWB] = determineLegSegment(true, y);
                    const [rBone, rW, rBoneB, rWB] = determineLegSegment(false, y);
                    
                    legBone = rBone;
                    legWeight = t * rW;
                    blendLegBone = lBone;
                    blendLegWeight = (1.0 - t) * lW;
                } else if (x < 0.0) {
                    const [lBone, lW, lBoneB, lWB] = determineLegSegment(true, y);
                    legBone = lBone;
                    legWeight = lW;
                    blendLegBone = lBoneB;
                    blendLegWeight = lWB;
                } else {
                    const [rBone, rW, rBoneB, rWB] = determineLegSegment(false, y);
                    legBone = rBone;
                    legWeight = rW;
                    blendLegBone = rBoneB;
                    blendLegWeight = rWB;
                }
                
                if (hipBlendWeight > 0.0) {
                    // Blend Spine (1) and Legs
                    b1 = 1; // Spine
                    w1 = hipBlendWeight;
                    b2 = legBone;
                    w2 = (1.0 - hipBlendWeight) * legWeight;
                    const sum = w1 + w2;
                    if (sum > 0) {
                        w1 /= sum;
                        w2 /= sum;
                    }
                } else {
                    b1 = legBone;
                    w1 = legWeight;
                    b2 = blendLegBone;
                    w2 = blendLegWeight;
                }
            }

            skinIndices.push(b1, b2, 0, 0);
            skinWeights.push(w1, w2, 0, 0);
        }

        geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
        geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

        // 3. Package the model as a SkinnedMesh and bind the skeleton!
        const material = this.model.material;
        const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
        
        const skeleton = new THREE.Skeleton(bonesList);
        skinnedMesh.add(bonesList[0]); // Add root bone
        skinnedMesh.bind(skeleton);

        this.scene.remove(this.model);
        this.model = skinnedMesh;
        this.scene.add(this.model);
        
        this.skeleton = skeleton;

        // Add 3D skeleton helper to make bone structure visible!
        if (this.skeletonHelper) {
            this.scene.remove(this.skeletonHelper);
        }
        this.skeletonHelper = new THREE.SkeletonHelper(this.model);
        this.scene.add(this.skeletonHelper);

        console.log("[3D Engine Rigging]: Successfully segmented and programmatically rigged raw STL model!");
    }

    /**
     * Update movement speed (velocity) for dynamic Sancai glaze melting
     * @param {number} velocity 
     */
    updateVelocity(velocity) {
        if (this.customUniforms) {
            // Soft lerp interpolation to avoid color flickering
            this.customUniforms.u_velocity.value += (velocity - this.customUniforms.u_velocity.value) * 0.08;
        }
    }
}
