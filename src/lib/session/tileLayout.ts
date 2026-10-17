export const TILES_PER_PAGE = 20;

/** Choose the grid with the largest uncropped 4:3 picture area per tile. */
export function fitTileGrid(count: number, width: number, height: number, gap = 4) {
  const visible = Math.max(1, Math.min(TILES_PER_PAGE, count));
  let best = { columns: 1, rows: visible, area: -1 };
  for (let columns = 1; columns <= visible; columns++) {
    const rows = Math.ceil(visible / columns);
    const cellWidth = Math.max(0, (width - gap * (columns - 1)) / columns);
    const cellHeight = Math.max(0, (height - gap * (rows - 1)) / rows);
    const pictureWidth = Math.min(cellWidth, cellHeight * 4 / 3);
    const area = pictureWidth * pictureWidth * 3 / 4;
    if (area > best.area) best = { columns, rows, area };
  }
  return { columns: best.columns, rows: best.rows };
}

export function tilePage<T>(items: readonly T[], requested: number) {
  const pages = Math.max(1, Math.ceil(items.length / TILES_PER_PAGE));
  const page = Math.max(0, Math.min(Math.floor(requested), pages - 1));
  return { page, pages, items: items.slice(page * TILES_PER_PAGE, (page + 1) * TILES_PER_PAGE) };
}
