import { z } from "zod";
import { ContentPropertyDescription } from "./interfaces";
import { stringArrayFooter } from "@elizaos/core";

/**
 * build the content output template
 * @param properties The properties of the content
 * @param schema The Zod schema of the content
 */
export function buildContentOutputTemplate(
    actionName: string,
    actionDesc: string,
    properties: Record<string, ContentPropertyDescription>,
    schema: z.ZodType<any>
): string {
    let propDesc = "";
    Object.entries(properties).forEach(([key, { description, examples }]) => {
        propDesc += `- Field "${key}": ${description}.`;
        if (examples.length > 0) {
            propDesc += " Examples or Rules for this field:\n";
        } else {
            propDesc += "\n";
        }
        examples.forEach((example, index) => {
            propDesc += `    ${index + 1}. ${example}\n`;
        });
    });
    return `Given the recent messages and wallet information below:
{{recentMessages}}

{{walletInfo}}

We want to perform the action: "${actionName}".

Action description is ${actionDesc}

### TASK: Extract the following information about the requested action

${propDesc}

Use null for any values that cannot be determined.
Respond with a JSON markdown block containing only the extracted values with this structure:
\`\`\`json
${zodSchemaToJson(schema)}
\`\`\`

${stringArrayFooter}
`;
}

/**
 * Convert a Zod schema to JSON
 * @param schema Zod schema
 * @returns JSON string
 */
export function zodSchemaToJson(schema: z.ZodType<any>): string {
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
    if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) {
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
