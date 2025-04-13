export function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }
  
  export function remap(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }
  