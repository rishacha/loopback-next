import * as AJV from 'ajv';
const toJsonSchema = require('openapi-schema-to-json-schema');
import {
  RequestBodyObject,
  SchemaObject,
  isReferenceObject,
  SchemasObject,
} from '@loopback/openapi-v3-types';
import * as debugModule from 'debug';
import {RestHttpErrors} from '../coercion/rest-http-error';
import {HttpErrors} from '..';
const debug = debugModule('loopback:rest:validation');
const util = require('util');

export function validateRequestBody(
  // tslint:disable-next-line:no-any
  body: any,
  requestBodySpec: RequestBodyObject | undefined,
  globalSchemas: SchemasObject,
) {
  if (requestBodySpec && requestBodySpec.required && body == undefined)
    throw new HttpErrors.BadRequest('Request body is required');

  const schema = getRequestBodySchema(requestBodySpec, globalSchemas);
  debug('schema from RequestBody is: %s', util.inspect(schema));
  if (!schema) return;

  const JSONSchema = convertToJSONSchema(schema);
  validateWithAJV(body, JSONSchema);
}

function getRequestBodySchema(
  requestBodySpec: RequestBodyObject | undefined,
  globalSchemas: SchemasObject,
): SchemaObject | undefined {
  if (!requestBodySpec) return;
  const content = requestBodySpec.content;
  // FIXME(bajtos) we need to find the entry matching the content-type
  // header from the incoming request (e.g. "application/json").
  const schema = content[Object.keys(content)[0]].schema;
  if (!schema || !isReferenceObject(schema)) {
    return schema;
  }

  // A temporary solution for resolving schema references produced
  // by @loopback/repository-json-schema. In the future, we should
  // support arbitrary references anywhere in the OpenAPI spec.
  // See https://github.com/strongloop/loopback-next/issues/435
  const ref = schema.$ref;
  const match = ref.match(/^#\/components\/schemas\/([^\/]+)$/);
  if (!match) throw new Error(`Unsupported schema reference format: ${ref}`);
  const schemaId = match[1];

  debug(`Resolving schema reference ${ref} (schema id ${schemaId}).`);
  if (!(schemaId in globalSchemas)) {
    throw new Error(`Invalid reference ${ref} - schema ${schemaId} not found.`);
  }
  return globalSchemas[schemaId];
}

function convertToJSONSchema(schema: SchemaObject) {
  const JSONSchema = toJsonSchema(schema);
  delete JSONSchema['$schema'];
  debug('Convert OpenAPI schema to JSON schema: %s', util.inspect(JSONSchema));
  return JSONSchema;
}

// tslint:disable-next-line:no-any
function validateWithAJV(body: any, schema: any) {
  debug('AJV validation starts!');
  const ajv = new AJV({allErrors: true});
  let isValid: boolean;
  try {
    isValid = ajv.validate(schema, body) as boolean;
  } catch (err) {
    isValid = false;
  }
  debug('AJV validation result: %s', isValid);
  if (!isValid) {
    debug('AJV validation errors: %s', util.inspect(ajv.errors));
    const err = ajv.errorsText(ajv.errors, {dataVar: body});
    // FIXME add `err.details` object containing machine-readable information
    // see LB 3.x ValidationError for inspiration
    throw RestHttpErrors.invalidRequestBody(body, err);
  }
}
