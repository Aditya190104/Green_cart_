const synonyms = {
  doodh: "milk",
  dudh: "milk",
  namak: "salt",
  aata: "atta",
  flour: "atta",
  chai: "tea",
  anda: "eggs",
  aloo: "potatoes",
  pyaz: "onions",
  noodles: "noodles",
  biscuit: "biscuits",
  capsicum: "pepper",
  tamatar: "tomato",
};
export const normalise = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = saved;
    }
  }
  return row[b.length];
}
export function searchProducts(products, query) {
  const q = normalise(query);
  if (!q) return products;
  const tokens = q.split(" ").map((t) => synonyms[t] || t);
  return products
    .map((p) => {
      const name = normalise(
        `${p.name} ${p.brand || ""} ${p.category} ${p.unit}`,
      );
      const words = name.split(" ");
      let score = 0;
      for (const token of tokens) {
        if (name.includes(token)) score += 3;
        else if (
          token.length > 3 &&
          words.some((word) => distance(word, token) <= 1)
        )
          score += 1;
        else return null;
      }
      return { p, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
export function suggestions(products, q) {
  const matches = searchProducts(products, q);
  return { items: matches.slice(0, 6), related: matches.length === 0 };
}
