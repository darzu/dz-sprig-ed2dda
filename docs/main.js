import { test } from "./test.js";
import { setupObjImportExporter } from "./download.js";
import { initShipGame, registerAllSystems } from "./game/game.js";
import { EM } from "./entity-manager.js";
import { addTimeComponents } from "./time.js";
import { InputsDef, registerInputsSystem } from "./inputs.js";
import { MeDef, JoinDef, HostDef, PeerNameDef } from "./net/components.js";
import { addEventComponents } from "./net/events.js";
import { dbg } from "./debugger.js";
import { DevConsoleDef } from "./console.js";
export const FORCE_WEBGL = false;
export const MAX_MESHES = 20000;
export const MAX_VERTICES = 21844;
const ENABLE_NET = false;
const AUTOSTART = true;
export let gameStarted = false;
async function startGame(localPeerName, host) {
    if (gameStarted)
        return;
    gameStarted = true;
    let hosting = host === null;
    let start_of_time = performance.now();
    EM.setDefaultRange("local");
    EM.setIdRange("local", 1, 10000);
    // TODO(@darzu): ECS stuff
    // init ECS
    EM.addSingletonComponent(PeerNameDef, localPeerName);
    if (hosting) {
        // TODO(@darzu): ECS
        EM.setDefaultRange("net");
        EM.setIdRange("net", 10001, 20000);
        EM.addSingletonComponent(MeDef, 0, true);
        EM.addSingletonComponent(HostDef);
    }
    else {
        EM.addSingletonComponent(JoinDef, host);
    }
    registerAllSystems(EM);
    addTimeComponents(EM);
    addEventComponents(EM);
    EM.addSingletonComponent(InputsDef);
    registerInputsSystem(EM);
    initShipGame(EM, hosting);
    // initDbgGame(EM, hosting);
    let previous_frame_time = start_of_time;
    let frame = () => {
        let frame_start_time = performance.now();
        // apply any state updates from the network
        //if (net) net.updateState(previous_frame_time);
        let sim_time = 0;
        let before_sim = performance.now();
        EM.callSystem("time");
        EM.callSystem("getStatsFromNet");
        EM.callSystem("getEventsFromNet");
        EM.callSystem("sendEventsToNet");
        EM.callSystem("canvas");
        EM.callSystem("uiText");
        EM.callSystem("devConsoleToggle");
        EM.callSystem("devConsole");
        EM.callSystem("restartTimer");
        EM.callSystem("updateScore");
        EM.callSystem("renderInit");
        EM.callSystem("musicStart");
        EM.callSystem("handleNetworkEvents");
        EM.callSystem("recordPreviousLocations");
        EM.callSystem("clearRemoteUpdatesMarker");
        EM.callSystem("netUpdate");
        EM.callSystem("predict");
        EM.callSystem("connectToServer");
        EM.callSystem("handleJoin");
        EM.callSystem("handleJoinResponse");
        EM.callSystem("assetLoader");
        EM.callSystem("groundSystem");
        EM.callSystem("startGame");
        EM.callSystem("shipHealthCheck");
        EM.callSystem("shipMove");
        EM.callSystem("shipScore");
        EM.callSystem("groundPropsBuild");
        EM.callSystem("boatPropsBuild");
        EM.callSystem("cannonPropsBuild");
        EM.callSystem("gemPropsBuild");
        EM.callSystem("shipPropsBuild");
        EM.callSystem("buildBullets");
        EM.callSystem("buildCursor");
        EM.callSystem("placeCursorAtScreenCenter");
        EM.callSystem("ensureTransform");
        EM.callSystem("ensureWorldFrame");
        EM.callSystem("stepBoats");
        EM.callSystem("boatsFire");
        EM.callSystem("breakBoats");
        EM.callSystem("controllableInput");
        EM.callSystem("controllableCameraFollow");
        EM.callSystem("buildPlayers");
        EM.callSystem("playerFacingDir");
        EM.callSystem("stepPlayers");
        EM.callSystem("playerOnShip");
        EM.callSystem("updateBullets");
        EM.callSystem("updateNoodles");
        EM.callSystem("updateLifetimes");
        EM.callSystem("interaction");
        EM.callSystem("turretYawPitch");
        EM.callSystem("turretAim");
        EM.callSystem("turretManUnman");
        EM.callSystem("reloadCannon");
        EM.callSystem("playerControlCannon");
        EM.callSystem("playerManCanon");
        EM.callSystem("physicsInit");
        EM.callSystem("clampVelocityByContact");
        EM.callSystem("registerPhysicsClampVelocityBySize");
        EM.callSystem("registerPhysicsApplyLinearVelocity");
        EM.callSystem("physicsApplyAngularVelocity");
        EM.callSystem("updateLocalFromPosRotScale");
        EM.callSystem("updateWorldFromLocalAndParent");
        EM.callSystem("registerUpdateWorldAABBs");
        EM.callSystem("physicsStepContact");
        EM.callSystem("registerUpdateLocalPhysicsAfterRebound");
        EM.callSystem("updateWorldFromLocalAndParent2");
        EM.callSystem("colliderMeshes");
        EM.callSystem("debugMeshes");
        EM.callSystem("debugMeshTransform");
        EM.callSystem("bulletCollision");
        EM.callSystem("modelerOnOff");
        EM.callSystem("modelerClicks");
        EM.callSystem("aabbBuilder");
        EM.callSystem("toolPickup");
        EM.callSystem("toolDrop");
        EM.callSystem("netDebugSystem");
        EM.callSystem("netAck");
        EM.callSystem("netSync");
        EM.callSystem("sendOutboxes");
        EM.callSystem("detectedEventsToHost");
        EM.callSystem("handleEventRequests");
        EM.callSystem("handleEventRequestAcks");
        EM.callSystem("detectedEventsToRequestedEvents");
        EM.callSystem("requestedEventsToEvents");
        EM.callSystem("sendEvents");
        EM.callSystem("handleEvents");
        EM.callSystem("handleEventAcks");
        EM.callSystem("runEvents");
        EM.callSystem("delete");
        EM.callSystem("smoothMotion");
        EM.callSystem("updateMotionSmoothing");
        EM.callSystem("updateRendererWorldFrames");
        EM.callSystem("smoothCamera");
        EM.callSystem("cameraFollowTarget");
        EM.callSystem("retargetCamera");
        EM.callSystem("updateCameraView");
        EM.callSystem("renderView");
        EM.callSystem("constructRenderables");
        EM.callSystem("stepRenderer");
        EM.callSystem("inputs");
        EM.callSystem("shipUI");
        EM.callSystem("spawnBoats");
        EM.callOneShotSystems();
        EM.loops++;
        sim_time += performance.now() - before_sim;
        let jsTime = performance.now() - frame_start_time;
        let frameTime = frame_start_time - previous_frame_time;
        previous_frame_time = frame_start_time;
        const devStats = EM.getResource(DevConsoleDef);
        if (devStats)
            devStats.updateAvgs(jsTime, frameTime, sim_time);
        requestAnimationFrame(frame);
    };
    if (ENABLE_NET) {
        try {
            /*
            net = new Net(_gameState, host, (id: string) => {
              _renderer.finishInit(); // TODO(@darzu): debugging
              if (hosting) {
                console.log("hello");
                console.log(`Net up and running with id`);
                console.log(`${id}`);
                const url = `${window.location.href}?server=${id}`;
                console.log(url);
                if (navigator.clipboard) navigator.clipboard.writeText(url);
                frame();
              } else {
                frame();
              }
            });*/
        }
        catch (e) {
            console.error("Failed to initialize net");
            console.error(e);
            //net = null;
        }
    }
    else {
        frame();
    }
}
function getPeerName(queryString) {
    const user = queryString["user"] || "default";
    let peerName = localStorage.getItem("peerName-" + user);
    if (!peerName) {
        // TODO: better random peer name generation, or get peer name from server
        const rand = crypto.getRandomValues(new Uint8Array(16));
        peerName = rand.join("");
        localStorage.setItem("peerName-" + user, peerName);
    }
    return peerName;
}
async function main() {
    var _a;
    const queryString = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    const urlServerId = (_a = queryString["server"]) !== null && _a !== void 0 ? _a : null;
    const peerName = getPeerName(queryString);
    let controls = document.getElementById("server-controls");
    let serverStartButton = document.getElementById("server-start");
    let connectButton = document.getElementById("connect");
    let serverIdInput = document.getElementById("server-id");
    if (ENABLE_NET && !AUTOSTART && !urlServerId) {
        serverStartButton.onclick = () => {
            startGame(peerName, null);
            controls.hidden = true;
        };
        connectButton.onclick = () => {
            startGame(peerName, serverIdInput.value);
            controls.hidden = true;
        };
    }
    else {
        startGame(peerName, urlServerId);
        controls.hidden = true;
    }
}
test();
// dom dependant stuff
window.onload = () => {
    setupObjImportExporter();
};
(async () => {
    // TODO(@darzu): work around for lack of top-level await in Safari
    try {
        await main();
    }
    catch (e) {
        console.error(e);
    }
})();
// for debugging
window.dbg = dbg;
window.EM = EM;
//# sourceMappingURL=main.js.map