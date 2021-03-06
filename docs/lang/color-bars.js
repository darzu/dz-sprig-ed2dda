import { pathToSvg, setPos } from "./draw.js";
import { CHAR_W } from "./resize.js";
import { range, setStyle, values } from "../util.js";
import { turbo } from "./color-turbo.js";
import { contrastClamp, pxtColors, pxtColorsHSL, lumDiff, perceptualLum, toRGB, white, whiteLum, toHex, colorDistOKLAB, clampHSL, toHSL, toLCH, clampLCH, toCIELAB, toOKLAB, isLCH } from "./color.js";
import * as m from "../math.js";
import { world } from "./lang-main.js";
const ENABLE_WIDE_GAMUT = false;
export function makeAllColorBars() {
    // reference colors
    const refClrs = values(pxtColors);
    mkColorBar(refClrs, "pxt");
    const avgMinMax = (vs) => ({ avg: m.avg(vs), min: m.min(vs), max: m.max(vs) });
    const satStats = avgMinMax(values(pxtColorsHSL).map(hsl => hsl.s));
    const lumStats = avgMinMax(values(pxtColorsHSL).map(hsl => hsl.l));
    console.log("Reference sat: ");
    console.dir(satStats);
    console.log("Reference lum: ");
    console.dir(lumStats);
    // process yellow
    const yellow = { l: 96, c: 132, h: 98 };
    const yels = [yellow, toRGB(yellow), toCIELAB(yellow), toOKLAB(yellow), toLCH(yellow)];
    mkColorBar(yels, "yellow");
    // clamped reference
    const trg = 4.5;
    const min = trg - 0.1;
    const max = trg + 0.1;
    const refClrsClamped = refClrs
        .map(c => [
        contrastClamp(toLCH(c), white, min, 99, ({ l, c, h }) => clampLCH({ l: l - 1, c, h })),
        contrastClamp(toLCH(c), white, min, 99, ({ l, c, h }) => clampLCH({ l: l + 1, c, h })),
    ])
        .map(n => n.filter(m => !!m).map(m => m))
        .reduce((p, n) => [...p, ...(n.length ? [n[0]] : [])], [])
        .filter(n => !!n)
        .map(n => n);
    mkColorBar(refClrsClamped, "pxt-c");
    // clamped
    const refClrsClampedExact = refClrs
        .map(c => [
        contrastClamp(toLCH(c), white, min, max + 2, ({ l, c, h }) => clampLCH({ l: l - 1, c, h })),
        contrastClamp(toLCH(c), white, min, max + 2, ({ l, c, h }) => clampLCH({ l: l + 1, c, h })),
    ])
        // .map(toLCH)
        // .map(({ l, c, h }) => ({ l: 40, c, h }))
        .map(n => n.filter(m => !!m).map(m => m))
        .reduce((p, n) => [...p, ...(n.length ? [n[0]] : [])], [])
        .filter(n => !!n)
        .map(n => n);
    mkColorBar(refClrsClampedExact, "pxt-c2");
    // Turbo colors
    const NUM_TURBO = refClrs.length;
    const turboClrs = range(NUM_TURBO)
        .map((_, i) => {
        const tx = i / (NUM_TURBO - 1);
        const hsl = turbo(tx);
        return toRGB(hsl);
    });
    const turboBar = mkColorBar(turboClrs, "turbo");
    // All colors
    const NUM_ALL = refClrs.length;
    const allClrs = range(NUM_ALL)
        .map((_, i) => {
        const tx = i / NUM_ALL - 1;
        const hue = (360 * (1.0 - tx)) % 360;
        const hsl = { h: hue, s: 100, l: 50 };
        return toRGB(hsl);
    });
    const rainBar = mkColorBar(allClrs, "hsl");
    // High contrast colors
    const numHues = 16;
    const contClrs = range(numHues)
        .map((_, i) => {
        const tx = i / numHues;
        const hue = (360 * (1.0 - tx)) % 360;
        const cs = range(9)
            .map(i => i * 10 + 20)
            .reverse()
            .map(s => contrastClamp({ h: hue, s, l: 100 }, white, min, max, ({ h, s, l }) => clampHSL({ h, s, l: l - 1 }))
        // contrastClamp(toLAB({ h: hue, s, l: 50 }), toLAB(white), min, max, ({ l, a, b }) => ({ l: l - 0.1, a, b }))
        );
        // console.log(cs)
        return cs
            .filter(c => !!c)
            .map(c => toRGB(c));
    })
        .reduce((p, n) => [...p, ...n], []);
    const contBar = mkColorBar(contClrs, "hsl+sat");
    // High contrast palette with neighbor contrast / perceptual evenness(using Oklab UCS)
    const okClrs = range(360)
        .reverse()
        .map(h => 
    // TODO(@darzu): try doing this in LAB space
    [
        // contrastClamp(toLAB({ h, s: 100, l: 50 }), whiteLAB, min, max, ({ l, a, b }) => ({ l: l - 0.1, a, b })),
        // contrastClamp(toLAB({ h, s: 100, l: 50 }), whiteLAB, min, max, ({ l, a, b }) => ({ l: l + 0.1, a, b }))
        contrastClamp({ h, s: 100, l: 50 }, white, min, max, ({ h, s, l }) => clampHSL({ h, s, l: l - 1 })),
        contrastClamp({ h, s: 100, l: 50 }, white, min, max, ({ h, s, l }) => clampHSL({ h, s, l: l + 1 })),
        // contrastClamp(toLCH({ h, s: 100, l: 50 }), toLCH(white), min, max, ({ l, c, h }) => clampLCH({ l: l - 1, c, h })),
        // contrastClamp(toLCH({ h, s: 100, l: 50 }), toLCH(white), min, max, ({ l, c, h }) => clampLCH({ l: l + 1, c, h }))
    ]
    // ({ h, s: 100, l: 50 })
    )
        .reduce((p, n) => [...p, ...n], [])
        .filter(c => !!c)
        .map(c => c)
        .reduce(mkColorDistNeighborReducer(0.5, colorDistOKLAB), []);
    const okBar = mkColorBar(okClrs, "hsl+n");
    // LCH
    const okLCHClrs = range(360)
        .reverse()
        .map(h => 
    // TODO(@darzu): try doing this in LAB space
    [
        // contrastClamp(toLCH({ h, s: 100, l: 50 }), white, min, max, ({ l, c, h }) => clampLCH({ l: l - 1, c, h })),
        // contrastClamp(toLCH({ h, s: 100, l: 50 }), white, min, max, ({ l, c, h }) => clampLCH({ l: l + 1, c, h })),
        toLCH({ h, s: 100, l: 30 })
    ]
    // ({ h, s: 100, l: 50 })
    )
        .reduce((p, n) => [...p, ...n], [])
        .filter(c => !!c)
        .map(c => c)
        .reduce(mkColorDistNeighborReducer(0.5, colorDistOKLAB), []);
    const okLCHBar = mkColorBar(okLCHClrs, "LCH+n");
    const MIN_SAT = 20;
    const SAT_STEP = 5;
    const okSatClrs = okClrs
        .map(clr => {
        const { h } = toHSL(clr);
        const NUM = (100 - MIN_SAT) / SAT_STEP + 1;
        const cs = range(NUM)
            .map(i => i * SAT_STEP + MIN_SAT)
            .reverse()
            .map(s => contrastClamp({ h, s, l: 100 }, white, min, max, ({ h, s, l }) => clampHSL({ h, s, l: l - 1 }))
        // contrastClamp(toLAB({ h: hue, s, l: 50 }), toLAB(white), min, max, ({ l, a, b }) => ({ l: l - 0.1, a, b }))
        )
            .filter(c => !!c)
            .map(c => c)
            .reduce(mkColorDistNeighborReducer(0.5, colorDistOKLAB), []);
        // cs.forEach(({ h, s, l }) => {
        //     console.log("sat: " + s)
        // })
        return cs;
    })
        .reduce((p, n) => [...p, ...n], []);
    const okSatBar = mkColorBar(okSatClrs, "sat-n");
    const okSat2Clrs = okClrs
        .map(clr => {
        const { h } = toHSL(clr);
        const NUM = (100 - MIN_SAT) / SAT_STEP + 1;
        const cs = range(NUM)
            .map(i => i * SAT_STEP + MIN_SAT)
            .reverse()
            .map(s => contrastClamp({ h, s, l: 100 }, white, min, max, ({ h, s, l }) => clampHSL({ h, s, l: l - 1 }))
        // contrastClamp(toLAB({ h: hue, s, l: 50 }), toLAB(white), min, max, ({ l, a, b }) => ({ l: l - 0.1, a, b }))
        )
            .filter(c => !!c)
            .map(c => c)
            .reduce(mkColorDistAllReducer(1.0, colorDistOKLAB), []);
        // .reduce(mkColorDistAllReducer(9.0, colorDistDeltaE2000), [] as HSL[])
        return cs;
    })
        .reduce((p, n) => [...p, ...n], [])
        .sort((a, b) => a.s - b.s);
    const okSat2Bar = mkColorBar(okSat2Clrs, "sat-all");
}
function mkColorDistNeighborReducer(minDist, strat) {
    let last;
    let first;
    function colorDistReducer(p, n, i) {
        // console.log(n.l)
        if (!p.length) {
            last = n;
            first = n;
            return [n];
        }
        const d1 = strat(last, n);
        const d2 = strat(first, n);
        if (minDist <= d1 && minDist <= d2) {
            // console.log(d)
            last = n;
            return [...p, n];
        }
        return p;
    }
    return colorDistReducer;
}
function mkColorDistAllReducer(minDist, strat) {
    function colorDistReducer(ps, n, i) {
        if (!ps.length) {
            return [n];
        }
        for (let p of ps) {
            // const d = colorDistDeltaE2000(p, n)
            const d = strat(p, n);
            if (d < minDist) {
                // console.log(d)
                return ps;
            }
        }
        return [...ps, n];
    }
    return colorDistReducer;
}
export function getBarsBottom() {
    return 12 + DEFAULT_BAR_HEIGHT * lastColorBarIdx + DEFAULT_BAR_HEIGHT;
}
const DEFAULT_BAR_HEIGHT = 24;
export let lastColorBarIdx = 0;
function mkColorBar(clrs, lblText, width = 128 * 4, height = DEFAULT_BAR_HEIGHT) {
    let barsG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const { w, h } = { w: width / clrs.length, h: height };
    clrs.forEach((clr, i) => {
        const x = i * w;
        const relLum = perceptualLum(clr);
        const relCont = lumDiff(relLum, whiteLum);
        let colorStr = toHex(clr);
        if (isLCH(clr) && ENABLE_WIDE_GAMUT) {
            colorStr = `lch(${clr.l}% ${clr.c} ${clr.h})`;
        }
        const bar = pathToSvg(`m ${x},0 l ${w},0 l 0,${h} l -${w},0 l 0,-${h}`);
        setStyle(bar, {
            fill: colorStr,
            stroke: colorStr
        });
        barsG.appendChild(bar);
        // contrast label
        let dy = h / 2;
        let s = document.createElementNS("http://www.w3.org/2000/svg", "text");
        s.setAttribute("dominant-baseline", "central");
        s.setAttribute("dy", dy.toString());
        s.setAttribute("x", (x + w / 2 - CHAR_W / 2) + "");
        s.textContent = Math.trunc(relCont) + "";
        barsG.appendChild(s);
    });
    // bar label
    {
        let dy = h / 2;
        let s = document.createElementNS("http://www.w3.org/2000/svg", "text");
        s.setAttribute("dominant-baseline", "central");
        s.setAttribute("dy", dy.toString());
        s.setAttribute("x", (-CHAR_W * lblText.length - CHAR_W / 2) + "");
        s.setAttribute("style", "stroke: #000; fill: #000");
        s.textContent = lblText;
        barsG.appendChild(s);
    }
    setPos(barsG, 70, getBarsBottom());
    lastColorBarIdx++;
    world.appendChild(barsG);
    return barsG;
}
//# sourceMappingURL=color-bars.js.map