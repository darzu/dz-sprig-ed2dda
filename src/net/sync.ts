import { EntityManager } from "../entity-manager.js";
import { OutOfRoomError, Serializer } from "../serialize.js";
import {
  Authority,
  AuthorityDef,
  Inbox,
  InboxDef,
  MeDef,
  Outbox,
  OutboxDef,
  Peer,
  PeerDef,
  send,
  Sync,
  SyncDef,
  NetStatsDef,
  NetStats,
  RemoteUpdatesDef,
} from "./components.js";
import {
  Ack,
  deserializeEntity,
  EntityUpdateType,
  MAX_MESSAGE_SIZE,
  MessageType,
  serializeEntity,
} from "./message.js";
import { Time, TimeDef, Timer, NetTimerDef } from "../time.js";

export function registerSyncSystem(em: EntityManager) {
  function sync(
    ents: { id: number; sync: Sync; authority: Authority }[],
    {
      time,
      netTimer,
      me,
    }: {
      time: Time;
      me: { pid: number; host: boolean };
      netTimer: Timer;
    }
  ) {
    for (let i = 0; i < netTimer.steps; i++) {
      const peers = em.filterEntities([PeerDef, OutboxDef]);
      for (let { peer, outbox } of peers) {
        if (me.host && !peer.joined) continue;
        const entities = ents.filter((ent) => ent.authority.pid == me.pid);
        for (let ent of entities) {
          const priorityIncrease = peer.entitiesKnown.has(ent.id)
            ? ent.sync.priorityIncrementDynamic
            : ent.sync.priorityIncrementFull;
          peer.entityPriorities.set(
            ent.id,
            priorityIncrease + (peer.entityPriorities.get(ent.id) || 0)
          );
        }
        entities.sort((o1, o2) => {
          return (
            peer.entityPriorities.get(o2.id)! -
            peer.entityPriorities.get(o1.id)!
          );
        });
        let message = new Serializer(MAX_MESSAGE_SIZE);
        let seq = peer.updateSeq++;
        message.writeUint8(MessageType.StateUpdate);
        message.writeUint32(seq);
        message.writeFloat32(time.time);
        let numEntities = 0;
        let numEntitiesIndex = message.writeUint8(numEntities);
        try {
          for (let ent of entities) {
            let type = peer.entitiesKnown.has(ent.id)
              ? EntityUpdateType.Dynamic
              : EntityUpdateType.Full;
            const components =
              type === EntityUpdateType.Dynamic
                ? ent.sync.dynamicComponents
                : ent.sync.fullComponents.concat(ent.sync.dynamicComponents);
            // don't write anything at all if no components need to be synced
            if (components.length > 0) {
              serializeEntity(em, ent, message, type, components);
              if (type === EntityUpdateType.Full) {
                if (!peer.entitiesInUpdate.has(seq)) {
                  peer.entitiesInUpdate.set(seq, new Set());
                }
                peer.entitiesInUpdate.get(seq)!.add(ent.id);
              }
              peer.entityPriorities.set(ent.id, 0);
              numEntities++;
            }
          }
        } catch (e) {
          if (!(e instanceof OutOfRoomError)) throw e;
        }
        message.writeUint8(numEntities, numEntitiesIndex);
        send(outbox, message.buffer);
      }
    }
  }
  em.registerSystem(
    [AuthorityDef, SyncDef],
    [TimeDef, NetTimerDef, MeDef],
    sync,
    "netSync"
  );
}

export function registerUpdateSystem(em: EntityManager) {
  em.registerSystem(
    [RemoteUpdatesDef],
    [],
    (es) => {
      for (const e of es) {
        em.removeComponent(e.id, RemoteUpdatesDef);
      }
    },
    "clearRemoteUpdatesMarker"
  );

  function update(
    peers: { peer: { address: string }; inbox: Inbox; outbox: Outbox }[],
    {
      time,
      netStats,
    }: {
      time: Time;
      netStats: NetStats;
    }
  ) {
    //console.log("update");
    for (let {
      peer: { address },
      inbox,
      outbox,
    } of peers) {
      // TODO: do we need to sort these in sequence number order?
      const updates = inbox.get(MessageType.StateUpdate) || [];
      while (updates.length > 0) {
        let message = updates.shift()!;
        let seq = message.readUint32();
        let ts = message.readFloat32();
        let dt = time.lastTime - (ts - netStats.skewEstimate[address]);
        let numEntities = message.readUint8();
        for (let i = 0; i < numEntities; i++) {
          deserializeEntity(em, seq, message, dt);
          // reset message.dummy
          message.dummy = false;
        }
        let ack = Ack(seq);
        send(outbox, ack.buffer);
      }
    }
  }

  em.registerSystem(
    [PeerDef, InboxDef, OutboxDef],
    [TimeDef, MeDef, NetStatsDef],
    update,
    "netUpdate"
  );
}

export function registerAckUpdateSystem(em: EntityManager) {
  function ack(
    peers: { peer: Peer; inbox: Inbox }[],
    {
      time,
      me,
    }: {
      time: { dt: number };
      me: { pid: number };
    }
  ) {
    for (let { peer, inbox } of peers) {
      const acks = inbox.get(MessageType.StateUpdateResponse) || [];
      while (acks.length > 0) {
        let message = acks.shift()!;
        let seq = message.readUint32();
        let entities = peer.entitiesInUpdate.get(seq);
        if (entities) {
          for (let entity of entities) {
            peer.entitiesKnown.add(entity);
          }
        }
      }
    }
  }
  em.registerSystem([PeerDef, InboxDef], [TimeDef, MeDef], ack, "netAck");
}
