// This endpoint never accepts a duration from the client and must never
// be changed to do so. Duration is computed by a database trigger.
export {GET} from "./study-leases/route";
