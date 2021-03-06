/*
 * Copyright 2019 Gregg Tavares
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
export function v3(v) {
    return new Float32Array(v);
}
let VecType = Float32Array;
/**
 * Sets the type this library creates for a Vec3
 * @param ctor the constructor for the type. Either `Float32Array` or `Array`
 * @return previous constructor for Vec3
 */
export function setDefaultType(ctor) {
    const oldType = VecType;
    VecType = ctor;
    return oldType;
}
/**
 * Creates a vec3; may be called with x, y, z to set initial values.
 * @param [x] Initial x value.
 * @param [y] Initial y value.
 * @param [z] Initial z value.
 * @return the created vector
 */
export function create(x, y, z) {
    const dst = new VecType(3);
    if (x) {
        dst[0] = x;
    }
    if (y) {
        dst[1] = y;
    }
    if (z) {
        dst[2] = z;
    }
    return dst;
}
/**
 * Adds two vectors; assumes a and b have the same dimension.
 * @param a Operand vector.
 * @param b Operand vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return A vector tha tis the sum of a and b.
 */
export function add(a, b, dst) {
    dst = dst || new VecType(3);
    dst[0] = a[0] + b[0];
    dst[1] = a[1] + b[1];
    dst[2] = a[2] + b[2];
    return dst;
}
/**
 * Subtracts two vectors.
 * @param a Operand vector.
 * @param b Operand vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return A vector that is the difference of a and b.
 */
export function subtract(a, b, dst) {
    dst = dst || new VecType(3);
    dst[0] = a[0] - b[0];
    dst[1] = a[1] - b[1];
    dst[2] = a[2] - b[2];
    return dst;
}
/**
 * Performs linear interpolation on two vectors.
 * Given vectors a and b and interpolation coefficient t: number, returns
 * a + t * (b - a).
 * @param a Operand vector.
 * @param b Operand vector.
 * @param t Interpolation coefficient.
 * @param [dst] vector to hold result. If not new one is created.
 * @return The linear interpolated result.
 */
export function lerp(a, b, t, dst) {
    dst = dst || new VecType(3);
    dst[0] = a[0] + t * (b[0] - a[0]);
    dst[1] = a[1] + t * (b[1] - a[1]);
    dst[2] = a[2] + t * (b[2] - a[2]);
    return dst;
}
/**
 * Performs linear interpolation on two vectors.
 * Given vectors a and b and interpolation coefficient vector t, returns
 * a + t * (b - a).
 * @param a Operand vector.
 * @param b Operand vector.
 * @param t Interpolation coefficients vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return the linear interpolated result.
 */
export function lerpV(a, b, t, dst) {
    dst = dst || new VecType(3);
    dst[0] = a[0] + t[0] * (b[0] - a[0]);
    dst[1] = a[1] + t[1] * (b[1] - a[1]);
    dst[2] = a[2] + t[2] * (b[2] - a[2]);
    return dst;
}
/**
 * Return max values of two vectors.
 * Given vectors a and b returns
 * [max(a[0], b[0]), max(a[1], b[1]), max(a[2], b[2])].
 * @param a Operand vector.
 * @param b Operand vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return The max components vector.
 */
export function max(a, b, dst) {
    dst = dst || new VecType(3);
    dst[0] = Math.max(a[0], b[0]);
    dst[1] = Math.max(a[1], b[1]);
    dst[2] = Math.max(a[2], b[2]);
    return dst;
}
/**
 * Return min values of two vectors.
 * Given vectors a and b returns
 * [min(a[0], b[0]), min(a[1], b[1]), min(a[2], b[2])].
 * @param a Operand vector.
 * @param b Operand vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return The min components vector.
 */
export function min(a, b, dst) {
    dst = dst || new VecType(3);
    dst[0] = Math.min(a[0], b[0]);
    dst[1] = Math.min(a[1], b[1]);
    dst[2] = Math.min(a[2], b[2]);
    return dst;
}
/**
 * Multiplies a vector by a scalar.
 * @param v The vector.
 * @param k The scalar.
 * @param [dst] vector to hold result. If not new one is created.
 * @return The scaled vector.
 */
