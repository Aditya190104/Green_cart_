import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateTotals,
  availablePin,
  validProduct,
} from "../src/lib/shop.js";
import { initialProducts } from "../src/data/products.js";
import { existsSync } from "node:fs";
test("delivery threshold and coupon limit", () => {
  const lines = [{ product: { price: 499, mrp: 600 }, qty: 1 }];
  assert.deepEqual(calculateTotals(lines, "FRESH10"), {
    subtotal: 499,
    mrp: 600,
    couponDiscount: 50,
    delivery: 0,
    total: 449,
    savings: 151,
  });
  assert.equal(
    calculateTotals(
      [{ product: { price: 1500, mrp: 1600 }, qty: 1 }],
      "FRESH10",
    ).couponDiscount,
    100,
  );
});
test("coupon does not apply below minimum; empty basket is free", () => {
  assert.equal(
    calculateTotals([{ product: { price: 100, mrp: 120 }, qty: 2 }], "FRESH10")
      .total,
    235,
  );
  assert.equal(calculateTotals([]).total, 0);
});
test("only configured valid six-digit PIN codes are accepted", () => {
  for (const p of ["160017", "141001", "110001", "140001"])
    assert.equal(availablePin(p), true);
  for (const p of ["16001", "000000", "560001", "16001a", "1600170"])
    assert.equal(availablePin(p), false);
});
test("inventory input rejects negative, fractional and inconsistent values", () => {
  const p = { name: "Milk", price: 60, mrp: 70, stock: 2 };
  assert.equal(validProduct(p), true);
  for (const change of [
    { stock: -1 },
    { stock: 1.2 },
    { price: NaN },
    { mrp: 50 },
    { name: "" },
  ])
    assert.equal(validProduct({ ...p, ...change }), false);
});
test("catalog IDs are unique and every image is bundled locally", () => {
  assert.equal(
    new Set(initialProducts.map((p) => p.id)).size,
    initialProducts.length,
  );
  for (const p of initialProducts) {
    assert.ok(validProduct(p));
    assert.ok(existsSync(`public/${p.image}`), p.image);
  }
});

test("retail decimal prices stay exact at paise precision", () => {
  const total = calculateTotals([
    { product: { price: 70.37, mrp: 75 }, qty: 3 },
    { product: { price: 32.2, mrp: 35 }, qty: 2 },
  ]);
  assert.equal(total.subtotal, 275.51);
  assert.equal(total.total, 310.51);
});
