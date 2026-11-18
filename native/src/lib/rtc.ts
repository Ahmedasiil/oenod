// Web build (store screenshots and the web preview): the browser's own WebRTC; the room page is the same screen.
import React from 'react';

const g: any = typeof globalThis !== 'undefined' ? globalThis : {};
export const View = (p: { streamURL?: string; style?: any; objectFit?: 'cover' | 'contain'; mirror?: boolean; zOrder?: number }) =>
  React.createElement('div', { style: { ...(p.style || {}), backgroundColor: '#0A0B10' } });
export const getUserMedia = (c: any): Promise<any> => (g.navigator?.mediaDevices ? g.navigator.mediaDevices.getUserMedia(c) : Promise.reject(new Error('no media')));
export const stream = (tracks: any[]): any => { const s = new g.MediaStream(tracks); s.toURL = () => s.id; return s; };
export const peer = (cfg: any): any => new g.RTCPeerConnection(cfg);
export const desc = (d: { type: string; sdp: string }) => d;
export const cand = (c: any) => c;
export const stop = (t: any) => { try { t?.stop(); } catch { /* stopped */ } };
export function audioStart(_speakerOn: boolean) { /* browser handles audio */ }
export function speaker(_on: boolean) { /* browser handles audio */ }
export function audioStop() { /* browser handles audio */ }
