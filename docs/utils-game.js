import { ColorDef } from "./color.js";
import { PositionDef } from "./physics/transform.js";
import { RenderableConstructDef } from "./render/renderer.js";
// TODO(@darzu): move this helper elsewhere?
export function drawLine(em, start, end, color) {
    const { id } = em.newEntity();
    em.addComponent(id, ColorDef, color);
    const m = {
        pos: [start, end],
        tri: [],
        colors: [],
        lines: [[0, 1]],
        usesProvoking: true,
    };
    em.addComponent(id, RenderableConstructDef, m);
    em.addComponent(id, PositionDef);
}
//# sourceMappingURL=utils-game.js.map