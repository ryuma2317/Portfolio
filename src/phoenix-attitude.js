// Keep the bird's breast and paired wings visible through the whole turn.
// A forward depth component gives the screen-space curve a real 3D bearing,
// instead of rotating the animal through repeated edge-on/back-facing views.
export function phoenixAttitude(heading,phase,life=1) {
  const tangent=heading-Math.PI/2,x=Math.cos(tangent),y=Math.sin(tangent),depth=.88;
  return {yaw:Math.atan2(x,depth),pitch:Math.atan2(y*.72,Math.hypot(x,depth)),
    bank:(Math.sin(tangent+.4)*.13+Math.sin(phase-.6)*.025)*life};
}
