import { EM, EntityManager } from "./entity-manager.js";
import { SyncDef } from "./net/components.js";

export const DeletedDef = EM.defineComponent("deleted", () => true);

EM.registerSerializerPair(
  DeletedDef,
  () => {
    return;
  },
  () => {
    return;
  }
);

export function registerDeleteEntitiesSystem(em: EntityManager) {
  em.registerSystem(
    [DeletedDef],
    [],
    (entities) => {
      for (let entity of entities) {
        // TODO: remove from renderer
        if (OnDeleteDef.isOn(entity)) entity.onDelete(entity.id);

        em.keepOnlyComponents(entity.id, [DeletedDef, SyncDef]);
        if (SyncDef.isOn(entity)) {
          entity.sync.dynamicComponents = [];
          entity.sync.fullComponents = [DeletedDef.id];
        }
      }
    },
    "delete"
  );
}

// TODO(@darzu): uh oh. this seems like memory/life cycle management.
//    currently this is needed for entities that "own" other
//    entities but might be deleted in several ways
export const OnDeleteDef = EM.defineComponent(
  "onDelete",
  (onDelete: (deletedId: number) => void) => onDelete
);
