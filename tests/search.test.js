import test from "node:test";
import assert from "node:assert/strict";
import { searchProducts } from "../src/lib/search.js";
import { initialProducts } from "../src/data/products.js";
test("suggestions match brands, synonyms, multiword searches and small typos", () => {
  for (const [q, id] of [
    ["namak", "tata-salt"],
    ["doodh", "milk"],
    ["chai", "tata-tea"],
    ["magi", "maggi-noodles"],
    ["amul paneer", "amul-paneer"],
    ["aata", "aashirvaad-atta"],
  ])
    assert.ok(
      searchProducts(initialProducts, q).some((p) => p.id === id),
      q,
    );
  assert.equal(searchProducts(initialProducts, "unfindablexyz").length, 0);
});
