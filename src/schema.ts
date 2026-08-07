import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import { readFile } from 'node:fs/promises';

const names = ['evaluation', 'case', 'contract', 'evidence', 'review', 'judge-input', 'preflight', 'qualification'] as const;
type SchemaName = (typeof names)[number];
let validators: Promise<Record<SchemaName, ValidateFunction>> | undefined;

async function loadValidators(): Promise<Record<SchemaName, ValidateFunction>> {
  if (validators) return validators;
  validators = (async () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true, formats: { 'date-time': true } });
    const result = {} as Record<SchemaName, ValidateFunction>;
    for (const name of names) {
      const schemaUrl = new URL(`../schemas/${name}.schema.json`, import.meta.url);
      result[name] = ajv.compile(JSON.parse(await readFile(schemaUrl, 'utf8')) as object);
    }
    return result;
  })();
  return validators;
}

export async function validateSchema(name: SchemaName, value: unknown, label: string): Promise<void> {
  const validate = (await loadValidators())[name];
  if (!validate(value)) throw new Error(`${label}: ${formatErrors(validate.errors ?? [])}`);
}

function formatErrors(errors: ErrorObject[]): string {
  return errors.map(error => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`).join('; ');
}
