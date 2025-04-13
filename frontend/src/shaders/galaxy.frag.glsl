varying float vIndex;

void main() {
  float intensity = 1.0 - abs(sin(vIndex * 0.1));
  vec3 color = mix(vec3(0.2, 0.0, 0.4), vec3(1.0, 0.5, 0.8), intensity);
  gl_FragColor = vec4(color, 0.9);
}
