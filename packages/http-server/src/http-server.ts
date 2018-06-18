// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/http-server
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {createServer, Server, ServerRequest, ServerResponse} from 'http';
import {createServer as createHttpsServer, Server as HttpsServer} from 'https';
import {AddressInfo} from 'net';
import * as util from 'util';
import * as fs from 'fs';
import * as pEvent from 'p-event';

const readFile = util.promisify(fs.readFile);

export type RequestListener = (req: ServerRequest, res: ServerResponse) => void;

export type CreateServerOptions = {
  key?: Buffer;
  cert?: Buffer;
  req?: ServerRequest;
  res?: ServerResponse;
};

/**
 * Object for specifyig the HTTP / HTTPS server options
 */
export type ServerOptions = {
  port?: number;
  host?: string;
  protocol?: HttpProtocol;
  key?: string;
  cert?: string;
  passphrase?: string;
};

/**
 * Object for specifyig the HTTPS options
 */
export type HttpsOptions = {
  key?: string;
  cert?: string;
  passphrase?: string;
};

export type HttpProtocol = 'http' | 'https'; // Will be extended to `http2` in the future

/**
 * HTTP / HTTPS server used by LoopBack's RestServer
 *
 * @export
 * @class HttpServer
 */
export class HttpServer {
  private _port: number;
  private _host?: string;
  private _listening: boolean = false;
  private _protocol: HttpProtocol;
  private _address: AddressInfo;
  private _httpsOptions: HttpsOptions = {};
  private requestListener: RequestListener;
  private server: Server | HttpsServer;

  /**
   * @param requestListener
   * @param serverOptions
   */
  constructor(requestListener: RequestListener, serverOptions?: ServerOptions) {
    this.requestListener = requestListener;
    if (!serverOptions) serverOptions = {};
    this._port = serverOptions.port || 0;
    this._host = serverOptions.host || undefined;
    this._protocol = serverOptions.protocol || 'http';
    if (this._protocol === 'https') {
      this._httpsOptions.cert = serverOptions.cert;
      this._httpsOptions.key = serverOptions.key;
    }
  }

  /**
   * Starts the HTTP / HTTPS server
   */
  public async start() {
    const options: CreateServerOptions = {};
    if (this._protocol === 'https') {
      if (this._httpsOptions.key) {
        options.key = await readFile(this._httpsOptions.key);
      }
      if (this._httpsOptions.cert) {
        options.cert = await readFile(this._httpsOptions.cert);
      }
      this.server = createHttpsServer(options, this.requestListener);
    } else {
      this.server = createServer(this.requestListener);
    }

    this.server.listen(this._port, this._host);
    try {
      await pEvent(this.server, 'listening');
      this._listening = true;
      this._address = this.server.address() as AddressInfo;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Stops the HTTP / HTTPS server
   */
  public async stop() {
    if (this.server) {
      this.server.close();
      await pEvent(this.server, 'close');
      this._listening = false;
    }
  }

  /**
   * Protocol of the HTTP / HTTPS server
   */
  public get protocol(): HttpProtocol {
    return this._protocol;
  }

  /**
   * Port number of the HTTP / HTTPS server
   */
  public get port(): number {
    return (this._address && this._address.port) || this._port;
  }

  /**
   * Host of the HTTP / HTTPS server
   */
  public get host(): string | undefined {
    return (this._address && this._address.address) || this._host;
  }

  /**
   * URL of the HTTP / HTTPS server
   */
  public get url(): string {
    let host = this.host;
    if (this._address.family === 'IPv6') {
      host = `[${host}]`;
    }
    return `${this._protocol}://${host}:${this.port}`;
  }

  /**
   * State of the HTTP / HTTPS server
   */
  public get listening(): boolean {
    return this._listening;
  }

  /**
   * Address of the HTTP / HTTPS server
   */
  public get address(): AddressInfo | undefined {
    return this._listening ? this._address : undefined;
  }
}
