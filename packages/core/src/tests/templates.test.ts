import { describe, it, expect } from "vitest";

import { z } from "zod";
import { buildContentOutputTemplate, zodSchemaToJson } from "../templates";

describe("templates", () => {
    describe("buildContentOutputTemplate", () => {
        it("should generate correct template with properties and examples", () => {
            const properties = {
                token: {
                    description: "The token to transfer",
                    examples: [
                        "A.1654653399040a61.FlowToken",
                        "0xe6ffc15a5bde7dd33c127670ba2b9fcb82db971a",
                    ],
                },
                amount: {
                    description: "The amount to transfer",
                    examples: ["100", "0.5"],
                },
                to: {
                    description: "The recipient address",
                    examples: [
                        "0x1654653399040a61",
                        "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                    ],
                },
                matched: {
                    description:
                        "Whether token and recipient address types match",
                    examples: ["true", "false"],
                },
            };

            const schema = z.object({
                token: z.string().nullable(),
                amount: z.union([z.string(), z.number()]),
                to: z.string(),
                matched: z.boolean(),
            });

            const result = buildContentOutputTemplate(
                "transfer",
                "transfer token to recipient",
                properties,
                schema
            );

            expect(result).toContain('- Field "token": The token to transfer');
            expect(result).toContain("1. A.1654653399040a61.FlowToken");
            expect(result).toContain(
                "2. 0xe6ffc15a5bde7dd33c127670ba2b9fcb82db971a"
            );
            expect(result).toContain(
                '- Field "amount": The amount to transfer'
            );
            expect(result).toContain("1. 100");
            expect(result).toContain("2. 0.5");
            expect(result).toContain('- Field "to": The recipient address');
            expect(result).toContain("1. 0x1654653399040a61");
            expect(result).toContain(
                "2. 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
            );
            expect(result).toContain(
                '- Field "matched": Whether token and recipient address types match'
            );
            expect(result).toContain("1. true");
            expect(result).toContain("2. false");
            expect(result).toContain(
                '```json\n{\n"token": string | null,\n"amount": string | number,\n"to": string,\n"matched": boolean\n}\n```'
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
