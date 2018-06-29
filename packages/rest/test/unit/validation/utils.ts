import {OperationObject, RequestBodyObject} from '@loopback/openapi-v3-types';

import {
  ShotRequestOptions,
  expect,
  stubExpressContext,
} from '@loopback/testlab';

import {
  PathParameterValues,
  Request,
  Route,
  createResolvedRoute,
  parseOperationArgs,
  ResolvedRoute,
} from '../../..';
import * as HttpErrors from 'http-errors';

function givenOperationWithRequestBody(requestBodySpec?: RequestBodyObject) {
  return <OperationObject>{
    'x-operation-name': 'testOp',
    requestBody: requestBodySpec,
    responses: {},
  };
}

function givenRequest(options?: ShotRequestOptions): Request {
  return stubExpressContext(options).request;
}

function givenResolvedRoute(
  spec: OperationObject,
  pathParams: PathParameterValues = {},
): ResolvedRoute {
  const route = new Route('post', '/', spec, () => {});
  return createResolvedRoute(route, pathParams);
}

export interface TestArgs<T> {
  body: object;
  requestBodySpec: RequestBodyObject;
  expectedResult: T;
  caller: string;
  expectError: boolean;
  opts: TestOptions;
}

export type TestOptions = {
  testName?: string;
};

export async function testValidation<T>(config: TestArgs<T>) {
  /* istanbul ignore next */
  try {
    const req = givenRequest({payload: config.body, url: '/'});
    const spec = givenOperationWithRequestBody(config.requestBodySpec);
    const route = givenResolvedRoute(spec);

    if (config.expectError) {
      await expect(parseOperationArgs(req, route)).to.be.rejectedWith(
        config.expectedResult,
      );
    } else {
      const args = await parseOperationArgs(req, route);
      expect(args).to.eql([config.expectedResult]);
    }
  } catch (err) {
    err.stack += config.caller;
    throw err;
  }
}

export function test<T>(
  requestBodySpec: RequestBodyObject,
  body: object,
  expectedResult: T,
  opts?: TestOptions,
) {
  const caller: string = new Error().stack!;
  const DEFAULT_TEST_NAME = 'validation test';
  const testName = (opts && opts.testName) || DEFAULT_TEST_NAME;

  it(testName, async () => {
    await testValidation({
      requestBodySpec,
      body,
      expectedResult,
      caller,
      expectError: expectedResult instanceof HttpErrors.HttpError,
      opts: opts || {},
    });
  });
}
