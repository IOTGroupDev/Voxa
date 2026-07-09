import { BadRequestException } from '@nestjs/common';

export function assertPlainObject(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${name} must be an object.`);
  }
}

export function assertRequiredString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string.`);
  }
}

export function assertOptionalString(value: unknown, field: string): asserts value is string | undefined {
  if (value !== undefined && (typeof value !== 'string' || value.trim().length === 0)) {
    throw new BadRequestException(`${field} must be a non-empty string when provided.`);
  }
}

export function assertOptionalNumber(value: unknown, field: string): asserts value is number | undefined {
  if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
    throw new BadRequestException(`${field} must be a non-negative number when provided.`);
  }
}

export function assertRequiredNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be a non-negative number.`);
  }
}

export function assertOptionalNonNegativeInteger(value: unknown, field: string): asserts value is number | undefined {
  if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 0)) {
    throw new BadRequestException(`${field} must be a non-negative integer when provided.`);
  }
}

export function assertEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
  field: string,
): asserts value is T[keyof T] {
  if (typeof value !== 'string' || !Object.values(enumObject).includes(value)) {
    throw new BadRequestException(`${field} must be one of: ${Object.values(enumObject).join(', ')}.`);
  }
}

export function assertOptionalEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
  field: string,
): asserts value is T[keyof T] | undefined {
  if (value !== undefined) {
    assertEnumValue(enumObject, value, field);
  }
}

export function assertIsoDateString(value: unknown, field: string): asserts value is string {
  assertRequiredString(value, field);
  if (Number.isNaN(Date.parse(value))) {
    throw new BadRequestException(`${field} must be a valid ISO date string.`);
  }
}

export function assertOptionalIsoDateString(value: unknown, field: string): asserts value is string | undefined {
  if (value !== undefined) {
    assertIsoDateString(value, field);
  }
}
