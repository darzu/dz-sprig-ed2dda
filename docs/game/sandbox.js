import { CameraFollowDef, setCameraFollowPosition, CameraDef, } from "../camera.js";
import { ColorDef } from "../color.js";
import { EM } from "../entity-manager.js";
import { vec3, quat } from "../gl-matrix.js";
import { InputsDef } from "../inputs.js";
import { AngularVelocityDef, LinearVelocityDef } from "../physics/motion.js";
import { gjk } from "../physics/narrowphase.js";
import { WorldFrameDef } from "../physics/nonintersection.js";
import { PhysicsParentDef, PositionDef, RotationDef, } from "../physics/transform.js";
import { cloneMesh } from "../render/mesh-pool.js";
import { RenderableDef, RenderableConstructDef } from "../render/renderer.js";
import { RendererDef } from "../render/render_init.js";
import { tempVec } from "../temp-pool.js";
import { farthestPointInDir } from "../utils-3d.js";
import { AssetsDef } from "./assets.js";
import { ControllableDef } from "./controllable.js";
import { GlobalCursor3dDef } from "./cursor.js";
export const GhostDef = EM.defineComponent("ghost", () => ({}));
export function createGhost(em) {
    const g = em.newEntity();
    em.ensureComponentOn(g, GhostDef);
    em.ensureComponentOn(g, ControllableDef);
    g.controllable.modes.canFall = false;
    g.controllable.modes.canJump = false;
    em.ensureComponentOn(g, CameraFollowDef, 1);
    setCameraFollowPosition(g, "firstPerson");
    em.ensureComponentOn(g, PositionDef);
    em.ensureComponentOn(g, RotationDef);
    // quat.rotateY(g.rotation, quat.IDENTITY, (-5 * Math.PI) / 8);
    // quat.rotateX(g.cameraFollow.rotationOffset, quat.IDENTITY, -Math.PI / 8);
    em.ensureComponentOn(g, LinearVelocityDef);
    return g;
}
export function initDbgGame(em, hosting) {
    const camera = em.addSingletonComponent(CameraDef);
    camera.fov = Math.PI * 0.5;
    em.registerOneShotSystem(null, [AssetsDef, GlobalCursor3dDef, RendererDef], (_, res) => {
        const g = createGhost(em);
        // em.ensureComponentOn(g, RenderableConstructDef, res.assets.cube.proto);
        // createPlayer(em);
        // vec3.copy(e.position, [-16.6, 5, -5.1]);
        // quat.copy(e.rotation, [0, -0.77, 0, 0.636]);
        // vec3.copy(e.cameraFollow.positionOffset, [0, 0, 0]);
        // quat.copy(e.cameraFollow.rotationOffset, [-0.225, 0, 0, 0.974]);
        // vec3.copy(g.position, [-4.28, 0.97, 0.11]);
        // quat.setAxisAngle(g.rotation, [0.0, -1.0, 0.0], 1.62);
        // vec3.copy(g.cameraFollow.positionOffset, [0.0, 0.0, 0.0]);
        // quat.copy(g.cameraFollow.rotationOffset, [-0.18, 0.0, 0.0, 0.98]);
        vec3.copy(g.position, [0, 0, -1.2]);
        quat.setAxisAngle(g.rotation, [0.0, -1.0, 0.0], 1.62);
        // setCameraFollowPosition(g, "thirdPerson");
        g.cameraFollow.positionOffset = [0, 0, 5];
        g.controllable.modes.canYaw = false;
        g.controllable.modes.canCameraYaw = true;
        g.controllable.speed *= 0.5;
        const c = res.globalCursor3d.cursor();
        if (RenderableDef.isOn(c))
            c.renderable.enabled = false;
        vec3.copy(res.renderer.renderer.backgroundColor, [0.7, 0.8, 1.0]);
        const p = em.newEntity();
        em.ensureComponentOn(p, RenderableConstructDef, res.assets.plane.proto);
        em.ensureComponentOn(p, ColorDef, [0.2, 0.3, 0.2]);
        em.ensureComponentOn(p, PositionDef, [0, -5, 0]);
        const b1 = em.newEntity();
        const m1 = cloneMesh(res.assets.cube.mesh);
        em.ensureComponentOn(b1, RenderableConstructDef, m1);
        em.ensureComponentOn(b1, ColorDef, [0.1, 0.1, 0.1]);
        em.ensureComponentOn(b1, PositionDef, [0, 0, 3]);
        em.ensureComponentOn(b1, RotationDef);
        em.ensureComponentOn(b1, AngularVelocityDef, [0, 0.001, 0.001]);
        em.ensureComponentOn(b1, WorldFrameDef);
        // em.ensureComponentOn(b1, ColliderDef, {
        //   shape: "Box",
        //   solid: false,
        //   center: res.assets.cube.center,
        //   halfsize: res.assets.cube.halfsize,
        // });
        const b2 = em.newEntity();
        const m2 = cloneMesh(res.assets.cube.mesh);
        em.ensureComponentOn(b2, RenderableConstructDef, m2);
        em.ensureComponentOn(b2, ColorDef, [0.1, 0.1, 0.1]);
        em.ensureComponentOn(b2, PositionDef, [0, 0, 0]);
        // em.ensureComponentOn(b2, PositionDef, [0, 0, -1.2]);
        em.ensureComponentOn(b2, WorldFrameDef);
        em.ensureComponentOn(b2, PhysicsParentDef, g.id);
        // em.ensureComponentOn(b2, ColliderDef, {
        //   shape: "Box",
        //   solid: false,
        //   center: res.assets.cube.center,
        //   halfsize: res.assets.cube.halfsize,
        // });
        const b3 = em.newEntity();
        const m3 = cloneMesh(res.assets.ball.mesh);
        em.ensureComponentOn(b3, RenderableConstructDef, m3);
        em.ensureComponentOn(b3, ColorDef, [0.1, 0.1, 0.1]);
        em.ensureComponentOn(b3, PositionDef, [0, 0, -3]);
        em.ensureComponentOn(b3, RotationDef);
        em.ensureComponentOn(b3, WorldFrameDef);
        const b4 = em.newEntity();
        const m4 = cloneMesh(res.assets.tetra.mesh);
        em.ensureComponentOn(b4, RenderableConstructDef, m4);
        em.ensureComponentOn(b4, ColorDef, [0.1, 0.1, 0.1]);
        em.ensureComponentOn(b4, PositionDef, [0, -3, 0]);
        em.ensureComponentOn(b4, RotationDef);
        em.ensureComponentOn(b4, WorldFrameDef);
        // NOTE: this uses temp vectors, it must not live long
        // TODO(@darzu): for perf, this should be done only once per obj per frame;
        //    maybe we should transform the dir instead
        function createWorldShape(g, world) {
            const worldVerts = g.uniqueVerts.map((p) => vec3.transformMat4(tempVec(), p, world.transform));
            const support = (d) => farthestPointInDir(worldVerts, d);
            const center = vec3.transformMat4(tempVec(), g.center, world.transform);
            return {
                center,
                support,
            };
        }
        em.registerSystem(null, [InputsDef], (_, { inputs }) => {
            // if (!inputs.keyClicks["g"]) return;
            // TODO(@darzu):
            const shapeA = createWorldShape(res.assets.cube, b1.world);
            const shapeB = createWorldShape(res.assets.cube, b2.world);
            const shapeC = createWorldShape(res.assets.ball, b3.world);
            const shapeD = createWorldShape(res.assets.tetra, b4.world);
            if (gjk(shapeA, shapeB)) {
                b1.color[0] = 0.3;
                b2.color[0] = 0.3;
            }
            else {
                b1.color[0] = 0.1;
                b2.color[0] = 0.1;
            }
            if (gjk(shapeC, shapeB)) {
                b3.color[1] = 0.3;
                b2.color[1] = 0.3;
            }
            else {
                b3.color[1] = 0.1;
                b2.color[1] = 0.1;
            }
            if (gjk(shapeD, shapeB)) {
                b4.color[2] = 0.3;
                b2.color[2] = 0.3;
            }
            else {
                b4.color[2] = 0.1;
                b2.color[2] = 0.1;
            }
        }, "checkGJK");
    });
}
//# sourceMappingURL=sandbox.js.map