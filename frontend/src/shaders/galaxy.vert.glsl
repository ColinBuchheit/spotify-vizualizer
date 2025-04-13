uniform float uTime;
uniform float uAudioData[64];
attribute float aIndex;

varying float vIndex;

void main() {
  float audioBoost = uAudioData[int(aIndex)] * 0.02;
  vec3 pos = position + normal * audioBoost;
  vIndex = aIndex;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
