"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { SoloScenePreferences } from "@/lib/soloScenes/catalog";
import { windowMotion, windowVertexShader, windowFragmentShader } from "@/lib/soloScenes/motion";

/** Outdoor imagery only; this canvas never receives a camera stream. */
export function WindowMotionCanvas({video,slug,visible}:{video:RefObject<HTMLVideoElement|null>;slug:SoloScenePreferences["window"];visible:boolean}){
  const canvas=useRef<HTMLCanvasElement>(null),phase=useRef(0);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(!visible||!canvas.current)return;
    const gl=canvas.current.getContext("webgl",{alpha:false,antialias:false});if(!gl)return;
    const shader=(kind:number,source:string)=>{const s=gl.createShader(kind);if(!s)return null;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null;}return s;};
    const vertex=shader(gl.VERTEX_SHADER,windowVertexShader),fragment=shader(gl.FRAGMENT_SHADER,windowFragmentShader);
    if(!vertex||!fragment){if(vertex)gl.deleteShader(vertex);if(fragment)gl.deleteShader(fragment);return;}
    const program=gl.createProgram(),buffer=gl.createBuffer(),texture=gl.createTexture();
    if(!program||!buffer||!texture)return;
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);gl.deleteBuffer(buffer);gl.deleteTexture(texture);gl.deleteShader(vertex);gl.deleteShader(fragment);return;}
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,"position");gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    const config=windowMotion[slug];
    gl.uniform4fv(gl.getUniformLocation(program,"water"),new Float32Array(config.water));gl.uniform4fv(gl.getUniformLocation(program,"leaves"),new Float32Array(config.leaves));gl.uniform4fv(gl.getUniformLocation(program,"secondLeaves"),new Float32Array(config.secondLeaves));
    gl.uniform1f(gl.getUniformLocation(program,"kind"),config.kind);
    const time=gl.getUniformLocation(program,"seconds");let frame=0,last=0,previous=0,painted=false;
    const draw=(timestamp:number)=>{
      frame=requestAnimationFrame(draw);if(timestamp-last<1000/24)return;last=timestamp;
      if(previous)phase.current+=Math.min((timestamp-previous)/1000,0.2);previous=timestamp;
      const source=video.current;if(!source||source.readyState<2||!source.videoWidth)return;
      gl.viewport(0,0,1280,720);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.uniform1f(time,phase.current);gl.drawArrays(gl.TRIANGLES,0,6);
      if(!painted){painted=true;setReady(true);}
    };
    frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);};
  },[slug,visible,video]);
  return <canvas ref={canvas} width={1280} height={720} data-testid="window-motion-canvas" data-motion={visible?"running":"paused"} className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${ready?"opacity-100":"opacity-0"}`}/>;
}
