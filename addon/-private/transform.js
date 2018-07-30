/*
  Our Transform type is always respresented relative to
  `transform-origin: 0px 0px`. This is different from the browser's
  own `transform` property, which will vary based on the present value
  of `transform-origin`, and which defaults to `50% 50%`. I am
  standardizing on zero because it disentangles our coordinate system
  from the size of the element, which can vary over time.

  Conceptually, each of our Transforms is a 2d affine transformation
  representd as a 3x3 matrix:

      a c tx
      b d ty
      0 0  1
*/

export default class Transform {
  constructor(a, b, c, d, tx, ty) {
    console.log('TRANSFORM', tx, ty);
    // debugger;
    // WARNING: never mutate an existing Transform. Some of them are
    // shared. Operations need to return new Transforms instead.
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
  }
  serialize() {
    if (this.isIdentity()) {
      return 'none';
    }
    return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.tx}, ${this.ty})`;
  }

  // See the comment below on `const identity`.
  isIdentity() {
    return this === identity || (
      this.a === 1 &&
        this.b === 0 &&
        this.c === 0 &&
        this.d === 1 &&
        this.tx === 0 &&
        this.ty === 0
    );
  }

  mult(other) {
    // This is deliberately not isIdentity(). I'm optimizing for the
    // case where there was no preexisting transform at all.
    if (this === identity) { return other; }
    if (other === identity) { return this; }
    return new Transform(
      this.a * other.a + this.c * other.b,
      this.b * other.a + this.d * other.b,
      this.a * other.c + this.c * other.d,
      this.b * other.c + this.d * other.d,
      this.a * other.tx + this.c * other.ty + this.tx,
      this.b * other.tx + this.d * other.ty + this.ty
    );
  }
}

// WARNING: this constant matrix exists as an optimization. But not
// every no-op transform triple-equals this value. If you apply two
// transforms that cancel each other out, you will get an identity
// matrix but it will not triple-equal this one. And that is OK: we
// use the triple-equality as an optimization only, not for
// correctness.
//
// The optimization should be worthwhile because the majority of
// things start out with no preexisting Transform, which we can
// represent as `identity`, which will make identity.mult(something) a
// no-op, etc.
export const identity = new Transform(1, 0, 0, 1, 0, 0);

const matrixPattern = /matrix\((.*)\)/;

function parseTransform(matrixString) {
  let match = matrixPattern.exec(matrixString);
  if (!match) {
    return identity;
  }
  return new Transform(...match[1].split(',').map(parseFloat));
}

function parseOrigin(originString) {
  return originString.split(' ').map(parseFloat);
}

/**
  Returns a Transform instance representing the cumulative CSS
  transform of this element and all its ancestors.

  @function cumulativeTransform
  @param {HTMLElement} elt
  @return {Transform}
*/
export function cumulativeTransform(elt) {
  let accumulator = null;
  while (elt && elt.nodeType === 1) {
    let transform = ownTransform(elt);
    if (transform !== identity && !transform.isIdentity()) {
      if (accumulator) {
        accumulator = transform.mult(accumulator);
      } else {
        accumulator = transform;
      }
    }
    elt = elt.parentElement;
  }
  return accumulator || identity;
}

/**
  Returns a Transform instance representing the CSS transform of this
  element.

 * @function ownTransform
 * @param {HTMLElement} elt
 * @return {Transform} instance representing this element's css transform property.
 */
export function ownTransform(elt) {
  // console.log('ownTransform', elt);
  let eltStyles = window.getComputedStyle(elt);
  let t = eltStyles.transform !== '' ? eltStyles.transform : elt.style.transform;
  if (t === 'none') {
    // This constant value is an optimization, and we rely on that in
    // cumulativeTransform
    return identity;
  }
  let matrix = parseTransform(t);
  if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) {
    // If there is any rotation, scaling, or skew we need to do it within the context of transform-origin.
    let origin = eltStyles.transformOrigin !== '' ? eltStyles.transformOrigin : elt.style.transformOrigin;
    let [originX, originY] = parseOrigin(origin);
    if (originX === 0 && originY === 0) {
      // transform origin is at 0,0 so it will have no effect, so we're done.
      return matrix;
    }

    return (new Transform(1, 0, 0, 1, originX, originY)).mult(matrix).mult(new Transform(1, 0, 0, 1, -originX, -originY));
  } else {
    // This case is an optimization for when there is only translation.
    return matrix;
  }
}
