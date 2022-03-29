import { EM, EntityManager } from "../entity-manager.js";
import {
  createMeshPool_WebGPU,
  isMeshHandle,
  mapMeshPositions,
  Mesh,
  scaleMesh,
  unshareProvokingVertices,
} from "../render/mesh-pool.js";
import { PositionDef } from "../physics/transform.js";
import { RenderableConstructDef, RenderableDef } from "../render/renderer.js";
import { assert } from "../test.js";
import { RendererDef } from "../render/render_init.js";
import { vec3 } from "../gl-matrix.js";
import { vec3Dbg } from "../utils-3d.js";

export interface NoodleSeg {
  pos: vec3;
  dir: vec3;
}

export const NoodleDef = EM.defineComponent(
  "noodle",
  (segments: NoodleSeg[]) => ({
    segments,
  })
);

// TODO(@darzu): DEBUGGING
export function debugCreateNoodles(em: EntityManager) {
  const e = em.newEntity();
  em.ensureComponentOn(e, NoodleDef, [
    {
      pos: [0, 0, 0],
      dir: [0, -1, 0],
    },
    {
      pos: [2, 2, 2],
      dir: [0, 1, 0],
    },
  ]);
  const m = createNoodleMesh();
  em.ensureComponentOn(e, RenderableConstructDef, m);
  em.ensureComponentOn(e, PositionDef, [5, -5, 0]);

  const posIdxToSegIdx = [
    // start
    0, 0,
    // end
    1, 1,
  ];

  em.registerSystem(
    [NoodleDef, RenderableDef],
    [RendererDef],
    (es, rs) => {
      for (let e of es) {
        const originalM = e.renderable.meshHandle.readonlyMesh;
        assert(!!originalM, "Cannot find mesh for noodle");
        // mapMeshPositions(m, (p, i) => p);
        // e.noodle.size *= 1.01;
        // vec3.add(e.noodle.segments[0], e.noodle.segments[0], [0.01, 0, 0.01]);
        const newM = mapMeshPositions(originalM, (p, i) => {
          const segIdx = posIdxToSegIdx[i];
          const seg = e.noodle.segments[segIdx];
          // TODO(@darzu): PERF, don't create vecs here
          // TODO(@darzu): rotate around .dir
          return vec3.add(vec3.create(), p, seg.pos);
        });
        rs.renderer.renderer.updateMesh(e.renderable.meshHandle, newM);
      }
    },
    "updateNoodles"
  );
}

export function createNoodleMesh(): Mesh {
  const T = 0.1;

  // TODO(@darzu):  work on this shape

  const m: Mesh = {
    pos: [
      [0, 0, T],
      [0, 0, -T],
      [0, 0, T],
      [0, 0, -T],
    ],
    tri: [
      [0, 1, 2],
      [1, 3, 2],
      // reverse, so visible from all directions
      // TODO(@darzu): just turn off back-face culling?
      [2, 1, 0],
      [2, 3, 1],
    ],
    colors: [
      [0.2, 0.05, 0.05],
      [0.2, 0.05, 0.05],
      [0.2, 0.05, 0.05],
      [0.2, 0.05, 0.05],
    ],
  };

  return unshareProvokingVertices(m);
}
