varying vec3 vNormal;

void main() {
  float brightness = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
  vec3 color = mix(vec3(0.1, 0.1, 0.3), vec3(0.2, 0.8, 1.0), brightness);
  gl_FragColor = vec4(color, 1.0);
}
