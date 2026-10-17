import {z} from 'zod';
export const sessionDetailsShape={title:z.string().trim().min(1).max(100).default('Study session'),rules:z.string().trim().max(2000).nullable().default(null),visibility:z.enum(['public','private']).default('private')};
