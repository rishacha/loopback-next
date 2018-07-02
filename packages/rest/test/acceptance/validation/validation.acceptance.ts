import {supertest, createClientForHandler} from '@loopback/testlab';
import {RestApplication, post, requestBody, api} from '../../..';
import {ControllerClass} from '@loopback/core';

describe('Validation at REST level', () => {
  let app: RestApplication;
  let client: supertest.SuperTest<supertest.Test>;

  class Product {
    name: string;
    description?: string;
    price: number;

    constructor(data: Partial<Product>) {
      Object.assign(this, data);
    }
  }

  const PRODUCT_SPEC = {
    title: 'Product',
    properties: {
      name: {type: 'string'},
      description: {type: 'string'},
      price: {type: 'number'},
    },
    required: ['name', 'price'],
  };

  context('for fully-specified request body', () => {
    class ProductControllerWithFullSchema {
      @post('/products')
      async create(
        @requestBody({
          content: {
            'application/json': {
              schema: PRODUCT_SPEC,
            },
          },
          required: true,
        })
        data: Partial<Product>,
      ): Promise<Product> {
        return new Product(data);
      }
    }

    before(async () => {
      await givenAnAppAndAClient(ProductControllerWithFullSchema);
    });

    after(async () => {
      await app.stop();
    });

    it('accepts valid values', serverAcceptsValidRequestBody);

    it(
      'rejects missing required properties',
      serverRejectsRequestWithMissingRequiredValues,
    );

    it('rejects requests with no (empty) body', async () => {
      // NOTE(bajtos) An empty body cannot be parsed as a JSON,
      // therefore this test request does not even reach the validation logic.
      await client.post('/products').expect(400);
    });

    it('rejects requests with null body', async () => {
      await client
        .post('/products')
        .type('json')
        .send('null')
        .expect(400);
    });
  });

  context('for request body specified via a reference', () => {
    @api({
      paths: {},
      components: {
        schemas: {
          Product: PRODUCT_SPEC,
        },
      },
    })
    class ProductControllerReferencingComponentsSchema {
      @post('/products')
      async create(@requestBody() data: Product): Promise<Product> {
        return new Product(data);
      }
    }

    before(async () => {
      await givenAnAppAndAClient(ProductControllerReferencingComponentsSchema);
    });

    after(async () => {
      await app.stop();
    });

    it('accepts valid values', serverAcceptsValidRequestBody);

    it(
      'rejects missing required properties',
      serverRejectsRequestWithMissingRequiredValues,
    );
  });

  async function givenAnAppAndAClient(controller: ControllerClass) {
    app = new RestApplication();
    app.controller(controller);
    await app.start();

    client = await createClientForHandler(app.requestHandler);
  }

  async function serverAcceptsValidRequestBody() {
    const DATA = {
      name: 'Pencil',
      description: 'An optional description of a pencil',
      price: 10,
    };
    await client
      .post('/products')
      .send(DATA)
      .expect(200, DATA);
  }

  async function serverRejectsRequestWithMissingRequiredValues() {
    await client
      .post('/products')
      .send({
        description: 'A product missing required name and price',
      })
      .expect(422);
  }
});
