import {test} from './utils';
import {RestHttpErrors} from '../../../src';

const TODO_SCHEMA = {
  title: 'Todo',
  properties: {
    id: {
      type: 'number',
    },
    title: {
      type: 'string',
    },
    desc: {
      type: 'string',
    },
    isComplete: {
      type: 'boolean',
    },
    remindAtAddress: {
      type: 'string',
    },
    remindAtGeo: {
      type: 'string',
    },
  },
  required: ['title'],
};

const REQUEST_BODY_SPEC = {
  content: {
    'application/json': {
      schema: TODO_SCHEMA,
    },
  },
};

describe('validate request body - happy path', () => {
  context('good request body should pass', () => {
    const good_request_body = {
      title: 'work',
      desc: 'work to do',
      isComplete: false,
    };
    test(REQUEST_BODY_SPEC, good_request_body, good_request_body);
  });
  context('bad request body should fail', () => {
    // missing 'title'
    // isComplete should be boolean
    const bad_request_body = {
      desc: 'work to do',
      isComplete: 'oops I should not be a string',
    };
    const errMsg =
      "[object Object] should have required property 'title', [object Object].isComplete should be boolean";
    test(
      REQUEST_BODY_SPEC,
      bad_request_body,
      RestHttpErrors.invalidRequestBody(bad_request_body, errMsg),
    );
  });
});

describe('validate request body - complicated', () => {});

// TODO add test cases for optional vs. required request body
