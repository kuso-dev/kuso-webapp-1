window.addEventListener("DOMContentLoaded", () => {
  init();
});

window.addEventListener("start", () => {
  render();
  animate(1);
  const timer = window.setInterval(() => {
    time++;
  }, 1);
});

var alpha = 0,
  beta = 0,
  gamma = 0,
  time = 0;
// ジャイロセンサの値が変化したら実行される deviceorientation イベント
window.addEventListener("deviceorientation", (dat) => {
  alpha = dat.alpha; // z軸（表裏）まわりの回転の角度（反時計回りがプラス）
  beta = dat.beta; // x軸（左右）まわりの回転の角度（引き起こすとプラス）
  gamma = dat.gamma; // y軸（上下）まわりの回転の角度（右に傾けるとプラス）
});

var timer = window.setInterval(() => {
  orientationDecisionHandler();
}, 33);

function orientationDecisionHandler() {
  if (state.boxes[0].mesh.position.y < -1) {
    window.clearInterval(timer);
    document.getElementById("score-overlay").style.zIndex = 1;
    var score = document.getElementById("score");
    score.innerHTML = "TTL:" + time + "ms";
  }
  //加速度を与える
  if (isPMD) {
    state.boxes[0].body.force.z = beta * 2;
    state.boxes[0].body.force.x = gamma * 3;
  } else {
    state.boxes[0].body.force.z = beta / 1.5;
    state.boxes[0].body.force.x = gamma / 3;
  }
}
const state = {};

let lastTime;
const fixedTimeStep = 1.0 / 60.0; // seconds
const maxSubSteps = 10;

// 定数はPROPSで管理する。 PROPS().valueName で取得
const PROPS = () => ({
  initPoint: { x: 0, y: 0, z: 0 },
  amount: 1,
  initWeight: 1,
  initMass: 2,
  margin: 20,
  limit: 2,
  width: 100,
  height: 100,
  floorColor: '#ffffff',
});

function init() {
  // init World
  world = state.world = new CANNON.World();
  world.gravity.set(0, -9.82, 0); // m/s²

  // set
  scene = state.sence = new THREE.Scene();
  camera = state.camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 1, 3);

  // generate object
  generate();

  // light
  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);
  const direction = new THREE.DirectionalLight(0xffffff, 1);
  scene.add(direction);

  // background
  const loader = new THREE.TextureLoader();
  const texture = loader.load("img/uyu.jpg");
  scene.background = texture;

  // controls ------------------------------
  controls = state.controls = new THREE.DeviceOrientationControls(camera);

  renderer = state.renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(renderer.domElement);

  // helper
  //   const gridHelper = new THREE.GridHelper(1000, 120) // size, step
  //   scene.add(gridHelper)
  //   const axisHelper = new THREE.AxisHelper(1000, 50)
  //   scene.add(axisHelper)
  // X軸が赤色、Y軸が緑色、Z軸が青色
}

function Ground(size = 1) {
  // cannon
  const body = new CANNON.Body({
    mass: 0, // mass == 0 makes the body static
    material: new CANNON.Material({ friction: 0 }),
  });
  //body.addShape(new CANNON.Plane())
  body.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 0.001)));
  //
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  // three
  //const geometry = new THREE.PlaneGeometry(size, size)
  const geometry = new THREE.CircleGeometry(1, 360);
  const material = new THREE.MeshBasicMaterial({
    color: PROPS().floorColor,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;

  return {
    body,
    mesh,
  };
}

/**
 * 箱作る
 * @return {body, mesh} ThreejsのmeshとCannon.jsのbodyを返す
 */
function Box(props) {
  const { point, weight, mass = 5, color = 0xaa0000 } = props;
  //body
  var body = new CANNON.Body({
    mass, // kg
    position: new CANNON.Vec3(point.x, point.y, point.z), // m
    shape: new CANNON.Box(new CANNON.Vec3(weight / 2, weight / 2, weight / 2)),
  });
  body.angularVelocity.set(Math.random(), Math.random(), 0);
  // mesh
  var geometry = new THREE.BoxGeometry(weight, weight, weight);
  var material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.0,
  });
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(point.x, point.y, point.z);
  return { body, mesh };
}

