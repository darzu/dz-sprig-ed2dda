// once a mesh has been added to our vertex, triangle, and uniform buffers, we need
import { computeTriangleNormal } from "../3d-util.js";
import { mat4, vec3 } from "../ext/gl-matrix.js";
import { align, sum } from "../math.js";
const indicesPerTriangle = 3;
const bytesPerTri = Uint16Array.BYTES_PER_ELEMENT * indicesPerTriangle;
const bytesPerMat4 = (4 * 4) /*4x4 mat*/ * 4; /*f32*/
const bytesPerVec3 = 3 /*vec3*/ * 4; /*f32*/
const bytesPerVec2 = 2 /*vec3*/ * 4; /*f32*/
const bytesPerFloat = Float32Array.BYTES_PER_ELEMENT;
const bytesPerUint16 = Uint16Array.BYTES_PER_ELEMENT;
const bytesPerUint32 = Uint32Array.BYTES_PER_ELEMENT;
// Everything to do with our vertex format must be in this module (minus downstream 
//  places that should get type errors when this module changes.)
// TODO(@darzu): code gen some of this so code changes are less error prone.
export var Vertex;
(function (Vertex) {
    let Kind;
    (function (Kind) {
        Kind[Kind["normal"] = 0] = "normal";
        Kind[Kind["water"] = 1] = "water";
    })(Kind = Vertex.Kind || (Vertex.Kind = {}));
    // define the format of our vertices (this needs to agree with the inputs to the vertex shaders)
    Vertex.WebGPUFormat = [
        { shaderLocation: 0, offset: bytesPerVec3 * 0, format: 'float32x3' },
        { shaderLocation: 1, offset: bytesPerVec3 * 1, format: 'float32x3' },
        { shaderLocation: 2, offset: bytesPerVec3 * 2, format: 'float32x3' },
        { shaderLocation: 3, offset: bytesPerVec3 * 3, format: 'uint32' }, // kind
    ];
    const names = [
        'position',
        'color',
        'normal',
        'kind',
    ];
    const formatToWgslType = {
        "float16x2": "vec2<f16>",
        "float16x4": "vec2<f16>",
        "float32": "f32",
        "float32x2": "vec2<f32>",
        "float32x3": "vec3<f32>",
        "float32x4": "vec4<f32>",
        "uint32": "u32",
        "sint32": "i32",
    };
    function GenerateWGSLVertexInputStruct(terminator) {
        // Example output:
        // `
        // [[location(0)]] position : vec3<f32>,
        // [[location(1)]] color : vec3<f32>,
        // [[location(2)]] normal : vec3<f32>,
        // [[location(3)]] kind : u32,
        // `
        let res = ``;
        if (Vertex.WebGPUFormat.length !== names.length)
            throw `mismatch between vertex format specifiers and names`;
        for (let i = 0; i < Vertex.WebGPUFormat.length; i++) {
            const f = Vertex.WebGPUFormat[i];
            const t = formatToWgslType[f.format];
            const n = names[i];
            if (!t)
                throw `Unknown vertex type -> wgls type '${f.format}'`;
            res += `[[location(${f.shaderLocation})]] ${n} : ${t}${terminator}\n`;
        }
        return res;
    }
    Vertex.GenerateWGSLVertexInputStruct = GenerateWGSLVertexInputStruct;
    // these help us pack and use vertices in that format
    Vertex.ByteSize = bytesPerVec3 /*pos*/ + bytesPerVec3 /*color*/ + bytesPerVec3 /*normal*/ + bytesPerUint32 /*kind*/;
    // for performance reasons, we keep scratch buffers around
    const scratch_f32 = new Float32Array(3 + 3 + 3);
    const scratch_f32_as_u8 = new Uint8Array(scratch_f32.buffer);
    const scratch_u32 = new Uint32Array(1);
    const scratch_u32_as_u8 = new Uint8Array(scratch_u32.buffer);
    function Serialize(buffer, byteOffset, pos, color, normal, kind) {
        scratch_f32[0] = pos[0];
        scratch_f32[1] = pos[1];
        scratch_f32[2] = pos[2];
        scratch_f32[3] = color[0];
        scratch_f32[4] = color[1];
        scratch_f32[5] = color[2];
        scratch_f32[6] = normal[0];
        scratch_f32[7] = normal[1];
        scratch_f32[8] = normal[2];
        buffer.set(scratch_f32_as_u8, byteOffset);
        scratch_u32[0] = kind;
        buffer.set(scratch_u32_as_u8, byteOffset + bytesPerVec3 * 3);
    }
    Vertex.Serialize = Serialize;
    // for WebGL: deserialize whole array?
    function Deserialize(buffer, vertexCount, positions, colors, normals, kinds) {
        if (false
            || buffer.length < vertexCount * Vertex.ByteSize
            || positions.length < vertexCount * 3
            || colors.length < vertexCount * 3
            || normals.length < vertexCount * 3
            || kinds.length < vertexCount * 1)
            throw 'buffer too short!';
        // TODO(@darzu): This only works because they have the same element size. Not sure what to do if that changes.
        const f32View = new Float32Array(buffer.buffer);
        const u32View = new Uint32Array(buffer.buffer);
        for (let i = 0; i < vertexCount; i++) {
            const u8_i = i * Vertex.ByteSize;
            const f32_i = u8_i / Float32Array.BYTES_PER_ELEMENT;
            const u32_i = u8_i / Uint32Array.BYTES_PER_ELEMENT;
            positions[i * 3 + 0] = f32View[f32_i + 0];
            positions[i * 3 + 1] = f32View[f32_i + 1];
            positions[i * 3 + 2] = f32View[f32_i + 2];
            colors[i * 3 + 0] = f32View[f32_i + 3];
            colors[i * 3 + 1] = f32View[f32_i + 4];
            colors[i * 3 + 2] = f32View[f32_i + 5];
            normals[i * 3 + 0] = f32View[f32_i + 6];
            normals[i * 3 + 1] = f32View[f32_i + 7];
            normals[i * 3 + 2] = f32View[f32_i + 8];
            kinds[i] = f32View[u32_i + 9];
        }
    }
    Vertex.Deserialize = Deserialize;
})(Vertex || (Vertex = {}));
export var MeshUniform;
(function (MeshUniform) {
    const _counts = [
        align(4 * 4, 4),
        align(3, 4),
        align(3, 4), // aabb max
    ];
    const _names = [
        'transform',
        'aabbMin',
        'aabbMax',
    ];
    const _types = [
        'mat4x4<f32>',
        'vec3<f32>',
        'vec3<f32>',
    ];
    const _offsets = _counts.reduce((p, n) => [...p, p[p.length - 1] + n], [0]);
    MeshUniform.ByteSizeExact = sum(_counts) * bytesPerFloat;
    MeshUniform.ByteSizeAligned = align(MeshUniform.ByteSizeExact, 256); // uniform objects must be 256 byte aligned
    const scratch_f32 = new Float32Array(sum(_counts));
    const scratch_f32_as_u8 = new Uint8Array(scratch_f32.buffer);
    function Serialize(buffer, byteOffset, transform, aabbMin, aabbMax) {
        scratch_f32.set(transform, _offsets[0]);
        scratch_f32.set(aabbMin, _offsets[1]);
        scratch_f32.set(aabbMax, _offsets[2]);
        buffer.set(scratch_f32_as_u8, byteOffset);
    }
    MeshUniform.Serialize = Serialize;
    function GenerateWGSLUniformStruct() {
        // Example:
        //     transform: mat4x4<f32>;
        //     aabbMin: vec3<f32>;
        //     aabbMax: vec3<f32>;
        if (_names.length !== _types.length)
            throw `mismatch between names and sizes for mesh uniform format`;
        let res = ``;
        for (let i = 0; i < _names.length; i++) {
            const n = _names[i];
            const t = _types[i];
            res += `${n}: ${t};\n`;
        }
        return res;
    }
    MeshUniform.GenerateWGSLUniformStruct = GenerateWGSLUniformStruct;
})(MeshUniform || (MeshUniform = {}));
export var SceneUniform;
(function (SceneUniform) {
    const _counts = [
        4 * 4,
        4 * 4,
        3,
        1,
        2,
        3, // camera pos
    ];
    const _names = [
        'transform',
        'aabbMin',
        'aabbMax',
    ];
    const _types = [
        'mat4x4<f32>',
        'vec3<f32>',
        'vec3<f32>',
    ];
    const _offsets = _counts.reduce((p, n) => [...p, p[p.length - 1] + n], [0]);
    // TODO(@darzu): SCENE FORMAT
    // defines the format of our scene's uniform data
    SceneUniform.ByteSizeExact = sum(_counts) * bytesPerFloat;
    SceneUniform.ByteSizeAligned = align(SceneUniform.ByteSizeExact, 256); // uniform objects must be 256 byte aligned
    function GenerateWGSLUniformStruct() {
        // Example
        //     cameraViewProjMatrix : mat4x4<f32>;
        //     lightViewProjMatrix : mat4x4<f32>;
        //     lightDir : vec3<f32>;
        //     time : f32;
        //     targetSize: vec2<f32>;
        //     cameraPos : vec3<f32>;
        // TODO(@darzu): enforce agreement w/ Scene interface
        return `
            cameraViewProjMatrix : mat4x4<f32>;
            lightViewProjMatrix : mat4x4<f32>;
            lightDir : vec3<f32>;
            time : f32;
            targetSize: vec2<f32>;
            cameraPos : vec3<f32>;
        `;
    }
    SceneUniform.GenerateWGSLUniformStruct = GenerateWGSLUniformStruct;
    const scratch_f32 = new Float32Array(sum(_counts));
    const scratch_f32_as_u8 = new Uint8Array(scratch_f32.buffer);
    function Serialize(buffer, byteOffset, data) {
        scratch_f32.set(data.cameraViewProjMatrix, _offsets[0]);
        scratch_f32.set(data.lightViewProjMatrix, _offsets[1]);
        scratch_f32.set(data.lightDir, _offsets[2]);
        scratch_f32[_offsets[3]] = data.time;
        scratch_f32.set(data.targetSize, _offsets[4]);
        scratch_f32.set(data.cameraPos, _offsets[5]);
        buffer.set(scratch_f32_as_u8, byteOffset);
    }
    SceneUniform.Serialize = Serialize;
})(SceneUniform || (SceneUniform = {}));
export function unshareVertices(input) {
    const pos = [];
    const tri = [];
    input.tri.forEach(([i0, i1, i2], i) => {
        pos.push(input.pos[i0]);
        pos.push(input.pos[i1]);
        pos.push(input.pos[i2]);
        tri.push([
            i * 3 + 0,
            i * 3 + 1,
            i * 3 + 2,
        ]);
    });
    return { pos, tri, colors: input.colors, verticesUnshared: true };
}
export function unshareProvokingVertices(input) {
    const pos = [...input.pos];
    const tri = [];
    const provoking = {};
    input.tri.forEach(([i0, i1, i2], triI) => {
        if (!provoking[i0]) {
            // First vertex is unused as a provoking vertex, so we'll use it for this triangle.
            provoking[i0] = true;
            tri.push([i0, i1, i2]);
        }
        else if (!provoking[i1]) {
            // First vertex was taken, so let's see if we can rotate the indices to get an unused 
            // provoking vertex.
            provoking[i1] = true;
            tri.push([i1, i2, i0]);
        }
        else if (!provoking[i2]) {
            // ditto
            provoking[i2] = true;
            tri.push([i2, i0, i1]);
        }
        else {
            // All vertices are taken, so create a new one
            const i3 = pos.length;
            pos.push(input.pos[i0]);
            provoking[i3] = true;
            tri.push([i3, i1, i2]);
        }
    });
    return { ...input, pos, tri, usesProvoking: true };
}
export function createMeshPoolBuilder_WebGPU(device, opts) {
    const { maxMeshes, maxTris, maxVerts } = opts;
    // create our mesh buffers (vertex, index, uniform)
    const verticesBuffer = device.createBuffer({
        size: maxVerts * Vertex.ByteSize,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    });
    const indicesBuffer = device.createBuffer({
        size: maxTris * bytesPerTri,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    });
    const uniformBuffer = device.createBuffer({
        size: MeshUniform.ByteSizeAligned * maxMeshes,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    });
    // to modify buffers, we need to map them into JS space; we'll need to unmap later
    let verticesMap = new Uint8Array(verticesBuffer.getMappedRange());
    let indicesMap = new Uint16Array(indicesBuffer.getMappedRange());
    let uniformMap = new Uint8Array(uniformBuffer.getMappedRange());
    const maps = {
        verticesMap,
        indicesMap,
        uniformMap
    };
    const buffers = {
        device,
        verticesBuffer,
        indicesBuffer,
        uniformBuffer,
    };
    const builder = createMeshPoolBuilder(opts, maps, updateUniform);
    const scratch_uniform_u8 = new Uint8Array(MeshUniform.ByteSizeAligned);
    function updateUniform(m) {
        MeshUniform.Serialize(scratch_uniform_u8, 0, m.transform, m.aabbMin, m.aabbMax);
        device.queue.writeBuffer(uniformBuffer, m.modelUniByteOffset, scratch_uniform_u8);
    }
    const builder_webgpu = {
        ...builder,
        device,
        finish, // TODO(@darzu): 
    };
    function finish() {
        // unmap the buffers so the GPU can use them
        verticesBuffer.unmap();
        indicesBuffer.unmap();
        uniformBuffer.unmap();
        const pool = builder.finish();
        const result = {
            ...pool,
            ...buffers,
        };
        return result;
    }
    return builder_webgpu;
}
function createMeshPoolBuilder(opts, maps, updateUniform) {
    const { maxMeshes, maxTris, maxVerts } = opts;
    let finished = false;
    // log our estimated space usage stats
    console.log(`Mesh space usage for up to ${maxMeshes} meshes, ${maxTris} tris, ${maxVerts} verts:`);
    console.log(`   ${(maxVerts * Vertex.ByteSize / 1024).toFixed(1)} KB for verts`);
    console.log(`   ${(maxTris * bytesPerTri / 1024).toFixed(1)} KB for indices`);
    console.log(`   ${(maxMeshes * MeshUniform.ByteSizeAligned / 1024).toFixed(1)} KB for object uniform data`);
    const unusedBytesPerModel = MeshUniform.ByteSizeAligned - MeshUniform.ByteSizeExact;
    console.log(`   Unused ${unusedBytesPerModel} bytes in uniform buffer per object (${(unusedBytesPerModel * maxMeshes / 1024).toFixed(1)} KB total waste)`);
    const totalReservedBytes = maxVerts * Vertex.ByteSize + maxTris * bytesPerTri + maxMeshes * MeshUniform.ByteSizeAligned;
    console.log(`Total space reserved for objects: ${(totalReservedBytes / 1024).toFixed(1)} KB`);
    const allMeshes = [];
    const pool = {
        opts,
        allMeshes,
        numTris: 0,
        numVerts: 0,
        updateUniform,
    };
    const { verticesMap, indicesMap, uniformMap } = maps;
    const builder = {
        opts,
        verticesMap,
        indicesMap,
        uniformMap,
        numTris: 0,
        numVerts: 0,
        allMeshes,
        poolHandle: pool,
        addMesh,
        buildMesh,
        updateUniform: mappedUpdateUniform,
        finish,
    };
    // device,
    // add our meshes to the vertex and index buffers
    function addMesh(m) {
        if (finished)
            throw `trying to use finished MeshPoolBuilder`;
        // m = unshareVertices(m); // work-around; see TODO inside function
        if (!m.usesProvoking)
            throw `mesh must use provoking vertices`;
        // m = unshareProvokingVertices(m);
        if (verticesMap === null)
            throw "Use preRender() and postRender() functions";
        if (builder.numVerts + m.pos.length > maxVerts)
            throw "Too many vertices!";
        if (builder.numTris + m.tri.length > maxTris)
            throw "Too many triangles!";
        const b = buildMesh();
        const vertNumOffset = builder.numVerts;
        m.pos.forEach((pos, i) => {
            b.addVertex(pos, [0.5, 0.5, 0.5], [1.0, 0.0, 0.0], Vertex.Kind.normal);
        });
        m.tri.forEach((triInd, i) => {
            b.addTri(triInd);
            // set provoking vertex data
            const vOff = (vertNumOffset + triInd[0]) * Vertex.ByteSize;
            const normal = computeTriangleNormal(m.pos[triInd[0]], m.pos[triInd[1]], m.pos[triInd[2]]);
            Vertex.Serialize(verticesMap, vOff, m.pos[triInd[0]], m.colors[i], normal, Vertex.Kind.normal);
            // TODO(@darzu): add support for writting to all three vertices (for non-provoking vertex setups)
        });
        const { min, max } = getAABBFromMesh(m);
        b.setUniform(mat4.create(), min, max);
        return b.finish();
    }
    function finish() {
        if (finished)
            throw `trying to use finished MeshPoolBuilder`;
        finished = true;
        pool.numTris = builder.numTris;
        pool.numVerts = builder.numVerts;
        console.log(`Finishing pool with: ${builder.numTris} triangles, ${builder.numVerts} vertices`);
        return pool;
    }
    const scratch_uniform_u8 = new Uint8Array(MeshUniform.ByteSizeAligned);
    function mappedUpdateUniform(m) {
        if (finished)
            throw 'trying to use finished MeshBuilder';
        MeshUniform.Serialize(scratch_uniform_u8, 0, m.transform, m.aabbMin, m.aabbMax);
        builder.uniformMap.set(scratch_uniform_u8, m.modelUniByteOffset);
    }
    function buildMesh() {
        if (finished)
            throw `trying to use finished MeshPoolBuilder`;
        let meshFinished = false;
        const uniOffset = builder.allMeshes.length * MeshUniform.ByteSizeAligned;
        const vertNumOffset = builder.numVerts;
        const triNumOffset = builder.numTris;
        const indicesNumOffset = builder.numTris * 3;
        // TODO(@darzu): VERTEX FORMAT
        function addVertex(pos, color, normal, kind) {
            if (finished || meshFinished)
                throw 'trying to use finished MeshBuilder';
            const vOff = builder.numVerts * Vertex.ByteSize;
            Vertex.Serialize(builder.verticesMap, vOff, pos, color, normal, kind);
            builder.numVerts += 1;
        }
        function addTri(triInd) {
            if (finished || meshFinished)
                throw 'trying to use finished MeshBuilder';
            const iOff = builder.numTris * 3;
            builder.indicesMap.set(triInd, iOff);
            builder.numTris += 1;
        }
        let _transform = undefined;
        let _aabbMin = undefined;
        let _aabbMax = undefined;
        function setUniform(transform, aabbMin, aabbMax) {
            if (finished || meshFinished)
                throw 'trying to use finished MeshBuilder';
            _transform = transform;
            _aabbMin = aabbMin;
            _aabbMax = aabbMax;
            MeshUniform.Serialize(scratch_uniform_u8, 0, transform, aabbMin, aabbMax);
            builder.uniformMap.set(scratch_uniform_u8, uniOffset);
        }
        function finish() {
            if (finished || meshFinished)
                throw 'trying to use finished MeshBuilder';
            if (!_transform)
                throw 'uniform never set for this mesh!';
            meshFinished = true;
            const res = {
                vertNumOffset,
                indicesNumOffset,
                modelUniByteOffset: uniOffset,
                transform: _transform,
                aabbMin: _aabbMin,
                aabbMax: _aabbMax,
                numTris: builder.numTris - triNumOffset,
                model: undefined,
                pool: builder.poolHandle,
            };
            builder.allMeshes.push(res);
            return res;
        }
        return {
            poolBuilder: builder,
            addVertex,
            addTri,
            setUniform,
            finish
        };
    }
    return builder;
}
export function getAABBFromMesh(m) {
    const min = vec3.fromValues(Infinity, Infinity, Infinity);
    const max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    for (let pos of m.pos) {
        min[0] = Math.min(pos[0], min[0]);
        min[1] = Math.min(pos[1], min[1]);
        min[2] = Math.min(pos[2], min[2]);
        max[0] = Math.max(pos[0], max[0]);
        max[1] = Math.max(pos[1], max[1]);
        max[2] = Math.max(pos[2], max[2]);
    }
    return { min, max };
}
//# sourceMappingURL=mesh-pool.js.map