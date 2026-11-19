// Исходник 3D-сцены «Многогранники». Собирается esbuild в assets/geometry3d.js (IIFE, без CDN).
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, LineSegments, Points,
  TetrahedronGeometry, BoxGeometry, OctahedronGeometry, DodecahedronGeometry, IcosahedronGeometry,
  EdgesGeometry, BufferGeometry, Float32BufferAttribute, MeshPhongMaterial, LineBasicMaterial,
  PointsMaterial, PointLight, AmbientLight, Color, DoubleSide, MathUtils,
  InstancedMesh, SphereGeometry, CylinderGeometry, MeshBasicMaterial, Matrix4, Quaternion, Vector3, AdditiveBlending,
} from 'three';

const SOLIDS = {
  tetra: { name: 'Тетраэдр', make: () => new TetrahedronGeometry(1.7), V: 4, E: 6, F: 4, faces: 'треугольники' },
  cube:  { name: 'Куб', make: () => new BoxGeometry(2.2, 2.2, 2.2), V: 8, E: 12, F: 6, faces: 'квадраты' },
  octa:  { name: 'Октаэдр', make: () => new OctahedronGeometry(1.8), V: 6, E: 12, F: 8, faces: 'треугольники' },
  dodeca: { name: 'Додекаэдр', make: () => new DodecahedronGeometry(1.7), V: 20, E: 30, F: 12, faces: 'пятиугольники' },
  icosa: { name: 'Икосаэдр', make: () => new IcosahedronGeometry(1.8), V: 12, E: 30, F: 20, faces: 'треугольники' },
};

function createScene(canvas, opts = {}) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  scene.add(new AmbientLight(0x6b7bb5, 0.9));
  const l1 = new PointLight(0x22d3ee, 38, 30); l1.position.set(4, 3, 5); scene.add(l1);
  const l2 = new PointLight(0xa78bfa, 34, 30); l2.position.set(-5, -2, 4); scene.add(l2);
  const l3 = new PointLight(0xf472b6, 20, 30); l3.position.set(0, 5, -3); scene.add(l3);

  // звёздная пыль на фоне
  const starPos = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 26;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
    starPos[i * 3 + 2] = -2 - Math.random() * 12;
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new Float32BufferAttribute(starPos, 3));
  const stars = new Points(starGeo, new PointsMaterial({ color: 0x8fb4ff, size: 0.045, transparent: true, opacity: 0.7 }));
  scene.add(stars);

  const group = new Group();
  scene.add(group);

  let current = null;
  const fillMat = new MeshPhongMaterial({
    color: new Color(0x12335c), emissive: new Color(0x0a1a38), specular: new Color(0x9be7ff),
    shininess: 80, transparent: true, opacity: 0.30, flatShading: true, side: DoubleSide, depthWrite: false,
  });
  const coreMat = new MeshBasicMaterial({ color: 0xa5f3fc });
  const glowMat = new MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.20, blending: AdditiveBlending, depthWrite: false });
  const vertMat = new MeshBasicMaterial({ color: 0xf0abfc });
  const cylCore = new CylinderGeometry(0.028, 0.028, 1, 8, 1, true);
  const cylGlow = new CylinderGeometry(0.085, 0.085, 1, 10, 1, true);
  const sphGeo = new SphereGeometry(0.095, 16, 12);
  const Y = new Vector3(0, 1, 0);

  function disposeCurrent() {
    while (group.children.length) {
      const ch = group.children.pop();
      if (ch.isInstancedMesh) ch.dispose();
      else if (ch.geometry) ch.geometry.dispose();
    }
  }

  // рёбра рисуем тонкими цилиндрами: одинаково толстые на любом экране (у WebGL-линий всегда 1px)
  function edgeSet(edges, geo, mat) {
    const p = edges.attributes.position, n = p.count / 2;
    const im = new InstancedMesh(geo, mat, n);
    const a = new Vector3(), b = new Vector3(), m = new Matrix4(), q = new Quaternion();
    for (let i = 0; i < n; i++) {
      a.fromBufferAttribute(p, i * 2); b.fromBufferAttribute(p, i * 2 + 1);
      const dir = b.clone().sub(a), len = dir.length();
      q.setFromUnitVectors(Y, dir.normalize());
      m.compose(a.clone().add(b).multiplyScalar(0.5), q, new Vector3(1, len, 1));
      im.setMatrixAt(i, m);
    }
    im.instanceMatrix.needsUpdate = true;
    return im;
  }

  function setSolid(key) {
    const def = SOLIDS[key];
    if (!def) return null;
    disposeCurrent();
    const geo = def.make();
    group.add(new Mesh(geo, fillMat));
    // порог 1° склеивает копланарные треугольники в настоящие грани многогранника
    const edges = new EdgesGeometry(geo, 1);
    group.add(edgeSet(edges, cylGlow, glowMat));
    group.add(edgeSet(edges, cylCore, coreMat));
    // вершины: уникальные точки из геометрии рёбер
    const p = edges.attributes.position, seen = new Set(), pts = [];
    for (let i = 0; i < p.count; i++) {
      const k = p.getX(i).toFixed(3) + '|' + p.getY(i).toFixed(3) + '|' + p.getZ(i).toFixed(3);
      if (!seen.has(k)) { seen.add(k); pts.push(new Vector3(p.getX(i), p.getY(i), p.getZ(i))); }
    }
    const verts = new InstancedMesh(sphGeo, vertMat, pts.length), m = new Matrix4();
    pts.forEach((v, i) => { m.makeTranslation(v.x, v.y, v.z); verts.setMatrixAt(i, m); });
    verts.instanceMatrix.needsUpdate = true;
    group.add(verts);
    current = key;
    group.scale.setScalar(0.01); // плавное появление
    return { key, ...def, vertsCounted: pts.length };
  }

  // вращение: автоповорот + перетаскивание пальцем / мышью с инерцией
  let vx = 0.0045, vy = 0.0075, dragging = false, lastX = 0, lastY = 0;
  const AUTO_X = 0.0045, AUTO_Y = 0.0075;
  const onDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} };
  const onMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    group.rotation.y += dx * 0.011; group.rotation.x += dy * 0.011;
    vy = dx * 0.011; vx = dy * 0.011;
  };
  const onUp = () => { dragging = false; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 1.1 ? 8 : 6.2;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let raf = 0, running = false, t0 = performance.now();
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    if (!dragging) {
      // затухание инерции к скорости автоповорота
      vx += (AUTO_X - vx) * 0.04; vy += (AUTO_Y - vy) * 0.04;
      group.rotation.x += vx; group.rotation.y += vy;
    }
    const s = group.scale.x;
    if (s < 1) group.scale.setScalar(Math.min(1, s + (1 - s) * 0.12 + 0.004));
    group.position.y = Math.sin(t * 1.1) * 0.12;
    stars.rotation.y = t * 0.02;
    l1.position.x = 4 * Math.cos(t * 0.6); l1.position.z = 5 * Math.sin(t * 0.6) + 2;
    renderer.render(scene, camera);
  }
  function start() { if (running) return; running = true; resize(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function renderOnce() { renderer.render(scene, camera); }

  return { setSolid, start, stop, renderOnce, current: () => current, solids: SOLIDS, MathUtils };
}

window.GeometryScene = { create: createScene, SOLIDS };
