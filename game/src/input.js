// Keyboard and mouse input. One job: turn keys and pointer into the
// {pitch, roll, throttle, flaps} the flight model reads, plus menu keys.
export function createInput() {
  const keys = new Set();
  const input = {
    pitch: 0,
    roll: 0,
    throttle: 0,
    flaps: false,
    dropPressed: false,
    menuKey: null,
    pausePressed: false,
  };
  let mouseX = 0;
  let mouseY = 0;
  let mouseActive = false;

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    const k = keyName(e);
    if (!keys.has(k)) {
      if (k === ' ') input.dropPressed = true;
      if (k === 'p' || k === 'Escape') input.pausePressed = true;
      if (['1', '2', '3', 'Enter'].includes(k)) input.menuKey = k;
    }
    keys.add(k);
    if (k === 'f') input.flaps = !input.flaps;
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    mouseActive = true;
  });
  window.addEventListener('mousedown', () => {
    mouseActive = true;
  });

  input.poll = function poll() {
    const pitchKeys = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
    const rollKeys = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
    let pitch = pitchKeys;
    let roll = rollKeys;
    if (mouseActive && pitchKeys === 0 && rollKeys === 0) {
      pitch = Math.max(-1, Math.min(1, mouseY * 1.4));
      roll = Math.max(-1, Math.min(1, mouseX * 1.4));
    }
    input.pitch = pitch;
    input.roll = roll;
    input.throttle = (keys.has('w') || keys.has('Shift') ? 1 : 0) - (keys.has('s') || keys.has('Control') ? 1 : 0);
    return input;
  };

  input.consumeEdges = function consumeEdges() {
    const edges = {
      dropPressed: input.dropPressed,
      menuKey: input.menuKey,
      pausePressed: input.pausePressed,
    };
    input.dropPressed = false;
    input.menuKey = null;
    input.pausePressed = false;
    return edges;
  };

  return input;
}
