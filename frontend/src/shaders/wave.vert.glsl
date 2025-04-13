uniform float uTime;
uniform float uAudioData[64];

varying vec3 vNormal;

void main() {
  vNormal = normal;
  vec3 newPosition = position;

  float audioValue = uAudioData[int(mod(float(gl_InstanceID), 64.0))] * 0.01;
  newPosition.y += sin(position.x * 2.0 + uTime) * audioValue;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
