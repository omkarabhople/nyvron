let x = 0;
let targetX = 200;
let velocity = 0;
let dt = 0.05; // worst case
const STEPS = 3;

for(let i = 0; i < 10; i++) {
  const stepDt = dt / STEPS;
  for(let j=0; j<STEPS; j++) {
    const tension = 400;
    const friction = 35;
    const dx = x - targetX;
    const springForce = -tension * dx;
    const dampingForce = -friction * velocity;
    velocity += (springForce + dampingForce) * stepDt;
    x += velocity * stepDt;
  }
  console.log(`Frame ${i}: x=${x.toFixed(2)}, v=${velocity.toFixed(2)}`);
}
