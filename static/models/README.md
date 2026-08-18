# 3D Assets Folder

Please place your rigged 3D character models (GLTF/GLB format) in this folder.

To match the assets defined in `server.py`, name them as:
- `sancai_lady.glb`: Elegant female dancer / lady figurine.
- `sancai_warrior.glb`: Power / Martial warrior figurine.
- `sancai_camel.glb`: Camel dancer / rhythm figurine.

## Rigging & Bone Names

To drive the bone rotations correctly, ensure your models are rigged with standard skeletal hierarchies. The application will automatically scan the GLTF nodes for standard bone names (supporting Mixamo/VRM conventions):
- Hips/Root: `hips`, `root`
- Spine: `spine`
- Head/Neck: `head`, `neck`
- Left Shoulder/Arm/Forearm: `leftshoulder`, `leftarm`/`leftuparm`, `leftforearm`
- Right Shoulder/Arm/Forearm: `rightshoulder`, `rightarm`/`rightuparm`, `rightforearm`
- Left UpLeg/Leg: `leftupleg`/`leftthigh`, `leftleg`/`leftcalf`
- Right UpLeg/Leg: `rightupleg`/`rightthigh`, `rightleg`/`rightcalf`

If a model is missing, the engine automatically generates a stylized 3D "Bauhaus Sancai Puppet" procedurally so the application never breaks!
