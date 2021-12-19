import { Component, EM, EntityManager } from "./entity-manager.js";
import { mat4, quat, vec3 } from "./gl-matrix.js";
import { tempVec, tempQuat } from "./temp-pool.js";

// TODO(@darzu): implement local transform instead of Motion's position & rotation?
//  one problem is that the order in which you interleave rotation/translations matters if it
//  is all in one matrix
// transforms we might care about:
//  on mesh load, one time transform it
//  object placement in "local" space (what motion did)
//  final object placement in "global" space for the renderer
//  final object placement in "global" space for physics
// const TransformLocalDef = EM.defineComponent("transformLocal", () => {
//   return mat4.create();
// });
// type TransformLocal = mat4;

// WORLD TRANSFORM
export const WorldTransformDef = EM.defineComponent(
  "worldTransform",
  (t?: mat4) => {
    return t ?? mat4.create();
  }
);
export type WorldTransform = mat4;

// POSITION
export const PositionDef = EM.defineComponent(
  "position",
  (p?: vec3) => p || vec3.fromValues(0, 0, 0)
);
export type Position = Component<typeof PositionDef>;
EM.registerSerializerPair(
  PositionDef,
  (o, buf) => buf.writeVec3(o),
  (o, buf) => buf.readVec3(o)
);

// ROTATION
export const RotationDef = EM.defineComponent(
  "rotation",
  (r?: quat) => r || quat.create()
);
export type Rotation = Component<typeof RotationDef>;
EM.registerSerializerPair(
  RotationDef,
  (o, buf) => buf.writeQuat(o),
  (o, buf) => buf.readQuat(o)
);

// SCALE
export const ScaleDef = EM.defineComponent(
  "scale",
  (by?: vec3) => by || vec3.fromValues(1, 1, 1)
);
export type Scale = Component<typeof ScaleDef>;
EM.registerSerializerPair(
  ScaleDef,
  (o, buf) => buf.writeVec3(o),
  (o, buf) => buf.readVec3(o)
);

// PARENT
export const PhysicsParentDef = EM.defineComponent(
  "physicsParent",
  (p?: number) => {
    return { id: p || 0 };
  }
);
export type PhysicsParent = Component<typeof PhysicsParentDef>;

// PARENT TRANSFORM
export const ParentTransformDef = EM.defineComponent("parentTransform", () => {
  return mat4.create();
});

type Transformable = {
  id: number;
  position?: Position;
  rotation?: Rotation;
  // transformLocal: TransformLocal;
  worldTransform: WorldTransform;
  // optional components
  // TODO(@darzu): let the query system specify optional components
  physicsParent?: PhysicsParent;
  scale?: Scale;
};

const _transformables: Map<number, Transformable> = new Map();
const _hasTransformed: Set<number> = new Set();

function updateWorldTransform(o: Transformable) {
  if (_hasTransformed.has(o.id)) return;

  // first, update from motion (optionally)
  if (PositionDef.isOn(o)) {
    mat4.fromRotationTranslationScale(
      o.worldTransform,
      RotationDef.isOn(o) ? o.rotation : quat.identity(tempQuat()),
      o.position,
      ScaleDef.isOn(o) ? o.scale : vec3.set(tempVec(), 1, 1, 1)
    );
  }

  if (PhysicsParentDef.isOn(o) && o.physicsParent.id > 0 && ParentTransformDef.isOn(o)) {
    const parent = _transformables.get(o.physicsParent.id);
    if (!parent)
      throw `physicsParent ${o.physicsParent.id} doesn't have a worldTransform!`

    // update relative to parent
    if (!_hasTransformed.has(o.physicsParent.id)) {
      updateWorldTransform(parent);
      o.parentTransform = parent.worldTransform;
    }

    mat4.mul(
      o.worldTransform,
      parent.worldTransform,
      o.worldTransform
    );
  }

  _hasTransformed.add(o.id);
}

export function registerInitTransforms(em: EntityManager) {
  // ensure we have a world transform if we're using the physics system
  // TODO(@darzu): have some sort of "usePhysics" marker component instead of pos?
  em.registerSystem([PositionDef], [], (objs) => {
    for (let o of objs) em.ensureComponent(o.id, WorldTransformDef);
  }, "ensureWorldTransform");

  // ensure we have a parent world transform if we have a physics parent
  em.registerSystem([PhysicsParentDef], [], (objs) => {
    for (let o of objs) em.ensureComponent(o.id, ParentTransformDef);
  }, "ensureParentTransform");
}
export function registerUpdateTransforms(em: EntityManager, suffix: string) {
  // calculate the world transform
  em.registerSystem(
    [
      WorldTransformDef,
      // TODO(@darzu): USE transformLocal
      // TransformLocalDef,
    ],
    [],
    (objs) => {
      _transformables.clear();
      _hasTransformed.clear();

      for (let o of objs) {
        _transformables.set(o.id, o);
      }

      for (let o of objs) {
        updateWorldTransform(o);
      }
    },
    "updateWorldTransforms" + suffix
  );
}
