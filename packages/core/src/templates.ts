import { z } from "zod";
import { ContentPropertyDescription } from "./interfaces";

/**
 * build the content output template
 * @param properties The properties of the content
 * @param schema The Zod schema of the content
 */
export function buildContentOutputTemplate(
    properties: Record<string, ContentPropertyDescription>,
    schema: z.ZodType<any>
): string {
    let propDesc = "";
    Object.entries(properties).forEach(([key, { description, examples }]) => {
        propDesc += `- Field "${key}": ${description}\n`;
        examples.forEach((example, index) => {
            propDesc += `    ${index + 1}. ${example}\n`;
        });
    });
    return `Given the recent messages and wallet information below:
{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested action:
${propDesc}

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example:
\`\`\`json
${zodSchemaToJson(schema)}
\`\`\`
`;
}

/**
 * Convert a Zod schema to JSON
 * @param schema Zod schema
 * @returns JSON string
 */
function zodSchemaToJson(schema: z.ZodType<any>): string {
    if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const properties = Object.entries(shape).map(([key, value]) => {
            return `"${key}": ${zodTypeToJson(value as z.ZodType)}`;
        });
        return `{\n${properties.join(",\n")}\n}`;
    }
    return "";
}

/**
 * Convert a Zod type to JSON
 * @param schema Zod type
 */
function zodTypeToJson(schema: z.ZodType<any>): string {
    if (schema instanceof z.ZodNullable) {
        return `${zodTypeToJson(schema._def.innerType)} | null`;
    }
    if (schema instanceof z.ZodUnion) {
        return schema._def.options.map(zodTypeToJson).join(" | ");
    }
    if (schema instanceof z.ZodString) {
        return "string";
    }
    if (schema instanceof z.ZodNumber) {
        return "number";
    }
    if (schema instanceof z.ZodBoolean) {
        return "boolean";
    }
    return "any";
}