export function mulScalar(v, k, dst) {
    dst = dst || new VecType(3);
    dst[0] = v[0] * k;
    dst[1] = v[1] * k;
    dst[2] = v[2] * k;
    return dst;
}
/**
 * Divides a vector by a scalar.
 * @param v The vector.
 * @param k The scalar.
 * @param [dst] vector to hold result. If not new one is created.
 * @return The scaled vector.
 */
export function divScalar(v, k, dst) {
    dst = dst || new VecType(3);
    dst[0] = v[0] / k;
    dst[1] = v[1] / k;
    dst[2] = v[2] / k;
    return dst;
}
/**
 * Computes the cross product of two vectors; assumes both vectors have
 * three entries.
 * @param a Operand vector.
 * @param b Operand vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return The vector of a cross b.
 */
export function cross(a, b, dst) {
    dst = dst || new VecType(3);
    const t1 = a[2] * b[0] - a[0] * b[2];
    const t2 = a[0] * b[1] - a[1] * b[0];
    dst[0] = a[1] * b[2] - a[2] * b[1];
    dst[1] = t1;
    dst[2] = t2;
    return dst;
}
/**
 * Computes the dot product of two vectors; assumes both vectors have
 * three entries.
 * @param a Operand vector.
 * @param b Operand vector.
 * @return dot product
 */
export function dot(a, b) {
    return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
}
/**
 * Computes the length of vector
 * @param v vector.
 * @return length of vector.
 */
export function length(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
/**
 * Computes the square of the length of vector
 * @param v vector.
 * @return square of the length of vector.
 */
export function lengthSq(v) {
    return v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
}
/**
 * Computes the distance between 2 points
 * @param a vector.
 * @param b vector.
 * @return distance between a and b
 */
export function distance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
/**
 * Computes the square of the distance between 2 points
 * @param a vector.
 * @param b vector.
 * @return square of the distance between a and b
 */
export function distanceSq(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return dx * dx + dy * dy + dz * dz;
}
/**
 * Divides a vector by its Euclidean length and returns the quotient.
 * @param a The vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return The normalized vector.
 */
export function normalize(a, dst) {
    dst = dst || new VecType(3);
    const lenSq = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
    const len = Math.sqrt(lenSq);
    if (len > 0.00001) {
        dst[0] = a[0] / len;
        dst[1] = a[1] / len;
        dst[2] = a[2] / len;
    }
    else {
        dst[0] = 0;
        dst[1] = 0;
        dst[2] = 0;
    }
    return dst;
}
/**
 * Negates a vector.
 * @param v The vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return -v.
 */
export function negate(v, dst) {
    dst = dst || new VecType(3);
    dst[0] = -v[0];
    dst[1] = -v[1];
    dst[2] = -v[2];
    return dst;
}
/**
 * Copies a vector.
 * @param v The vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return A copy of v.
 */
export function copy(v, dst) {
    dst = dst || new VecType(3);
    dst[0] = v[0];
    dst[1] = v[1];
    dst[2] = v[2];
    return dst;
}
/**
 * Multiplies a vector by another vector (component-wise); assumes a and
 * b have the same length.
 * @param a Operand vector.
 * @param b Operand vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return The vector of products of entries of a and
 *     b.
 */
export function multiply(a, b, dst) {
    dst = dst || new VecType(3);
    dst[0] = a[0] * b[0];
    dst[1] = a[1] * b[1];
    dst[2] = a[2] * b[2];
    return dst;
}
/**
 * Divides a vector by another vector (component-wise); assumes a and
 * b have the same length.
 * @param a Operand vector.
 * @param b Operand vector.
 * @param [dst] vector to hold result. If not new one is created.
 * @return The vector of quotients of entries of a and
 *     b.
 */
export function divide(a, b, dst) {
    dst = dst || new VecType(3);
    dst[0] = a[0] / b[0];
    dst[1] = a[1] / b[1];
    dst[2] = a[2] / b[2];
    return dst;
}
//# sourceMappingURL=v3.js.map