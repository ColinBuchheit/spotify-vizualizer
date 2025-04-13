uniform float uTime;
uniform float uAudioData[64];

varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;

  float pulse = uAudioData[int(mod(p.x + p.y, 64.0))] * 0.01;
  p.z += sin(uTime * 5.0 + length(p.xy)) * pulse;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
