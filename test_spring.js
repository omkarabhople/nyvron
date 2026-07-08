let x = 0;
let targetX = 200;
let velocity = 0;
let dt = 0.05; // worst case

for(let i = 0; i < 10; i++) {
  const tension = 400;
  const friction = 35;
  const dx = x - targetX;
  const springForce = -tension * dx;
  const dampingForce = -friction * velocity;
  velocity += (springForce + dampingForce) * dt;
  x += velocity * dt;
  console.log(`Frame ${i}: x=${x.toFixed(2)}, v=${velocity.toFixed(2)}`);
}
