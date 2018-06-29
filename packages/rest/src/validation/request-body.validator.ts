import * as AJV from 'ajv';
const toJsonSchema = require('openapi-schema-to-json-schema');
import {
  RequestBodyObject,
  SchemaObject,
  isReferenceObject,
} from '@loopback/openapi-v3-types';
import * as debugModule from 'debug';
import {RestHttpErrors} from '../coercion/rest-http-error';
const debug = debugModule('loopback:rest:validation');
const util = require('util');

export function validateRequestBody(
  // tslint:disable-next-line:no-any
  body: any,
  requestBodySpec?: RequestBodyObject,
) {
  const schema = getRequestBodySchema(requestBodySpec);
  debug('schema from RequestBody is: %s', util.inspect(schema));
  if (!schema) return;
  // @janny: We need to add the whole openapi spec in context
  // otherwise `parseOperationArgs` only has access to the operation spec
  // NOT openapiSpec.components.schemas
  // Therefore I skip it as a workaround
  if (isReferenceObject(schema)) return;
  const JSONSchema = convertToJSONSchema(schema);
  validateWithAJV(body, JSONSchema);
}

function getRequestBodySchema(requestBodySpec?: RequestBodyObject) {
  if (!requestBodySpec) return;
  const content = requestBodySpec.content;
  return content[Object.keys(content)[0]].schema;
}

function convertToJSONSchema(schema: SchemaObject) {
  const JSONSchema = toJsonSchema(schema);
  delete JSONSchema['$schema'];
  debug('convert to JSON schema %s', util.inspect(JSONSchema));
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
  debug('AJV validation is %s', isValid);
  if (!isValid) {
    debug('AJV validation error: %s', util.inspect(ajv.errors));
    const err = ajv.errorsText(ajv.errors, {dataVar: body});
    throw RestHttpErrors.invalidRequestBody(body, err);
  }
}
