type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const routes: readonly [RegExp, readonly Method[]][] = [
  [/^(dashboard|stats\/(days|summary)|sessions\/history|public-sessions|feed|leaderboards|search)$/, ["GET"]],
  [/^profile\/(achievements|character-history|focus-partners|tile-status\/history)$/, ["GET"]],
  [/^profile\/tile-status$/, ["GET", "PUT", "DELETE"]],
  [/^profile\/public$/, ["PATCH"]],
  [/^profile\/focus-partners\/[^/]+\/favourite$/, ["PUT"]],
  [/^people\/[^/]+$/, ["GET"]],
  [/^people\/[^/]+\/follow$/, ["PUT", "DELETE"]],
  [/^rooms\/[^/]+$/, ["GET", "PATCH"]],
  [/^rooms\/[^/]+\/participants$/, ["GET"]],
  [/^(rooms|spaces)\/[^/]+\/(join|leave|presence|invites)$/, ["POST"]],
  [/^spaces$/, ["GET", "POST"]], [/^spaces\/[^/]+$/, ["PATCH"]],
  [/^buddy-listings$/, ["GET", "POST"]], [/^buddy-listings\/[^/]+$/, ["PATCH", "DELETE"]],
  [/^tasks$/, ["GET", "POST"]], [/^tasks\/[^/]+$/, ["PATCH", "DELETE"]],
  [/^notifications$/, ["GET"]], [/^notifications\/[^/]+\/read$/, ["PUT"]], [/^feedback$/, ["POST"]],
  [/^conversations$/, ["GET", "POST"]], [/^conversations\/[^/]+\/messages$/, ["GET", "POST"]],
  [/^conversations\/[^/]+\/read$/, ["PUT"]], [/^conversations\/[^/]+\/leave$/, ["POST"]],
  [/^messages\/[^/]+$/, ["PATCH", "DELETE"]], [/^messages\/[^/]+\/saved$/, ["PUT", "DELETE"]],
  [/^posts$/, ["POST"]], [/^posts\/[^/]+$/, ["PATCH", "DELETE"]],
  [/^posts\/[^/]+\/replies$/, ["GET", "POST"]], [/^posts\/[^/]+\/(saved|reactions)$/, ["PUT", "DELETE"]],
  [/^groups$/, ["GET", "POST"]], [/^groups\/[^/]+$/, ["GET", "PATCH"]],
  [/^groups\/[^/]+\/(join|leave|requests|ownership|approve|invites)$/, ["POST"]],
  [/^scheduled-sessions$/, ["GET", "POST"]], [/^scheduled-sessions\/[^/]+$/, ["GET", "PATCH", "DELETE"]],
  [/^scheduled-sessions\/[^/]+\/(book|cancel-booking|start)$/, ["POST"]],
];

export class RestRouteError extends Error {
  constructor(public readonly status: 400 | 404 | 405, public readonly allowed: readonly string[] = []) { super("Invalid REST route"); }
}
export function requireRestMethod(path: readonly string[], method: string): void {
  const methods = routes.find(([pattern]) => pattern.test(path.join("/")))?.[1];
  if (!methods) throw new RestRouteError(404);
  if (!methods.some(allowed => allowed === method)) throw new RestRouteError(405, methods);
}
