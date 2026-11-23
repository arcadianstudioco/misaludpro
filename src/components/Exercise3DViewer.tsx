import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { ExerciseAnimKind } from '../types/health';

interface Exercise3DViewerProps {
  exerciseName: string;
  animKind: ExerciseAnimKind;
  isResting?: boolean;
  heightClass?: string;
}

type CameraPreset = '3/4' | 'frontal' | 'lateral';

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  '3/4': { pos: [2.05, 1.45, 2.35], target: [0, 0.85, 0] },
  frontal: { pos: [0, 1.25, 2.95], target: [0, 0.85, 0] },
  lateral: { pos: [2.85, 1.15, 0.15], target: [0, 0.82, 0] },
};

export function inferExerciseAnimKind(id: string, name: string, explicit?: ExerciseAnimKind): ExerciseAnimKind {
  if (explicit) return explicit;
  const n = `${id} ${name}`.toLowerCase();
  if (n.includes('sentadilla') || n.includes('prensa')) return 'squat';
  if (n.includes('flexion') || n.includes('pecho')) return 'pushup';
  if (n.includes('remo')) return 'row';
  if (n.includes('plancha')) return 'plank';
  if (n.includes('jumping')) return 'jumping_jacks';
  if (n.includes('mountain') || n.includes('climber')) return 'mountain_climber';
  if (n.includes('burpee')) return 'burpee';
  if (n.includes('gato') || n.includes('vaca')) return 'cat_cow';
  if (n.includes('90/90') || n.includes('cadera')) return 'hip_90_90';
  if (n.includes('estiramiento') || n.includes('flexor')) return 'stretch';
  if (n.includes('pulso')) return 'kegel_pulse';
  if (n.includes('kegel') || n.includes('respiración') || n.includes('contracción')) return 'kegel_breath';
  if (n.includes('jalón')) return 'pulldown';
  if (n.includes('press')) return 'press';
  if (n.includes('correr') || n.includes('caminata')) return 'run';
  return 'squat';
}

const ANIM_PHASE_LABELS: Record<ExerciseAnimKind, string> = {
  squat: 'Descenso controlado · Empuje',
  pushup: 'Flexión a 45° · Core firme',
  row: 'Tracción escapular · Remo',
  plank: 'Isometría abdominal continua',
  jumping_jacks: 'Salto rítmico · Apertura',
  mountain_climber: 'Drive alterno de rodillas',
  burpee: 'Sentadilla · Plancha · Extensión',
  cat_cow: 'Movilidad dorsal · Respiración',
  hip_90_90: 'Rotación interna/externa 90°',
  stretch: 'Extensión de cadera e isquios',
  kegel_breath: 'Contraer 5s · Relajar 5s',
  kegel_pulse: 'Pulsos rápidos de control',
  press: 'Empuje vertical controlado',
  pulldown: 'Tracción vertical dorsal',
  run: 'Zancada y braceo continuo',
};

