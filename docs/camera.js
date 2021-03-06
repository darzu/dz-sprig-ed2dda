import { CanvasDef } from "./canvas.js";
import { EM, } from "./entity-manager.js";
import { mat4, quat, vec3 } from "./gl-matrix.js";
import { MeDef } from "./net/components.js";
import { WorldFrameDef } from "./physics/nonintersection.js";
import { RendererWorldFrameDef } from "./render/renderer.js";
import { computeNewError, reduceError } from "./smoothing.js";
import { tempQuat, tempVec } from "./temp-pool.js";
import { PhysicsTimerDef } from "./time.js";
export const CameraDef = EM.defineComponent("camera", () => {
    return {
        perspectiveMode: "perspective",
        targetId: 0,
        positionOffset: vec3.create(),
        rotationOffset: quat.create(),
        // smoothing:
        prevTargetId: 0,
        lastRotation: quat.create(),
        lastPosition: vec3.create(),
        targetRotationError: quat.identity(quat.create()),
        targetPositionError: vec3.create(),
        cameraRotationError: quat.identity(quat.create()),
        cameraPositionError: vec3.create(),
    };
});
export const CameraViewDef = EM.defineComponent("cameraView", () => {
    return {
        aspectRatio: 1,
        width: 100,
        height: 100,
        viewProjMat: mat4.create(),
    };
});
export const CameraFollowDef = EM.defineComponent("cameraFollow", (priority = 0) => ({
    positionOffset: vec3.create(),
    rotationOffset: quat.create(),
    priority,
}));
export function setCameraFollowPosition(c, mode) {
    if (mode === "thirdPerson") {
        vec3.copy(c.cameraFollow.positionOffset, [0, 0, 10]);
    }
    else if (mode === "thirdPersonOverShoulder") {
        vec3.copy(c.cameraFollow.positionOffset, [2, 2, 8]);
    }
}
export function registerCameraSystems(em) {
    em.registerSystem(null, [CameraDef, PhysicsTimerDef], function (_, res) {
        if (!res.physicsTimer.steps)
            return;
        const dt = res.physicsTimer.steps * res.physicsTimer.period;
        reduceError(res.camera.targetPositionError, dt);
        reduceError(res.camera.targetRotationError, dt);
        reduceError(res.camera.cameraPositionError, dt);
        reduceError(res.camera.cameraRotationError, dt);
    }, "smoothCamera");
    em.registerSystem([CameraFollowDef], [CameraDef], (cs, res) => {
        const target = cs.reduce((p, n) => !p || n.cameraFollow.priority > p.cameraFollow.priority ? n : p, null);
        if (target) {
            res.camera.targetId = target.id;
            vec3.copy(res.camera.positionOffset, target.cameraFollow.positionOffset);
            quat.copy(res.camera.rotationOffset, target.cameraFollow.rotationOffset);
        }
        else {
            res.camera.targetId = 0;
            vec3.zero(res.camera.positionOffset);
            quat.identity(res.camera.rotationOffset);
        }
    }, "cameraFollowTarget");
    em.registerSystem(null, [CameraDef], function ([], res) {
        if (res.camera.prevTargetId === res.camera.targetId) {
            quat.copy(res.camera.lastRotation, res.camera.rotationOffset);
            vec3.copy(res.camera.lastPosition, res.camera.positionOffset);
            return;
        }
        const prevTarget = em.findEntity(res.camera.prevTargetId, [
            WorldFrameDef,
        ]);
        const newTarget = em.findEntity(res.camera.targetId, [WorldFrameDef]);
        if (prevTarget && newTarget) {
            computeNewError(prevTarget.world.position, newTarget.world.position, res.camera.targetPositionError);
            computeNewError(prevTarget.world.rotation, newTarget.world.rotation, res.camera.targetRotationError);
        }
        computeNewError(res.camera.lastPosition, res.camera.positionOffset, res.camera.cameraPositionError);
        computeNewError(res.camera.lastRotation, res.camera.rotationOffset, res.camera.cameraRotationError);
        res.camera.prevTargetId = res.camera.targetId;
    }, "retargetCamera");
    em.addSingletonComponent(CameraViewDef);
    em.registerSystem(null, [CameraViewDef, CameraDef, MeDef, CanvasDef], (_, resources) => {
        const { cameraView, camera, me, htmlCanvas } = resources;
        let targetEnt = em.findEntity(camera.targetId, [RendererWorldFrameDef]);
        if (!targetEnt)
            return;
        // update aspect ratio and size
        cameraView.aspectRatio = Math.abs(htmlCanvas.canvas.width / htmlCanvas.canvas.height);
        cameraView.width = htmlCanvas.canvas.width;
        cameraView.height = htmlCanvas.canvas.height;
        let viewMatrix = mat4.create();
        if (targetEnt) {
            const computedRotation = quat.mul(tempQuat(), targetEnt.rendererWorldFrame.rotation, camera.targetRotationError);
            quat.normalize(computedRotation, computedRotation);
            const computedTranslation = vec3.add(tempVec(), targetEnt.rendererWorldFrame.position, camera.targetPositionError);
            mat4.fromRotationTranslationScale(viewMatrix, computedRotation, computedTranslation, targetEnt.rendererWorldFrame.scale);
        }
        const computedCameraRotation = quat.mul(tempQuat(), camera.rotationOffset, camera.cameraRotationError);
        mat4.multiply(viewMatrix, viewMatrix, mat4.fromQuat(mat4.create(), computedCameraRotation));
        const computedCameraTranslation = vec3.add(tempVec(), camera.positionOffset, camera.cameraPositionError);
        mat4.translate(viewMatrix, viewMatrix, computedCameraTranslation);
        mat4.invert(viewMatrix, viewMatrix);
        const projectionMatrix = mat4.create();
        if (camera.perspectiveMode === "ortho") {
            const ORTHO_SIZE = 40;
            mat4.ortho(projectionMatrix, -ORTHO_SIZE, ORTHO_SIZE, -ORTHO_SIZE, ORTHO_SIZE, -400, 200);
        }
        else {
            mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, cameraView.aspectRatio, 1, 10000.0 /*view distance*/);
        }
        const viewProj = mat4.multiply(mat4.create(), projectionMatrix, viewMatrix);
        cameraView.viewProjMat = viewProj;
    }, "updateCameraView");
}
//# sourceMappingURL=camera.js.map