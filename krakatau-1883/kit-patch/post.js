// Reusable render + post chain: colour (MSAA) -> world/character normals+depth -> ink (black world lines,
// thicker plum lines on characters) -> bloom (HDR > threshold) -> lens blur + day grade + flash/alarm/dim/censor.
// Layers: 0 world, 2 sky/clouds (no ink, no depth), 3 characters (CHAR_LAYER).
import * as THREE from '../lib/three.module.min.js';
import { CHAR_U } from './rig.js';

export function createPost(renderer, W, H, opts = {}) {
  const PX = W / 1080;
  const colorRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const normRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  normRT.depthTexture = new THREE.DepthTexture(W, H, THREE.UnsignedIntType);
  const inkRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  const BW = Math.round(W / 4), BH = Math.round(H / 4);
  const bA = new THREE.WebGLRenderTarget(BW, BH, { type: THREE.HalfFloatType }), bB = new THREE.WebGLRenderTarget(BW, BH, { type: THREE.HalfFloatType });
  const worldNormal = new THREE.MeshNormalMaterial();
  const charNormal = new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vN; void main(){ gl_FragColor=vec4(normalize(vN)*.5+.5,0.5); }',
  });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = (frag, uniforms) => {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }', fragmentShader: frag })));
    return { s, u: uniforms };
  };
  const DEPTH_FN = `uniform sampler2D tDepth; uniform float near, far;
  float lin(vec2 uv){ float d=texture2D(tDepth,uv).x; return (near*far)/(far-d*(far-near)); }`;
  const ink = quad(`${DEPTH_FN}
  uniform sampler2D tColor, tNormal; uniform vec2 res; uniform float inkPx, charPx, inkFar;
  varying vec2 vUv;
  void main(){
    vec3 col=texture2D(tColor,vUv).rgb;
    vec4 N0=texture2D(tNormal,vUv);
    float z0=lin(vUv); vec3 n0=normalize(N0.xyz*2.-1.);
    bool c0=abs(N0.a-.5)<.25;
    float e=0., ec=0., zmin=z0;
    for(int i=0;i<8;i++){
      vec2 dir=i==0?vec2(1,0):i==1?vec2(-1,0):i==2?vec2(0,1):i==3?vec2(0,-1):i==4?vec2(.707,.707):i==5?vec2(-.707,.707):i==6?vec2(.707,-.707):vec2(-.707,-.707);
      // world-scale probe
      vec2 d=dir*inkPx*mix(1.,.75,smoothstep(8.,120.,min(z0,120.)))*0.5/res;
      vec4 N=texture2D(tNormal,vUv+d); float z=lin(vUv+d); zmin=min(zmin,z);
      bool c=abs(N.a-.5)<.25;
      float dz=abs(z-z0)/min(z,z0);
      float edge=step(0.035,dz);
      if(z<far*.9 && z0<far*.9 && c==c0) edge=max(edge,step(0.22,1.-dot(n0,normalize(N.xyz*2.-1.))));
      if(c||c0) ec=max(ec,edge); else e=max(e,edge);
      // character-scale probe (thicker plum outline)
      float tw=1.+0.75*dot(dir,normalize(vec2(-0.45,0.89)));
      vec2 d2=dir*charPx*0.5*tw/res; vec4 N2=texture2D(tNormal,vUv+d2);
      bool c2=abs(N2.a-.5)<.25;
      if(c2!=c0){ float z2=lin(vUv+d2); if(abs(z2-z0)/min(z2,z0)>0.02) ec=1.; }
    }
    e*=1.-smoothstep(inkFar*.48,inkFar,zmin);
    col=mix(col,vec3(0.0035,0.0032,0.0038),e);
    col=mix(col,vec3(0.017,0.0085,0.019),ec);
    gl_FragColor=vec4(col,1.);
  }`, { tColor: { value: colorRT.texture }, tNormal: { value: normRT.texture }, tDepth: { value: normRT.depthTexture },
    near: { value: 0.1 }, far: { value: 1000 }, res: { value: new THREE.Vector2(W, H) }, inkPx: { value: (opts.inkPx ?? 4.6) * PX }, inkFar: { value: 420 }, charPx: { value: (opts.charPx ?? 6.5) * PX } });
  const bright = quad('uniform sampler2D t; uniform float thr; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb; gl_FragColor=vec4(max(c-vec3(thr),0.),1.); }', { t: { value: colorRT.texture }, thr: { value: 1.35 } });
  const blurFS = 'uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 a=vec3(0.); float w[5]; w[0]=.227;w[1]=.195;w[2]=.122;w[3]=.054;w[4]=.016; a+=texture2D(t,vUv).rgb*w[0]; for(int i=1;i<5;i++){ a+=(texture2D(t,vUv+d*float(i)*1.6).rgb+texture2D(t,vUv-d*float(i)*1.6).rgb)*w[i]; } gl_FragColor=vec4(a,1.); }';
  const blurH = quad(blurFS, { t: { value: bA.texture }, d: { value: new THREE.Vector2(1 / BW, 0) } });
  const blurV = quad(blurFS, { t: { value: bB.texture }, d: { value: new THREE.Vector2(0, 1 / BH) } });
  const lens = quad(`${DEPTH_FN}
  uniform sampler2D tInk, tBloom; uniform vec2 res, mblur; uniform float focus, cInf, flash, alarm, dim, censor;
  varying vec2 vUv;
  float coc(vec2 uv){ return cInf*clamp(abs(1.-focus/lin(uv)),0.,1.); }
  vec3 srgb(vec3 c){ c=max(c,0.); return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c)); }
  float herm(float x){
    float X[7]; X[0]=0.;X[1]=.1;X[2]=.25;X[3]=.5;X[4]=.75;X[5]=.9;X[6]=1.;
    float Y[7]; Y[0]=.0345;Y[1]=.1828;Y[2]=.3812;Y[3]=.6605;Y[4]=.8814;Y[5]=.9631;Y[6]=1.;
    float T[7]; T[0]=1.483;T[1]=1.404;T[2]=1.220;T[3]=.987;T[4]=.661;T[5]=.435;T[6]=.369;
    x=clamp(x,0.,1.);
    for(int i=0;i<6;i++){ if(x<=X[i+1]){ float h=X[i+1]-X[i], t=(x-X[i])/h, t2=t*t, t3=t2*t;
      return (2.*t3-3.*t2+1.)*Y[i]+(t3-2.*t2+t)*h*T[i]+(-2.*t3+3.*t2)*Y[i+1]+(t3-t2)*h*T[i+1]; } }
    return 1.;
  }
  void main(){
    float r=coc(vUv); vec3 acc=texture2D(tInk,vUv).rgb; float w=1.;
    if(r>0.5){
      for(int i=1;i<28;i++){
        float a=float(i)*2.39996, rr=sqrt(float(i)/28.)*r;
        vec2 uv=vUv+vec2(cos(a),sin(a))*rr/res;
        float wi=smoothstep(0.,1.,coc(uv)/max(rr,.001));
        acc+=texture2D(tInk,uv).rgb*wi; w+=wi;
      }
    }
    acc/=w;
    if(length(mblur)>0.5){ vec3 m=vec3(0.); for(int i=-6;i<=6;i++){ m+=texture2D(tInk,vUv+mblur*float(i)/12./res).rgb; } acc=mix(acc,m/13.,.85); }
    vec3 c=srgb(acc+texture2D(tBloom,vUv).rgb*.55);
    float Y=dot(c,vec3(.2126,.7152,.0722)); float Yn=herm(Y); c*=Yn/max(Y,1e-4); c=min(c,vec3(1.)); Y=Yn;
    float wS=1.-smoothstep(0.,.55,Y), wH=smoothstep(.45,1.,Y), wM=clamp(1.-wS-wH,0.,1.);
    c=Y+(c-Y)*(wS*.983+wM*1.273+wH*1.457);
    c+=wS*vec3(16.5,-3.5,-13.8)/255.+wM*vec3(-4.2,-.6,17.8)/255.+wH*vec3(-1.9,-.1,6.8)/255.;
    c=mix(c,c*vec3(1.25,.45,.42)+vec3(.08,0.,0.),alarm);
    c=mix(c,c*vec3(.78,.74,.92),dim);
    float rv=length(vUv-.5)/.7071; c*=1.-(.10+.12*dim+.08*alarm)*smoothstep(.45,1.,rv);
    // re-assert ink after the grade so lines stay near-black/plum
    vec3 raw=texture2D(tInk,vUv).rgb; float inkMask=step(dot(raw,vec3(.33)),0.02)*step(r,0.5);
    c=mix(c,srgb(raw),inkMask*.85);
    float vg=1.-.55*smoothstep(.2,1.,rv);
    c=mix(c,(vec3(.20,0.,.012)+c*vec3(.20,.015,.02))*vg,censor);
    c=mix(c,vec3(1.),flash);
    gl_FragColor=vec4(clamp(c,0.,1.),1.);
  }`, { tInk: { value: inkRT.texture }, tBloom: { value: bA.texture }, tDepth: { value: normRT.depthTexture }, near: { value: 0.1 }, far: { value: 1000 },
    res: { value: new THREE.Vector2(W, H) }, focus: { value: 5 }, cInf: { value: 0 }, flash: { value: 0 }, alarm: { value: 0 }, dim: { value: 0 }, censor: { value: 0 }, mblur: { value: new THREE.Vector2(0, 0) } });

  return {
    lens, ink,
    render(scene, camera, u = {}) {
      // feed the 2D character material: key light direction + its colour as a gentle tint
      if (!scene.userData.key) scene.traverse((o) => { if (o.isDirectionalLight && !scene.userData.key) scene.userData.key = o; });
      const key = scene.userData.key;
      if (key) { CHAR_U.lightDir.value.copy(key.position).sub(key.target.position).normalize(); CHAR_U.tint.value.setRGB(1, 1, 1).lerp(key.color, 0.35); }
      ink.u.near.value = lens.u.near.value = camera.near; ink.u.far.value = lens.u.far.value = camera.far;
      ink.u.inkFar.value = u.inkFar ?? 420; lens.u.focus.value = u.focus ?? 5; lens.u.cInf.value = (u.dof ?? 0) * PX;
      for (const k of ['flash', 'alarm', 'dim', 'censor']) lens.u[k].value = u[k] ?? 0;
      lens.u.mblur.value.set(...(u.mblur || [0, 0]));
      camera.layers.enable(0); camera.layers.enable(2); camera.layers.enable(3);
      renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(colorRT); renderer.clear(); renderer.render(scene, camera);
      const fog = scene.fog; scene.fog = null;
      renderer.setClearColor(new THREE.Color(0.5, 0.5, 1), 1);
      renderer.setRenderTarget(normRT); renderer.clear();
      camera.layers.set(0); scene.overrideMaterial = worldNormal; renderer.render(scene, camera);
      renderer.autoClear = false; camera.layers.set(3); scene.overrideMaterial = charNormal; renderer.render(scene, camera); renderer.autoClear = true;
      scene.overrideMaterial = null; scene.fog = fog;
      camera.layers.enable(0); camera.layers.enable(2);
      renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(inkRT); renderer.render(ink.s, quadCam);
      renderer.setRenderTarget(bA); renderer.render(bright.s, quadCam);
      renderer.setRenderTarget(bB); renderer.render(blurH.s, quadCam);
      renderer.setRenderTarget(bA); renderer.render(blurV.s, quadCam);
      renderer.setRenderTarget(null); renderer.render(lens.s, quadCam);
      if (u.fx) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(u.fx, camera); renderer.autoClear = true; }
      return renderer.domElement.toDataURL('image/jpeg', 0.93);
    },
  };
}