export function Exercise3DViewer({
  exerciseName,
  animKind,
  isResting = false,
  heightClass = 'h-56',
}: Exercise3DViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<0.75 | 1>(1);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('3/4');
  const [phaseLabel, setPhaseLabel] = useState(ANIM_PHASE_LABELS[animKind]);
  const [webglError, setWebglError] = useState(false);

  const animKindRef = useRef<ExerciseAnimKind>(animKind);
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  const isRestingRef = useRef(isResting);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    animKindRef.current = animKind;
    setPhaseLabel(isResting ? 'Respira lento · Recuperación' : ANIM_PHASE_LABELS[animKind]);
  }, [animKind, isResting]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    isRestingRef.current = isResting;
  }, [isResting]);

  const applyCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (cam && ctrl) {
      const cfg = CAMERA_PRESETS[preset];
      cam.position.set(...cfg.pos);
      ctrl.target.set(...cfg.target);
      ctrl.update();
    }
  };

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Mesa/i.test(rendererStr);

    const width = Math.max(240, mount.clientWidth);
    const height = Math.max(180, mount.clientHeight);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1.25 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c110e);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 40);
    camera.position.set(...CAMERA_PRESETS['3/4'].pos);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.65;
    controls.maxDistance = 4.5;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(...CAMERA_PRESETS['3/4'].target);
    controls.update();
    controlsRef.current = controls;

    // 3-point fitness studio lighting
    const hemi = new THREE.HemisphereLight(0xcbe8cf, 0x162019, 0.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
    keyLight.position.set(2.5, 4.2, 2.8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 12;
      keyLight.shadow.camera.left = -2;
      keyLight.shadow.camera.right = 2;
      keyLight.shadow.camera.top = 2;
      keyLight.shadow.camera.bottom = -2;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8bc7ff, 0.55);
    fillLight.position.set(-2.8, 2.0, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x74d834, 1.15);
    rimLight.position.set(-1.5, 2.6, -2.8);
    scene.add(rimLight);

    // Studio floor, grid & exercise mat
    const floorGeo = new THREE.CircleGeometry(3.2, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x101712,
      roughness: 0.88,
      metalness: 0.08,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(4.4, 16, 0x2c4230, 0x1a261d);
    grid.position.y = 0.002;
    scene.add(grid);

    const matGeo = new THREE.BoxGeometry(0.86, 0.024, 1.85);
    const matMat = new THREE.MeshStandardMaterial({
      color: 0x1c2c20,
      roughness: 0.8,
      metalness: 0.05,
    });
    const exerciseMat = new THREE.Mesh(matGeo, matMat);
    exerciseMat.position.set(0, 0.012, 0.05);
    exerciseMat.receiveShadow = true;
    scene.add(exerciseMat);

    // Subtle glowing ground ring
    const ringGeo = new THREE.RingGeometry(0.58, 0.62, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x74d834,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const groundRing = new THREE.Mesh(ringGeo, ringMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.026;
    scene.add(groundRing);

    // Kegel biofeedback ring (shown during kegel/plank core focus)
    const bioRingGeo = new THREE.TorusGeometry(0.24, 0.018, 12, 36);
    const bioRingMat = new THREE.MeshBasicMaterial({
      color: 0x74d834,
      transparent: true,
      opacity: 0,
    });
    const bioRing = new THREE.Mesh(bioRingGeo, bioRingMat);
    bioRing.rotation.x = Math.PI / 2;
    scene.add(bioRing);

    // Shared athletic character materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd9a17c,
      roughness: 0.55,
      metalness: 0.02,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0x1e2c22,
      roughness: 0.65,
      metalness: 0.05,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x74d834,
      roughness: 0.35,
      metalness: 0.12,
      emissive: 0x183808,
      emissiveIntensity: 0.45,
    });
    const shortsMat = new THREE.MeshStandardMaterial({
      color: 0x141816,
      roughness: 0.72,
      metalness: 0.05,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xe6ece7,
      roughness: 0.48,
      metalness: 0.08,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x9aa89e,
      roughness: 0.28,
      metalness: 0.85,
    });
    const weightMat = new THREE.MeshStandardMaterial({
      color: 0x262d28,
      roughness: 0.5,
      metalness: 0.45,
    });

    const disposables: Array<{ dispose: () => void }> = [
      floorGeo,
      floorMat,
      matGeo,
      matMat,
      ringGeo,
      ringMat,
      bioRingGeo,
      bioRingMat,
      skinMat,
      shirtMat,
      accentMat,
      shortsMat,
      shoeMat,
      metalMat,
      weightMat,
    ];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      disposables.push(g);
      return g;
    };

    const makeLimb = (topR: number, botR: number, len: number, mat: THREE.Material) => {
      const m = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(topR, botR, len, 14)), mat);
      m.castShadow = !isSoftwareGl;
      return m;
    };

    const makeJointBall = (r: number, mat: THREE.Material) => {
      const m = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(r, 12, 12)), mat);
      m.castShadow = !isSoftwareGl;
      return m;
    };

    const makeDumbbell = () => {
      const grp = new THREE.Group();
      const bar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 10)), metalMat);
      bar.rotation.z = Math.PI / 2;
      const w1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 14)), weightMat);
      w1.rotation.z = Math.PI / 2;
      w1.position.x = -0.095;
      const w2 = w1.clone();
      w2.position.x = 0.095;
      grp.add(bar, w1, w2);
      grp.visible = false;
      return grp;
    };

    // Assemble articulated humanoid rig
    const rigRoot = new THREE.Group();
    scene.add(rigRoot);

    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.set(0, 0.95, 0);
    rigRoot.add(pelvisGroup);

    const pelvisMesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.145, 0.135, 0.16, 16)), shortsMat);
    pelvisMesh.castShadow = !isSoftwareGl;
    pelvisGroup.add(pelvisMesh);

    // Torso pivot at top of pelvis
    const torsoPivot = new THREE.Group();
    torsoPivot.position.set(0, 0.07, 0);
    pelvisGroup.add(torsoPivot);

    const chestMesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.185, 0.135, 0.44, 16)), shirtMat);
    chestMesh.position.set(0, 0.23, 0);
    chestMesh.castShadow = !isSoftwareGl;
    torsoPivot.add(chestMesh);

    // Lime athletic chest stripe to show orientation clearly
    const chestStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.24, 0.03)), accentMat);
    chestStripe.position.set(0, 0.24, 0.155);
    torsoPivot.add(chestStripe);

    // Neck + Head
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0.47, 0);
    torsoPivot.add(neckPivot);

    const neckMesh = makeLimb(0.055, 0.06, 0.08, skinMat);
    neckMesh.position.set(0, 0.04, 0);
    neckPivot.add(neckMesh);

    const headMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.115, 18, 16)), skinMat);
    headMesh.position.set(0, 0.16, 0.01);
    headMesh.castShadow = !isSoftwareGl;
    neckPivot.add(headMesh);

    const headband = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.113, 0.016, 10, 24)), accentMat);
    headband.rotation.x = Math.PI / 2 - 0.12;
    headband.position.set(0, 0.195, 0.01);
    neckPivot.add(headband);

    // Arms helper
    const buildArm = (side: 1 | -1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.225, 0.41, 0);
      torsoPivot.add(shoulder);
      shoulder.add(makeJointBall(0.055, shirtMat));

      const upper = makeLimb(0.05, 0.042, 0.27, skinMat);
      upper.position.set(0, -0.135, 0);
      shoulder.add(upper);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.27, 0);
      shoulder.add(elbow);
      elbow.add(makeJointBall(0.042, skinMat));

      const forearm = makeLimb(0.04, 0.032, 0.25, skinMat);
      forearm.position.set(0, -0.125, 0);
      elbow.add(forearm);

      const wrist = new THREE.Group();
      wrist.position.set(0, -0.25, 0);
      elbow.add(wrist);
      wrist.add(makeJointBall(0.038, accentMat));

      const dumbbell = makeDumbbell();
      wrist.add(dumbbell);

      return { shoulder, elbow, wrist, dumbbell };
    };

    const leftArm = buildArm(1);
    const rightArm = buildArm(-1);

    // Legs helper
    const buildLeg = (side: 1 | -1) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.105, -0.04, 0);
      pelvisGroup.add(hip);
      hip.add(makeJointBall(0.068, shortsMat));

      const thigh = makeLimb(0.072, 0.056, 0.42, shortsMat);
      thigh.position.set(0, -0.21, 0);
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, -0.42, 0);
      hip.add(knee);
      knee.add(makeJointBall(0.054, skinMat));

      const calf = makeLimb(0.052, 0.038, 0.42, skinMat);
      calf.position.set(0, -0.21, 0);
      knee.add(calf);

      const ankle = new THREE.Group();
      ankle.position.set(0, -0.42, 0);
      knee.add(ankle);

      const shoe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.095, 0.075, 0.19)), shoeMat);
      shoe.position.set(0, -0.025, 0.045);
      shoe.castShadow = !isSoftwareGl;
      ankle.add(shoe);

      return { hip, knee, ankle };
    };

    const leftLeg = buildLeg(1);
    const rightLeg = buildLeg(-1);

    // Lat pulldown bar prop
    const barProp = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.78, 12)), metalMat);
    barProp.rotation.z = Math.PI / 2;
    barProp.visible = false;
    scene.add(barProp);

    const resetPose = () => {
      rigRoot.position.set(0, 0, 0);
      rigRoot.rotation.set(0, 0, 0);
      pelvisGroup.position.set(0, 0.95, 0);
      pelvisGroup.rotation.set(0, 0, 0);
      torsoPivot.rotation.set(0, 0, 0);
      torsoPivot.scale.set(1, 1, 1);
      neckPivot.rotation.set(0, 0, 0);

      leftArm.shoulder.rotation.set(0, 0, 0.12);
      rightArm.shoulder.rotation.set(0, 0, -0.12);
      leftArm.elbow.rotation.set(-0.15, 0, 0);
      rightArm.elbow.rotation.set(-0.15, 0, 0);
      leftArm.dumbbell.visible = false;
      rightArm.dumbbell.visible = false;

      leftLeg.hip.rotation.set(0, 0, 0);
      rightLeg.hip.rotation.set(0, 0, 0);
      leftLeg.knee.rotation.set(0, 0, 0);
      rightLeg.knee.rotation.set(0, 0, 0);
      leftLeg.ankle.rotation.set(0, 0, 0);
      rightLeg.ankle.rotation.set(0, 0, 0);

      barProp.visible = false;
      bioRingMat.opacity = 0;
    };

    const applyAnimation = (t: number) => {
      resetPose();
      if (isRestingRef.current) {
        const breath = Math.sin(t * 1.8) * 0.5 + 0.5;
        torsoPivot.scale.set(1 + breath * 0.04, 1, 1 + breath * 0.04);
        leftArm.shoulder.rotation.set(-0.1, 0, 0.18 + breath * 0.05);
        rightArm.shoulder.rotation.set(-0.1, 0, -0.18 - breath * 0.05);
        leftArm.elbow.rotation.set(-0.4, 0, 0);
        rightArm.elbow.rotation.set(-0.4, 0, 0);
        return;
      }

      const kind = animKindRef.current;

      switch (kind) {
        case 'squat': {
          const depth = (1 - Math.cos(t * 2.4)) * 0.5;
          pelvisGroup.position.set(0, 0.95 - depth * 0.36, -depth * 0.14);
          torsoPivot.rotation.x = depth * 0.42;
          leftLeg.hip.rotation.set(-depth * 1.2, 0, 0.08);
          rightLeg.hip.rotation.set(-depth * 1.2, 0, -0.08);
          leftLeg.knee.rotation.x = depth * 1.82;
          rightLeg.knee.rotation.x = depth * 1.82;
          leftLeg.ankle.rotation.x = -depth * 0.55;
          rightLeg.ankle.rotation.x = -depth * 0.55;
          leftArm.shoulder.rotation.set(-depth * 1.35 - 0.15, 0, 0.12);
          rightArm.shoulder.rotation.set(-depth * 1.35 - 0.15, 0, -0.12);
          leftArm.elbow.rotation.x = -0.25;
          rightArm.elbow.rotation.x = -0.25;
          break;
        }

        case 'pushup': {
          const bend = (1 - Math.cos(t * 2.8)) * 0.5;
          rigRoot.rotation.x = Math.PI / 2 - 0.12 + bend * 0.08;
          rigRoot.position.set(0, 0.42 - bend * 0.21, -0.45);
          leftArm.shoulder.rotation.set(-Math.PI / 2 - 0.1, 0, 0.28 + bend * 0.25);
          rightArm.shoulder.rotation.set(-Math.PI / 2 - 0.1, 0, -0.28 - bend * 0.25);
          leftArm.elbow.rotation.set(-bend * 1.35 - 0.08, 0, -bend * 0.35);
          rightArm.elbow.rotation.set(-bend * 1.35 - 0.08, 0, bend * 0.35);
          leftLeg.ankle.rotation.x = -0.95;
          rightLeg.ankle.rotation.x = -0.95;
          break;
        }

        case 'row': {
          const pull = (1 - Math.cos(t * 2.8)) * 0.5;
          leftArm.dumbbell.visible = true;
          rightArm.dumbbell.visible = true;
          pelvisGroup.position.set(0, 0.88, -0.08);
          torsoPivot.rotation.x = 0.72;
          neckPivot.rotation.x = -0.45;
          leftLeg.hip.rotation.x = -0.35;
          rightLeg.hip.rotation.x = -0.35;
          leftLeg.knee.rotation.x = 0.55;
          rightLeg.knee.rotation.x = 0.55;
          leftArm.shoulder.rotation.set(-0.65 + pull * 0.95, 0, 0.1);
          rightArm.shoulder.rotation.set(-0.65 + pull * 0.95, 0, -0.1);
          leftArm.elbow.rotation.x = -0.25 - pull * 1.35;
          rightArm.elbow.rotation.x = -0.25 - pull * 1.35;
          break;
        }

        case 'plank': {
          const pulse = Math.sin(t * 2.2) * 0.5 + 0.5;
          rigRoot.rotation.x = Math.PI / 2 - 0.08;
          rigRoot.position.set(0, 0.28 + pulse * 0.012, -0.45);
          leftArm.shoulder.rotation.set(-Math.PI / 2 + 0.15, 0, 0.08);
          rightArm.shoulder.rotation.set(-Math.PI / 2 + 0.15, 0, -0.08);
          leftArm.elbow.rotation.x = -1.45;
          rightArm.elbow.rotation.x = -1.45;
          leftLeg.ankle.rotation.x = -0.95;
          rightLeg.ankle.rotation.x = -0.95;
          bioRing.position.set(0, 0.26, 0.1);
          bioRing.scale.setScalar(1 + pulse * 0.12);
          bioRingMat.opacity = 0.38 + pulse * 0.32;
          break;
        }

        case 'jumping_jacks': {
          const cycle = (1 - Math.cos(t * 4.8)) * 0.5;
          const jump = Math.sin(Math.min(1, cycle) * Math.PI) * 0.11;
          pelvisGroup.position.y = 0.95 + jump;
          leftLeg.hip.rotation.z = cycle * 0.42;
          rightLeg.hip.rotation.z = -cycle * 0.42;
          leftLeg.knee.rotation.x = 0.08 + jump * 0.6;
          rightLeg.knee.rotation.x = 0.08 + jump * 0.6;
          leftArm.shoulder.rotation.set(0, 0, 0.15 + cycle * 2.65);
          rightArm.shoulder.rotation.set(0, 0, -0.15 - cycle * 2.65);
          leftArm.elbow.rotation.x = -0.18;
          rightArm.elbow.rotation.x = -0.18;
          break;
        }

        case 'mountain_climber': {
          const phase = t * 5.2;
          const leftDrive = Math.max(0, Math.sin(phase));
          const rightDrive = Math.max(0, -Math.sin(phase));
          rigRoot.rotation.x = Math.PI / 2 - 0.18;
          rigRoot.position.set(0, 0.44, -0.42);
          leftArm.shoulder.rotation.set(-Math.PI / 2 + 0.18, 0, 0.14);
          rightArm.shoulder.rotation.set(-Math.PI / 2 + 0.18, 0, -0.14);
          leftLeg.hip.rotation.x = -leftDrive * 1.35;
          leftLeg.knee.rotation.x = leftDrive * 1.75;
          rightLeg.hip.rotation.x = -rightDrive * 1.35;
          rightLeg.knee.rotation.x = rightDrive * 1.75;
          break;
        }

        case 'burpee': {
          const u = (t * 0.36) % 1;
          if (u < 0.25) {
            const p = u / 0.25;
            pelvisGroup.position.set(0, 0.95 - p * 0.45, -p * 0.1);
            torsoPivot.rotation.x = p * 0.6;
            leftLeg.hip.rotation.x = -p * 1.3;
            rightLeg.hip.rotation.x = -p * 1.3;
            leftLeg.knee.rotation.x = p * 2.0;
            rightLeg.knee.rotation.x = p * 2.0;
            leftArm.shoulder.rotation.x = -p * 1.3;
            rightArm.shoulder.rotation.x = -p * 1.3;
          } else if (u < 0.55) {
            const p = Math.sin(((u - 0.25) / 0.3) * Math.PI);
            rigRoot.rotation.x = Math.PI / 2 - 0.14;
            rigRoot.position.set(0, 0.41 - p * 0.14, -0.4);
            leftArm.shoulder.rotation.set(-Math.PI / 2, 0, 0.2);
            rightArm.shoulder.rotation.set(-Math.PI / 2, 0, -0.2);
            leftArm.elbow.rotation.x = -p * 1.1;
            rightArm.elbow.rotation.x = -p * 1.1;
          } else if (u < 0.78) {
            const p = 1 - (u - 0.55) / 0.23;
            pelvisGroup.position.set(0, 0.95 - p * 0.45, -p * 0.1);
            torsoPivot.rotation.x = p * 0.55;
            leftLeg.hip.rotation.x = -p * 1.2;
            rightLeg.hip.rotation.x = -p * 1.2;
            leftLeg.knee.rotation.x = p * 1.85;
            rightLeg.knee.rotation.x = p * 1.85;
            leftArm.shoulder.rotation.x = -p * 1.2;
            rightArm.shoulder.rotation.x = -p * 1.2;
          } else {
            const p = Math.sin(((u - 0.78) / 0.22) * Math.PI);
            pelvisGroup.position.y = 0.95 + p * 0.2;
            leftArm.shoulder.rotation.set(-p * 2.8, 0, 0.2);
            rightArm.shoulder.rotation.set(-p * 2.8, 0, -0.2);
          }
          break;
        }

        case 'cat_cow': {
          const wave = Math.sin(t * 2.0);
          rigRoot.rotation.x = Math.PI / 2;
          rigRoot.position.set(0, 0.55, -0.25);
          leftArm.shoulder.rotation.set(-Math.PI / 2, 0, 0.08);
          rightArm.shoulder.rotation.set(-Math.PI / 2, 0, -0.08);
          leftLeg.hip.rotation.x = -Math.PI / 2;
          rightLeg.hip.rotation.x = -Math.PI / 2;
          leftLeg.knee.rotation.x = Math.PI / 2;
          rightLeg.knee.rotation.x = Math.PI / 2;
          torsoPivot.rotation.x = wave * 0.28;
          neckPivot.rotation.x = -wave * 0.35;
          break;
        }

        case 'hip_90_90': {
          const sway = Math.sin(t * 1.6);
          pelvisGroup.position.set(0, 0.14, 0.05);
          torsoPivot.rotation.x = -0.12;
          leftArm.shoulder.rotation.set(0.35, 0, 0.32);
          rightArm.shoulder.rotation.set(0.35, 0, -0.32);
          leftArm.elbow.rotation.x = -0.45;
          rightArm.elbow.rotation.x = -0.45;
          leftLeg.hip.rotation.set(-1.35, sway * 0.42, 0.35 + sway * 0.28);
          rightLeg.hip.rotation.set(-1.35, sway * 0.42, -0.35 + sway * 0.28);
          leftLeg.knee.rotation.x = 1.45;
          rightLeg.knee.rotation.x = 1.45;
          break;
        }

        case 'stretch': {
          const reach = (1 - Math.cos(t * 1.5)) * 0.5;
          pelvisGroup.position.set(0, 0.58 - reach * 0.06, reach * 0.08);
          torsoPivot.rotation.x = -reach * 0.16;
          leftLeg.hip.rotation.x = -1.1 - reach * 0.22;
          leftLeg.knee.rotation.x = 1.15;
          rightLeg.hip.rotation.x = 0.65 + reach * 0.18;
          rightLeg.knee.rotation.x = 0.85;
          leftArm.shoulder.rotation.set(-2.55 - reach * 0.25, 0, 0.18);
          rightArm.shoulder.rotation.set(-2.55 - reach * 0.25, 0, -0.18);
          break;
        }

        case 'kegel_breath':
        case 'kegel_pulse': {
          const freq = kind === 'kegel_pulse' ? 4.2 : 1.35;
          const squeeze = (1 - Math.cos(t * freq)) * 0.5;
          pelvisGroup.position.set(0, 0.16 + squeeze * 0.025, 0.05);
          torsoPivot.scale.set(1 + (1 - squeeze) * 0.04, 1, 1 + (1 - squeeze) * 0.04);
          leftLeg.hip.rotation.set(-1.38, 0.45, 0.45);
          rightLeg.hip.rotation.set(-1.38, -0.45, -0.45);
          leftLeg.knee.rotation.x = 1.65;
          rightLeg.knee.rotation.x = 1.65;
          leftArm.shoulder.rotation.set(-0.35, 0, 0.28);
          rightArm.shoulder.rotation.set(-0.35, 0, -0.28);
          leftArm.elbow.rotation.x = -0.85;
          rightArm.elbow.rotation.x = -0.85;
          bioRing.position.set(0, 0.16 + squeeze * 0.03, 0.05);
          bioRing.scale.setScalar(1.25 - squeeze * 0.42);
          bioRingMat.opacity = 0.35 + squeeze * 0.55;
          break;
        }

        case 'press': {
          const lift = (1 - Math.cos(t * 2.4)) * 0.5;
          leftArm.dumbbell.visible = true;
          rightArm.dumbbell.visible = true;
          leftLeg.hip.rotation.z = 0.06;
          rightLeg.hip.rotation.z = -0.06;
          leftArm.shoulder.rotation.set(-1.45 - lift * 1.45, 0, 0.35 - lift * 0.18);
          rightArm.shoulder.rotation.set(-1.45 - lift * 1.45, 0, -0.35 + lift * 0.18);
          leftArm.elbow.rotation.x = -1.65 + lift * 1.45;
          rightArm.elbow.rotation.x = -1.65 + lift * 1.45;
          break;
        }

        case 'pulldown': {
          const pull = (1 - Math.cos(t * 2.3)) * 0.5;
          pelvisGroup.position.set(0, 0.56, 0);
          leftLeg.hip.rotation.x = -1.42;
          rightLeg.hip.rotation.x = -1.42;
          leftLeg.knee.rotation.x = 1.45;
          rightLeg.knee.rotation.x = 1.45;
          torsoPivot.rotation.x = -0.14 - pull * 0.1;
          leftArm.shoulder.rotation.set(-2.65 + pull * 1.25, 0, 0.45 + pull * 0.12);
          rightArm.shoulder.rotation.set(-2.65 + pull * 1.25, 0, -0.45 - pull * 0.12);
          leftArm.elbow.rotation.x = -0.25 - pull * 1.45;
          rightArm.elbow.rotation.x = -0.25 - pull * 1.45;
          barProp.visible = true;
          barProp.position.set(0, 1.72 - pull * 0.58, 0.14);
          break;
        }

        case 'run': {
          const phase = t * 6.5;
          const s = Math.sin(phase);
          const bounce = Math.abs(Math.cos(phase)) * 0.06;
          pelvisGroup.position.set(0, 0.94 + bounce, 0);
          torsoPivot.rotation.x = 0.16;
          leftLeg.hip.rotation.x = -s * 0.75;
          rightLeg.hip.rotation.x = s * 0.75;
          leftLeg.knee.rotation.x = Math.max(0.15, -s * 1.1 + 0.55);
          rightLeg.knee.rotation.x = Math.max(0.15, s * 1.1 + 0.55);
          leftArm.shoulder.rotation.x = s * 0.72 - 0.2;
          rightArm.shoulder.rotation.x = -s * 0.72 - 0.2;
          leftArm.elbow.rotation.x = -1.25;
          rightArm.elbow.rotation.x = -1.25;
          break;
        }
      }
    };

    const clock = new THREE.Clock();
    let elapsedAnim = 0;
    let rafId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      if (isPlayingRef.current) {
        elapsedAnim += dt * speedRef.current;
      }
      applyAnimation(elapsedAnim);
      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        window.setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(tick);
        }, 32);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    tick();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(200, Math.round(entry.contentRect.width));
        const h = Math.max(160, Math.round(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    ro.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      envRT.dispose();
      renderer.dispose();
    };
  }, []);

  if (webglError) {
    return (
      <div className={`${heightClass} w-full rounded-2xl bg-[#0C110E] border border-white/8 flex flex-col items-center justify-center p-4 text-center`}>
        <p className="font-display text-sm font-semibold text-white">{exerciseName}</p>
        <p className="text-xs text-[#9AA89E] mt-1">{phaseLabel}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#0B100D] border border-white/10 overflow-hidden keep-dark">
      {/* Header strip */}
      <div className="px-3 py-2 bg-[#121A15] border-b border-white/8 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[#74D834] uppercase tracking-wider">
            Guía 3D Interactiva
          </p>
          <p className="text-xs font-display font-semibold text-white truncate">
            {exerciseName}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(['3/4', 'frontal', 'lateral'] as CameraPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyCameraPreset(preset)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-colors ${
                cameraPreset === preset
                  ? 'bg-[#74D834] text-[#081007]'
                  : 'bg-[#19231C] text-[#9AA89E] hover:text-white'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas Container — intentionally NO backdrop-blur overlays */}
      <div ref={containerRef} className={`${heightClass} w-full relative`} />

      {/* Playback controls bar below canvas */}
      <div className="px-3 py-2 bg-[#111713] border-t border-white/8 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[#9AA89E] truncate">{phaseLabel}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 0.75 : 1))}
            className="px-2 py-1 rounded-lg bg-[#1A231D] text-[10px] font-mono-nums text-[#DCE6DD] cursor-pointer"
          >
            {speed}x
          </button>
          <button
            type="button"
            onClick={() => applyCameraPreset('3/4')}
            aria-label="Restablecer cámara 3D"
            className="w-7 h-7 rounded-lg bg-[#1A231D] text-[#C5D0C8] flex items-center justify-center cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pausar animación 3D' : 'Reproducir animación 3D'}
            className="w-7 h-7 rounded-lg bg-[#74D834] text-[#081007] flex items-center justify-center cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
