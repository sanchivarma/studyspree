import { describe, expect, it } from "vitest";
import { fitTileGrid, tilePage, TILES_PER_PAGE } from "./tileLayout";

describe("screen-fitting participant grids", () => {
  it.each([1, 2, 7, 19, 20])("fits %i tiles at desktop, portrait and landscape sizes", count => {
    for (const [width, height] of [[1200, 700], [311, 539], [780, 280]]) {
      const { columns, rows } = fitTileGrid(count, width, height);
      expect(columns * rows).toBeGreaterThanOrEqual(count);
      expect(columns).toBeLessThanOrEqual(count);
      expect((width - (columns - 1) * 4) / columns).toBeGreaterThan(0);
      expect((height - (rows - 1) * 4) / rows).toBeGreaterThan(0);
      const pictureArea = (c: number) => {
        const r = Math.ceil(count / c);
        const pictureWidth = Math.min((width - (c - 1) * 4) / c, (height - (r - 1) * 4) / r * 4 / 3);
        return pictureWidth * pictureWidth * 3 / 4;
      };
      for (let c = 1; c <= count; c++) expect(pictureArea(columns)).toBeGreaterThanOrEqual(pictureArea(c));
    }
  });
  it("paginates a mixed roster together without repeating or dropping tiles", () => {
    const tiles = [...Array.from({ length: 17 }, (_, n) => `person-${n}`), ...Array.from({ length: 23 }, (_, n) => `character-${n}`)];
    expect(TILES_PER_PAGE).toBe(20);
    expect(tilePage(tiles, 0).items).toHaveLength(20);
    expect(tilePage(tiles, 1).items).toHaveLength(20);
    expect([...tilePage(tiles, 0).items, ...tilePage(tiles, 1).items]).toEqual(tiles);
  });
  it("clamps a page when removals empty the last page", () => {
    expect(tilePage(Array.from({ length: 20 }, (_, n) => n), 1)).toMatchObject({ page: 0, pages: 1 });
    expect(tilePage([], 5)).toEqual({ page: 0, pages: 1, items: [] });
  });
});
