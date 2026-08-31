import { z } from 'zod';

// Vocabularies mirror docs/feature-reference.md. Keep them in step with the
// CHECK constraints in db.js and with frontend/src/constants.js.

export const ALTITUDE_MODES = ['ASL', 'ALT', 'AGL'];
export const TAKEOFF_MODES = ['directAscent', 'safeTakeoff'];
export const TURN_MODES = [
  'coordinatedTurnSkip',
  'straightStop',
  'earlyTurnThrough',
  'curvedStop',
  'curvedContinue',
];
export const HEADING_MODES = ['alongRoute', 'manual', 'lockYawAxis'];
export const GIMBAL_CONTROL_MODES = ['manual', 'forEachWaypoint'];
export const FINISH_ACTIONS = ['returnToHome', 'returnToStartAndHover', 'exitTask', 'land'];
export const ACTION_TYPES = [
  'takePhoto',
  'startRecord',
  'stopRecord',
  'hover',
  'gimbalPitch',
  'gimbalYaw',
  'aircraftYaw',
  'zoom',
  'timedIntervalShot',
  'distanceIntervalShot',
  'endIntervalShot',
];
export const DRONE_STATUSES = ['idle', 'flying', 'offline'];
export const ASSIGNMENT_STATUSES = ['pending', 'synced', 'in_progress', 'complete', 'failed'];

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);
const altitude = z.number().min(-500).max(1500);
const speed = z.number().min(0.1).max(20);
const angle180 = z.number().min(-180).max(180);

/** Global mission settings, stored as the `settings` JSON column. */
export const settingsSchema = z
  .object({
    takeoffPoint: z.object({ lat: latitude, lng: longitude }).nullable().default(null),
    takeoffMode: z.enum(TAKEOFF_MODES).default('directAscent'),
    // "Safe Takeoff Altitude" is only meaningful when takeoffMode is safeTakeoff.
    safeTakeoffAltitude: z.number().min(0).max(1500).default(20),
    altitudeMode: z.enum(ALTITUDE_MODES).default('ASL'),
    globalAltitude: altitude.default(100),
    globalSpeed: speed.default(10),
    // The reference caps takeoff speed at 15 m/s (the "+" stepper is disabled there).
    takeoffSpeed: z.number().min(0.1).max(15).default(15),
    waypointType: z.enum(TURN_MODES).default('straightStop'),
    aircraftYaw: z.enum(HEADING_MODES).default('alongRoute'),
    gimbalControl: z.enum(GIMBAL_CONTROL_MODES).default('manual'),
    finishAction: z.enum(FINISH_ACTIONS).default('returnToHome'),
    rthAltitude: z.number().min(0).max(1500).default(100),
  })
  .strict();

/**
 * Action parameters are validated per action type, so a `hover` cannot be
 * saved with a zoom ratio. Each branch is strict; unknown keys are rejected.
 */
export const actionSchema = z.discriminatedUnion('action_type', [
  z.object({
    action_type: z.literal('takePhoto'),
    params: z
      .object({ filenameTemplate: z.string().max(120).default('WMP_YYYYMMDDhhmmss') })
      .strict()
      .default({}),
  }),
  z.object({ action_type: z.literal('startRecord'), params: z.object({}).strict().default({}) }),
  z.object({ action_type: z.literal('stopRecord'), params: z.object({}).strict().default({}) }),
  z.object({
    action_type: z.literal('hover'),
    // seconds
    params: z.object({ duration: z.number().min(0).max(3600).default(3) }).strict().default({}),
  }),
  z.object({
    action_type: z.literal('gimbalPitch'),
    // Gimbal pitch range typical of enterprise payloads: straight down to slightly up.
    params: z
      .object({ angle: z.number().min(-120).max(45).default(0) })
      .strict()
      .default({}),
  }),
  z.object({
    action_type: z.literal('gimbalYaw'),
    params: z.object({ angle: angle180.default(0) }).strict().default({}),
  }),
  z.object({
    action_type: z.literal('aircraftYaw'),
    params: z.object({ angle: angle180.default(0) }).strict().default({}),
  }),
  z.object({
    action_type: z.literal('zoom'),
    params: z.object({ ratio: z.number().min(1).max(200).default(1) }).strict().default({}),
  }),
  z.object({
    action_type: z.literal('timedIntervalShot'),
    // seconds between shots
    params: z.object({ interval: z.number().min(0.5).max(600).default(2) }).strict().default({}),
  }),
  z.object({
    action_type: z.literal('distanceIntervalShot'),
    // metres between shots
    params: z.object({ interval: z.number().min(0.5).max(1000).default(10) }).strict().default({}),
  }),
  z.object({ action_type: z.literal('endIntervalShot'), params: z.object({}).strict().default({}) }),
]);

export const waypointSchema = z
  .object({
    lat: latitude,
    lng: longitude,
    altitude,
    // null means "inherit the mission's global speed".
    speed: speed.nullable().default(null),
    heading_mode: z.enum(HEADING_MODES).default('alongRoute'),
    heading_value: angle180.default(0),
    turn_mode: z.enum(TURN_MODES).default('straightStop'),
    actions: z.array(actionSchema).max(50).default([]),
  })
  .strict()
  .superRefine((waypoint, ctx) => {
    // Mirrors the reference rule: a waypoint the aircraft never stops at
    // cannot hold a hover action.
    if (waypoint.turn_mode !== 'curvedContinue') return;
    waypoint.actions.forEach((action, index) => {
      if (action.action_type !== 'hover') return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actions', index],
        message:
          'A hover action is not allowed on a waypoint whose turn mode is "curvedContinue" — the aircraft does not stop there.',
      });
    });
  });

export const waylineSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).default(''),
    aircraft_model: z.string().trim().min(1).max(80).default('Generic Quadcopter'),
    settings: settingsSchema.default({}),
    waypoints: z.array(waypointSchema).max(500).default([]),
  })
  .strict();

export const assignmentCreateSchema = z
  .object({
    wayline_id: z.string().min(1),
    drone_ids: z.array(z.string().min(1)).min(1).max(50),
  })
  .strict();

export const assignmentUpdateSchema = z
  .object({ status: z.enum(ASSIGNMENT_STATUSES) })
  .strict();

export const droneCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(80),
    status: z.enum(DRONE_STATUSES).default('idle'),
  })
  .strict();
