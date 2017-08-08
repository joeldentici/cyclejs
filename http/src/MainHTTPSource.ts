import xs, {Stream, MemoryStream} from 'xstream';
import {HTTPSource} from './interfaces';
import {isolateSource, isolateSink} from './isolate';
import {DevToolEnabledSource} from '@cycle/run';
import {adapt} from '@cycle/run/lib/adapt';
import {
  Response,
  ResponseStream,
  RequestOptions,
  RequestInput,
} from './interfaces';

import {createResponse$, normalizeRequestInput} from './http-driver';

export class MainHTTPSource implements HTTPSource {
  constructor(
    private _res$$: Stream<MemoryStream<Response> & ResponseStream>,
    private _name: string,
    private _namespace: Array<string> = [],
  ) {}

  public filter(predicate: (request: RequestOptions) => boolean): HTTPSource {
    const filteredResponse$$ = this._res$$.filter(r$ => predicate(r$.request));
    return new MainHTTPSource(filteredResponse$$, this._name, this._namespace);
  }

  public select(category?: string): any {
    const res$$ = category
      ? this._res$$.filter(
          res$ => res$.request && res$.request.category === category,
        )
      : this._res$$;
    const out: DevToolEnabledSource = adapt(res$$);
    out._isCycleSource = this._name;
    return out;
  }

  public makeRequest(request: RequestInput): Stream<Response> {
    //don't know if we should remember in the case of monadic requests
    //as we might be better off leaving that to the user if they want it
    const response$ = createResponse$(request).remember();

    return adapt(response$);
  }

  private makeRequestMethod(
    url: RequestInput,
    request?: RequestInput,
    method: string,
  ): Stream<Response> {
    try {
      const options = normalizeRequestInput(url);

      //if request is undefined we will treat the url as the request
      const options2 = request === undefined
        ? options
        : normalizeRequestInput(request);

      Object.defineProperty(options2, 'method', {
        writable: false,
        value: method,
      });

      //we need to set the url on the options2 if both url and request
      //are specified
      if (options2 !== options) {
        Object.defineProperty(options2, 'url', {
          writable: false,
          value: options.url,
        });
      }

      return this.makeRequest(options2);
    } catch (err) {
      return xs.throw(err);
    }
  }

  public head(url: RequestInput, request?: RequestInput): Stream<Response> {
    return this.makeRequestMethod(url, request, 'HEAD');
  }

  public get(url: RequestInput, request?: RequestInput): Stream<Response> {
    return this.makeRequestMethod(url, request, 'GET');
  }

  public post(url: RequestInput, request?: RequestInput): Stream<Response> {
    return this.makeRequestMethod(url, request, 'POST');
  }

  public put(url: RequestInput, request?: RequestInput): Stream<Response> {
    return this.makeRequestMethod(url, request, 'PUT');
  }

  public delete(url: RequestInput, request?: RequestInput): Stream<Response> {
    return this.makeRequestMethod(url, request, 'DELETE');
  }

  public patch(url: RequestInput, request?: RequestInput): Stream<Response> {
    return this.makeRequestMethod(url, request, 'PATCH');
  }

  public isolateSource = isolateSource;
  public isolateSink = isolateSink;
}
