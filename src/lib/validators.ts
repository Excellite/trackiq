const VALID_STATUSES = ["moving", "idle", "alert", "offline"] as const;

type ValidationResult = { valid: boolean; errors: string[] };

export function validateTruck(
  truck: unknown,
  { partial = false }: { partial?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];

  if (!truck || typeof truck !== "object" || Array.isArray(truck)) {
    return { valid: false, errors: ["Payload must be a JSON object."] };
  }

  const t = truck as Record<string, unknown>;

  const required = [
    "id", "name", "driver", "plate", "model", "year", "status",
    "fuel", "speed", "odometer", "lat", "lng", "route", "lastService", "nextService",
  ];

  if (!partial) {
    for (const field of required) {
      if (t[field] === undefined || t[field] === null) {
        errors.push(`Missing required field: "${field}".`);
      }
    }
  }

  if (t.id !== undefined) {
    if (typeof t.id !== "string" || !/^TRK-\d{3,}$/.test(t.id)) {
      errors.push('Field "id" must match pattern TRK-NNN (e.g. TRK-001).');
    }
  }

  if (t.name !== undefined) {
    if (typeof t.name !== "string" || t.name.trim().length < 2) {
      errors.push('Field "name" must be a non-empty string (≥ 2 chars).');
    }
  }

  if (t.driver !== undefined) {
    if (typeof t.driver !== "string" || t.driver.trim().length < 2) {
      errors.push('Field "driver" must be a non-empty string (≥ 2 chars).');
    }
  }

  if (t.plate !== undefined) {
    if (typeof t.plate !== "string" || t.plate.trim().length < 4) {
      errors.push('Field "plate" must be a valid plate string (≥ 4 chars).');
    }
  }

  if (t.year !== undefined) {
    const y = Number(t.year);
    if (!Number.isInteger(y) || y < 1990 || y > new Date().getFullYear() + 1) {
      errors.push(`Field "year" must be an integer between 1990 and ${new Date().getFullYear() + 1}.`);
    }
  }

  if (t.status !== undefined) {
    if (!VALID_STATUSES.includes(t.status as typeof VALID_STATUSES[number])) {
      errors.push(`Field "status" must be one of: ${VALID_STATUSES.join(", ")}.`);
    }
  }

  if (t.fuel !== undefined) {
    const f = Number(t.fuel);
    if (isNaN(f) || f < 0 || f > 100) {
      errors.push('Field "fuel" must be a number between 0 and 100.');
    }
  }

  if (t.speed !== undefined) {
    const s = Number(t.speed);
    if (isNaN(s) || s < 0 || s > 200) {
      errors.push('Field "speed" must be a number between 0 and 200.');
    }
  }

  if (t.odometer !== undefined) {
    const o = Number(t.odometer);
    if (isNaN(o) || o < 0) {
      errors.push('Field "odometer" must be a non-negative number.');
    }
  }

  if (t.lat !== undefined) {
    const lat = Number(t.lat);
    if (isNaN(lat) || lat < 4 || lat > 14) {
      errors.push('Field "lat" must be a number within Nigeria bounds (4 – 14).');
    }
  }

  if (t.lng !== undefined) {
    const lng = Number(t.lng);
    if (isNaN(lng) || lng < 2 || lng > 15) {
      errors.push('Field "lng" must be a number within Nigeria bounds (2 – 15).');
    }
  }

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  if (t.lastService !== undefined) {
    if (typeof t.lastService !== "string" || !ISO_DATE.test(t.lastService) || isNaN(Date.parse(t.lastService))) {
      errors.push('Field "lastService" must be a valid date in yyyy-mm-dd format.');
    }
  }

  if (t.nextService !== undefined) {
    if (typeof t.nextService !== "string" || !ISO_DATE.test(t.nextService) || isNaN(Date.parse(t.nextService))) {
      errors.push('Field "nextService" must be a valid date in yyyy-mm-dd format.');
    }
  }

  if (
    typeof t.lastService === "string" &&
    typeof t.nextService === "string" &&
    ISO_DATE.test(t.lastService) &&
    ISO_DATE.test(t.nextService)
  ) {
    if (new Date(t.nextService) <= new Date(t.lastService)) {
      errors.push('"nextService" must be a date after "lastService".');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateTruckFilters(params: Record<string, unknown> = {}): ValidationResult {
  const errors: string[] = [];

  if (params.status !== undefined && !VALID_STATUSES.includes(params.status as typeof VALID_STATUSES[number])) {
    errors.push(`Query param "status" must be one of: ${VALID_STATUSES.join(", ")}.`);
  }

  if (params.minFuel !== undefined) {
    const v = Number(params.minFuel);
    if (isNaN(v) || v < 0 || v > 100) errors.push('Query param "minFuel" must be 0–100.');
  }

  if (params.maxFuel !== undefined) {
    const v = Number(params.maxFuel);
    if (isNaN(v) || v < 0 || v > 100) errors.push('Query param "maxFuel" must be 0–100.');
  }

  if (params.limit !== undefined) {
    const v = Number(params.limit);
    if (!Number.isInteger(v) || v < 1 || v > 100) {
      errors.push('Query param "limit" must be an integer between 1 and 100.');
    }
  }

  if (params.offset !== undefined) {
    const v = Number(params.offset);
    if (!Number.isInteger(v) || v < 0) {
      errors.push('Query param "offset" must be a non-negative integer.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function errorEnvelope(status: number, message: string, errors: string[] = []) {
  return { success: false, status, message, errors, timestamp: new Date().toISOString() };
}

export function successEnvelope(data: unknown, meta: Record<string, unknown> = {}) {
  return {
    success: true,
    status: 200,
    data,
    meta: { timestamp: new Date().toISOString(), ...meta },
  };
}