/**
 * プリン作る
 * @return {body, mesh} ThreejsのmeshとCannon.jsのbodyを返す
 */
function Sphere(props) {
  const { point, weight, mass = 5, color = 0xaa0000 } = props;
  //body
  var radius = 1; // m
  var body = new CANNON.Body({
    mass, // kg
    position: new CANNON.Vec3(point.x, point.y, point.z), // m
    shape: new CANNON.Sphere(weight),
    material: new CANNON.Material({
      friction: 0.1,
    }),
  });
  // mesh

  const geometry = new THREE.CylinderGeometry(0.5, 0.75, 0.75);

  const materiala = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.0,
  });

  const materialb = new THREE.MeshStandardMaterial({
    color: 0x892d00,
    roughness: 0.0,
  });

  const materialsArray = [];
  materialsArray.push(materiala); //materialindex = 0
  materialsArray.push(materialb); // materialindex = 1
  materialsArray.push(materiala); // materialindex = 2
  const material = new THREE.MeshFaceMaterial(materialsArray);

  //   const material = new THREE.MeshStandardMaterial({
  //     color,
  //     roughness: 0.0
  //   })
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(point.x, point.y, point.z);

  return {
    body,
    mesh,
  };
}
/**
 * 円柱作る
 * @return {body, mesh} ThreejsのmeshとCannon.jsのbodyを返す
 */
function Cylinder(props) {
  var { point, weight, mass = 5, color = 0xaa0000 } = props;
  //body
  const body = new CANNON.Body({
    mass,
    position: new CANNON.Vec3(point.x, point.y, point.z), // m
    shape: new CANNON.Cylinder(weight, weight, 2 * weight, 10),
  });
  body.angularVelocity.set(Math.random(), Math.random(), 0);
  // mesh
  const geometry = new THREE.CylinderGeometry(weight, weight, weight);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(point.x, point.y, point.z);
  return {
    body,
    mesh,
  };
}

function generate(props = {}) {
  // 床
  const ground = (state.ground = new Ground(1));
  scene.add(ground.mesh);
  world.addBody(ground.body);
  const weight = PROPS().initWeight;
  state.boxes = [];

  const rand = (num = 100) => Math.floor(Math.random() * num);
  console.log(rand());
  const randcolor = () =>
    new THREE.Color(`hsl(${rand(30)}, ${rand(20) + 80}%, 50%)`);

  for (let i = 0; i < PROPS().amount; i++) {
    function randScale() {
      return (-0.5 + Math.random()) * 10;
    }
    const randPoint = {
      x: randScale(),
      y: randScale(),
      z: randScale(),
    };
    const boxPosition = {
      x: 0, //randPoint.x,
      y: 3, //10 + i * PROPS().initWeight * 2,
      z: 0, //randPoint.z
    };
    var seed = Math.random();
    // if (seed < 0.3) {
    //   state.boxes[i] = new Box({
    //     point: boxPosition,
    //     weight: weight,
    //     mass: 100,
    //     color: randcolor()
    //   });
    // } else if (seed < 0.6) {
    state.boxes[i] = new Sphere({
      point: boxPosition,
      weight: weight / 2,
      mass: 5,
      color: 0xffca5c,
    });
    // } else {
    //   state.boxes[i] = new Cylinder({
    //     point: boxPosition,
    //     weight: weight,
    //     mass: 0.5,
    //     color: randcolor()
    //   })
    // }
    scene.add(state.boxes[i].mesh);
    world.addBody(state.boxes[i].body);
  }
}

function animate(time) {
  requestAnimationFrame(animate);
  const { boxes } = state;
  if (lastTime !== undefined) {
    var dt = (time - lastTime) / 1000;
    world.step(fixedTimeStep, dt, maxSubSteps);
  }
  for (let i = 0; i < PROPS().amount; i++) {
    const { mesh, body } = boxes[i];
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }
  lastTime = time;
  render();
}

function render() {
  renderer.render(scene, camera);
}
