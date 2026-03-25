import type { NextFunction, Request, Response } from "express";
import { logger } from "../observability/logger.js";

export const PII_FIELDS = [
	"email",
	"emails",
	"phone",
	"mobile",
	"password",
	"secret",
	"token",
	"api_key",
	"apikey",
	"auth",
	"authorization",
	"ssn",
	"date_of_birth",
	"dob",
	"name",
	"address",
	"credit_card",
	"card_number",
	"bank_account",
	"salary",
	"iban",
	"passport",
	"license_number",
];

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?\d{1,2}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_PATTERN = /\b(?:\d[ -]*?){13,16}\b/g;

type PiiPattern = "email" | "phone" | "ssn" | "creditCard";

function isSensitiveField(fieldName: string): boolean {
	return PII_FIELDS.includes(fieldName.toLowerCase());
}

function replacePiiPatterns(text: string): string {
	return text
		.replace(EMAIL_PATTERN, "[REDACTED][REDACTED:email]")
		.replace(PHONE_PATTERN, "[REDACTED][REDACTED:phone]")
		.replace(SSN_PATTERN, "[REDACTED][REDACTED:ssn]")
		.replace(CREDIT_CARD_PATTERN, "[REDACTED][REDACTED:creditCard]");
}

export function redactValue(value: unknown, fieldName: string): unknown {
	if (value === null || value === undefined) {
		return value;
	}

	if (typeof value === "string") {
		if (value.length === 0) {
			return value;
		}

		if (fieldName.toLowerCase() === "name") {
			return value;
		}

		if (isSensitiveField(fieldName)) {
			return `[REDACTED]`;
		}

		return replacePiiPatterns(value);
	}

	return value;
}

export function redactObject(input: unknown, maxDepth = 8, currentDepth = 0): unknown {
	if (input === null || input === undefined) {
		return input;
	}

	if (currentDepth >= maxDepth) {
		return "[REDACTED:max-depth]";
	}

	if (Array.isArray(input)) {
		return input.map((item) => {
			if (typeof item === "string") {
				return replacePiiPatterns(item);
			}
			return redactObject(item, maxDepth, currentDepth + 1);
		});
	}

	if (typeof input === "string") {
		return replacePiiPatterns(input);
	}

	if (typeof input !== "object") {
		return input;
	}

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
		if (value !== null && typeof value === "object") {
			result[key] = redactObject(value, maxDepth, currentDepth + 1);
			continue;
		}
		result[key] = redactValue(value, key);
	}
	return result;
}

export function verifyNoPiiInLog(message: string): { hasPii: boolean; findings: Array<{ pattern: PiiPattern; value: string }> } {
	const findings: Array<{ pattern: PiiPattern; value: string }> = [];

	const findMatches = (pattern: RegExp, type: PiiPattern): void => {
		const regex = new RegExp(pattern.source, pattern.flags);
		const matches = message.match(regex) ?? [];
		for (const match of matches) {
			findings.push({ pattern: type, value: match });
		}
	};

	findMatches(EMAIL_PATTERN, "email");
	findMatches(PHONE_PATTERN, "phone");
	findMatches(SSN_PATTERN, "ssn");
	findMatches(CREDIT_CARD_PATTERN, "creditCard");

	return {
		hasPii: findings.length > 0,
		findings,
	};
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
	if (req.path.startsWith("/health")) {
		next();
		return;
	}

	const startedAt = Date.now();

	res.on("finish", () => {
		const payload: Record<string, unknown> = {
			method: req.method,
			path: req.path,
			status_code: res.statusCode,
			duration_ms: Date.now() - startedAt,
		};

		if (req.method !== "GET" && req.method !== "HEAD") {
			const body = req.body as Record<string, unknown> | undefined;
			if (body && Object.keys(body).length > 0) {
				payload.request_body = redactObject(body);
			}
		}

		(logger as unknown as { info: (message: string, data: Record<string, unknown>) => void }).info(
			"request_completed",
			payload,
		);
	});

	next();
}
