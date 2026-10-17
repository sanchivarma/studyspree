export class CapabilityError extends Error {
 constructor(public readonly capability:string){super(`Capability unavailable: ${capability}`);this.name='CapabilityError';}
}
