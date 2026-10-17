import type { Room, Track } from "livekit-client";
export interface MediaRoomAdapter {
 connect(url:string,token:string):Promise<void>;
 publish():Promise<void>;
 unpublish():Promise<void>;
 subscribe(listener:()=>void):()=>void;
 tracks():Map<string,Track>;
 disconnect():Promise<void>;
}
/** Room publishing owns its capture tracks; it never accepts the local-preview stream. */
export class LiveKitMediaRoomAdapter implements MediaRoomAdapter {
 constructor(readonly room:Room){}
 connect(url:string,token:string){return this.room.connect(url,token);}
 async publish(){await this.room.localParticipant.setCameraEnabled(true);}
 async unpublish(){await this.room.localParticipant.setCameraEnabled(false);}
 subscribe(listener:()=>void){
  const events=['trackSubscribed','trackUnsubscribed','trackMuted','trackUnmuted','localTrackPublished','localTrackUnpublished','participantDisconnected']as const;
  for(const event of events)this.room.on(event,listener);
  return ()=>{for(const event of events)this.room.off(event,listener);};
 }
 tracks(){const result=new Map<string,Track>();for(const p of [this.room.localParticipant,...this.room.remoteParticipants.values()])for(const publication of p.videoTrackPublications.values())if(publication.track&&!publication.isMuted)result.set(p.identity,publication.track);return result;}
 async disconnect(){await this.room.disconnect();}
}
