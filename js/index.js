window.addEventListener("DOMContentLoaded", () => {
  init();
  permission_request();
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

const PROPS = () => ({
  initWeight: 1,
  floorColor: 0xffffff,
});

const fixedTimeStep = 1.0 / 60.0;
const maxSubSteps = 10;
const state = {};
const bgm = new Audio();

var isPMD = false;
var alpha = 0;
var beta = 0;
var gamma = 0;
var time = 0;
var lastTime;
var timer;
var orientationHandler;

function permission_request() {
  if (
    DeviceOrientationEvent &&
    DeviceOrientationEvent.requestPermission &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission().then((res) => {
      if (res == "granted") {
        window.addEventListener("deviceorientation", (dat) => {
          alpha = dat.alpha; // z軸（表裏）まわりの回転の角度（反時計回りがプラス）
          beta = dat.beta; // x軸（左右）まわりの回転の角度（引き起こすとプラス）
          gamma = dat.gamma; // y軸（上下）まわりの回転の角度（右に傾けるとプラス）
        });
      }
    });
  }
}

function orientationDecisionHandler() {
  if (state.boxes[0].mesh.position.y < -1) {
    endGame();
  }
  if (isPMD) {
    state.boxes[0].body.force.z = beta * 2;
    state.boxes[0].body.force.x = gamma * 3;
  } else {
    state.boxes[0].body.force.z = beta / 1.5;
    state.boxes[0].body.force.x = gamma / 3;
  }
}

function init() {
  state.world = new CANNON.World();
  state.world.gravity.set(0, -9.82, 0);

  state.sence = new THREE.Scene();
  state.camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  state.camera.position.set(0, 1, 3);

  generate();

  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  state.sence.add(ambient);
  const direction = new THREE.DirectionalLight(0xffffff, 1);
  state.sence.add(direction);

  // 背景
  const loader = new THREE.TextureLoader();
  const texture = loader.load("src/img/uyu.jpg");
  state.sence.background = texture;

  // BGMロード
  bgm.preload = "auto";
  bgm.src = "src/sound.mp3";
  bgm.load();

  // BGMアラート
  if (!localStorage.getItem("alert")) {
    alert("BGMが流れます");
    localStorage.setItem("alert", true);
  }

  state.controls = new THREE.DeviceOrientationControls(state.camera);

  state.renderer = new THREE.WebGLRenderer();
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(state.renderer.domElement);
}

/**
 * 皿
 * @return {
 * body: CANNON.Body,
 * mesh: THREE.Mesh
 * }
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
 * プリン
 * @return {
 * body: CANNON.Body,
 * mesh: THREE.Mesh
 * }
 */
function Pudding(props) {
  const { point, weight, mass = 5, color = 0xaa0000 } = props;

  var radius = 1;
  var body = new CANNON.Body({
    mass,
    position: new CANNON.Vec3(point.x, point.y, point.z),
    shape: new CANNON.Sphere(weight),
    material: new CANNON.Material({
      friction: 0.1,
    }),
  });

  const geometry = new THREE.CylinderGeometry(
    radius * 0.5,
    radius * 0.75,
    radius * 0.75
  );

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
  const dish = new Dish(1);
  state.sence.add(dish.mesh);
  state.world.addBody(dish.body);
  const weight = PROPS().initWeight;
  state.boxes = [];

  const boxPosition = {
    x: 0,
    y: 3,
    z: 0,
  };

  state.boxes[0] = new Pudding({
    point: boxPosition,
    weight: weight / 2,
    mass: 5,
    color: 0xffca5c,
  });

  state.sence.add(state.boxes[0].mesh);
  state.world.addBody(state.boxes[0].body);
}

function startGame() {
  permission_request();
  orientationHandler = window.setInterval(() => {
    orientationDecisionHandler();
  }, 33);
  titleOverlay = document.getElementById("title-overlay");
  titleOverlay.remove();
  const event = new CustomEvent("start");
  window.dispatchEvent(event);

  // BGM再生
  bgm.currentTime = 0;
  bgm.loop = true;
  bgm.play();
}

function endGame() {
  window.clearInterval(timer);
  document.getElementById("score-overlay").style.zIndex = 1;
  var score = document.getElementById("score");
  score.innerHTML = "SCORE :" + time + "ms" + (isPMD ? " (PMD)" : "");
}

function animate(time) {
  requestAnimationFrame(animate);
  const { boxes } = state;
  if (lastTime !== undefined) {
    var dt = (time - lastTime) / 1000;
    state.world.step(fixedTimeStep, dt, maxSubSteps);
  }
  const { mesh, body } = boxes[0];
  mesh.position.copy(body.position);
  mesh.quaternion.copy(body.quaternion);
  lastTime = time;
  render();
}

function render() {
  state.renderer.render(state.sence, state.camera);
}
