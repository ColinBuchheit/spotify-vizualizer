varying vec2 vUv;

void main() {
  float d = distance(vUv, vec2(0.5));
  float ring = smoothstep(0.3, 0.4, sin(d * 20.0));

  vec3 color = mix(vec3(1.0, 0.2, 0.2), vec3(1.0, 1.0, 0.5), ring);
  gl_FragColor = vec4(color * (1.0 - d), 1.0);
}
