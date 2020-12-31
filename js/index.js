window.addEventListener("DOMContentLoaded", () => {
  init();
  permission_request()
});

window.addEventListener("start", () => {
  render();
  animate(1);
  timer = window.setInterval(() => {
    time++;
  }, 1);
});

// ジャイロセンサの値が変化したら実行される deviceorientation イベント
window.addEventListener("deviceorientation", (dat) => {
  alpha = dat.alpha; // z軸（表裏）まわりの回転の角度（反時計回りがプラス）
  beta = dat.beta; // x軸（左右）まわりの回転の角度（引き起こすとプラス）
  gamma = dat.gamma; // y軸（上下）まわりの回転の角度（右に傾けるとプラス）
});

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
  floorColor: "#ffffff",
});

const fixedTimeStep = 1.0 / 60.0; // seconds
const maxSubSteps = 10;
const state = {};

var alpha = 0,
  beta = 0,
  gamma = 0,
  time = 0,
  lastTime,
  timer;

var timer = window.setInterval(() => {
  orientationDecisionHandler();
}, 33);

function permission_request() {
  if (
    DeviceOrientationEvent &&
    DeviceOrientationEvent.requestPermission &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission().then(res => {
      if (res == 'granted') {
        window.addEventListener("deviceorientation", (dat) => {
          alpha = dat.alpha; // z軸（表裏）まわりの回転の角度（反時計回りがプラス）
          beta = dat.beta; // x軸（左右）まわりの回転の角度（引き起こすとプラス）
          gamma = dat.gamma; // y軸（上下）まわりの回転の角度（右に傾けるとプラス）
        });
      }
    })
  }
}

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

function init() {
  world = state.world = new CANNON.World();
  world.gravity.set(0, -9.82, 0); // m/s²

  scene = state.sence = new THREE.Scene();
  camera = state.camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 1, 3);

  generate();

  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);
  const direction = new THREE.DirectionalLight(0xffffff, 1);
  scene.add(direction);

  const loader = new THREE.TextureLoader();
  const texture = loader.load("img/uyu.jpg");
  scene.background = texture;

  controls = state.controls = new THREE.DeviceOrientationControls(camera);

  renderer = state.renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

/**
 * 皿作る
 * @return {body, mesh} ThreejsのmeshとCannon.jsのbodyを返す
 */
function Dish(size = 1) {
  const body = new CANNON.Body({
    mass: 0,
    material: new CANNON.Material({ friction: 0 }),
  });
  body.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 0.001)));
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
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
 * プリン作る
 * @return {body, mesh} ThreejsのmeshとCannon.jsのbodyを返す
 */
function Sphere(props) {
  const { point, weight, mass = 5, color = 0xaa0000 } = props;

  var radius = 1;
  var body = new CANNON.Body({
    mass, // kg
    position: new CANNON.Vec3(point.x, point.y, point.z),
    shape: new CANNON.Sphere(weight),
    material: new CANNON.Material({
      friction: 0.1,
    }),
  });

  const geometry = new THREE.CylinderGeometry(0.5, 0.75, 0.75);

  const puddingMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.0,
  });

  const caramelMaterial = new THREE.MeshStandardMaterial({
    color: 0x892d00,
    roughness: 0.0,
  });

  const materialsArray = [];
  materialsArray.push(puddingMaterial);
  materialsArray.push(caramelMaterial);
  materialsArray.push(puddingMaterial);
  const material = new THREE.MeshFaceMaterial(materialsArray);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(point.x, point.y, point.z);

  return {
    body,
    mesh,
  };
}

function generate(props = {}) {
  // 床
  const dish = (state.dish = new Dish(1));
  scene.add(dish.mesh);
  world.addBody(dish.body);
  const weight = PROPS().initWeight;
  state.boxes = [];

  const boxPosition = {
    x: 0,
    y: 3,
    z: 0,
  };

  state.boxes[0] = new Sphere({
    point: boxPosition,
    weight: weight / 2,
    mass: 5,
    color: 0xffca5c,
  });

  scene.add(state.boxes[0].mesh);
  world.addBody(state.boxes[0].body);
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
