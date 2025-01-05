import { describe, it, expect } from "vitest";

import { z } from "zod";
import { buildContentOutputTemplate, zodSchemaToJson } from "../templates";

describe("templates", () => {
    describe("buildContentOutputTemplate", () => {
        it("should generate correct template with properties and examples", () => {
            const properties = {
                amount: {
                    description: "The amount to transfer",
                    examples: ["100", "0.5"],
                },
                recipient: {
                    description: "The recipient address",
                    examples: ["0x123...", "0x456..."],
                },
            };

            const schema = z.object({
                amount: z.number(),
                recipient: z.string(),
            });

            const result = buildContentOutputTemplate(properties, schema);

            expect(result).toContain(
                '- Field "amount": The amount to transfer'
            );
            expect(result).toContain("1. 100");
            expect(result).toContain("2. 0.5");
            expect(result).toContain(
                '- Field "recipient": The recipient address'
            );
            expect(result).toContain("1. 0x123...");
            expect(result).toContain("2. 0x456...");
            expect(result).toContain(
                '```json\n{\n"amount": number,\n"recipient": string\n}\n```'
            );
        });
    });

    describe("zodSchemaToJson", () => {
        it("should convert simple schema to JSON string", () => {
            const schema = z.object({
                name: z.string(),
                age: z.number(),
            });

            const result = zodSchemaToJson(schema);
            expect(result).toBe('{\n"name": string,\n"age": number\n}');
        });

        it("should handle nullable fields", () => {
            const schema = z.object({
                optional: z.string().nullable(),
            });

            const result = zodSchemaToJson(schema);
            expect(result).toBe('{\n"optional": string | null\n}');
        });

        it("should handle union types", () => {
            const schema = z.object({
                status: z.union([z.string(), z.number()]),
                status2: z.string().or(z.number()).optional(),
            });

            const result = zodSchemaToJson(schema);
            expect(result).toBe(
                '{\n"status": string | number,\n"status2": string | number | null\n}'
            );
        });
    });
});
