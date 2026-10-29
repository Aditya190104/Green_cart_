# Asset provenance

All photographs are included locally. No placeholder or remote image URL is used at runtime.

## Product photographs

Source: DummyJSON grocery product dataset, https://dummyjson.com/products/category/groceries

Source URL pattern: `https://cdn.dummyjson.com/product-images/groceries/<slug>/1.webp`

Included slugs: apple, cooking-oil, cucumber, eggs, green-bell-pepper, green-chili-pepper, honey-jar, juice, kiwi, lemon, milk, nescafe-coffee, potatoes, red-onions, rice, strawberry.

Original transparent margins were removed around visible content. Each image was centered with a small safety margin on a 600×600 transparent WebP canvas. Product labels and contents were preserved. This demo does not imply affiliation with or endorsement by any pictured brand. Dataset availability does not establish commercial image rights; replace or obtain appropriate permissions before a commercial launch.

## Hero photograph

Unsplash image: https://images.unsplash.com/photo-1542838132-92c53300491e

Downloaded as `public/hero.jpg`, then displayed as an editorial crop in the split hero. Unsplash license information: https://unsplash.com/license

## Icons and logo

Interface icons: Lucide React (ISC license), provided through npm.
Green Cart logo/favicon: project-specific SVG/icon composition.

## V2 branded product photography

The 10 added branded product photographs are from the corresponding BigBasket listing image links documented in `PRICE_SOURCES.md` and `src/data/branded.js` (`sourceImage`). High-resolution image URL pattern: `https://www.bbassets.com/media/uploads/p/l/<sourceImage>`.

Files: amul-butter.webp, tata-salt.webp, good-day.webp, kissan-ketchup.webp, aashirvaad-atta.webp, fortune-oil.webp, tata-tea.webp, maggi-noodles.webp, amul-paneer.webp, parle-g.webp.

Local processing retained the product/pack, removed surrounding white margins and non-product graphic strips where possible, and exported square WebP files. Assets are development references; neither the retailer nor brands endorse Green Cart. Obtain supplier-approved images or appropriate licenses before commercial use. Do not represent these as photographs created by Green Cart.
