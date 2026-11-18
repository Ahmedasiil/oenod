// WebRTC for the in-app OENOD Meet room (iPhone and Android): camera, microphone, peer connections, the video view,
// and the call audio (speaker or earpiece, screen kept on) through InCallManager.
import { mediaDevices, MediaStream, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCView } from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

export const View = RTCView as any;
export const getUserMedia = (c: any): Promise<any> => mediaDevices.getUserMedia(c);
export const stream = (tracks: any[]) => new MediaStream(tracks);
export const peer = (cfg: any) => new RTCPeerConnection(cfg) as any;
export const desc = (d: { type: string; sdp: string }) => new RTCSessionDescription(d as any);
export const cand = (c: any) => new RTCIceCandidate(c);
export const stop = (t: any) => { try { t?.stop(); } catch { /* stopped */ } };
export function audioStart(speakerOn: boolean) {
  try { InCallManager.start({ media: 'video' }); InCallManager.setKeepScreenOn(true); InCallManager.setForceSpeakerphoneOn(speakerOn); } catch { /* ignore */ }
}
export function speaker(on: boolean) { try { InCallManager.setForceSpeakerphoneOn(on); } catch { /* ignore */ } }
export function audioStop() { try { InCallManager.setKeepScreenOn(false); InCallManager.stop(); } catch { /* ignore */ } }
