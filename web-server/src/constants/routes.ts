class RoutePath {
  public PATH = '/';
  constructor(path: string = '/') {
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    this.PATH += this.formatPath(path);
  }

  private formatPath(path: string, caseSensitive: boolean = false) {
    if (!caseSensitive) {
      path = path.toLowerCase();
    }
    return path.replace(/_/g, '-');
  }

  private basicPath(path: string | string[], caseSensitive: boolean = false) {
    return `${this.PATH}/${this.formatPath(
      Array.isArray(path) ? path.join('/') : path,
      caseSensitive
    )}`;
  }

  /**
   * This mutates the path. Only use in the routes definitions, or when creating a new `RoutePath` instance.
   */
  chain(path: string | string[], caseSensitive: boolean = false): RoutePath {
    this.PATH = this.basicPath(path, caseSensitive);
    return this;
  }

  /**
   * Use it to add params to the path without mutation
   */
  add(path: string | string[], caseSensitive: boolean = false) {
    return {
      PATH: this.basicPath(path, caseSensitive),
      QUERY_PATH: (queryParams: {}) => {
        const params = new URLSearchParams(queryParams);
        return `${this.basicPath(path, caseSensitive)}\?${params.toString()}`;
      }
    };
  }

  HREF(queryParams: {} = {}) {
    if (!window.location) return '';
    const url = new URL(window.location.origin);
    url.pathname = this.PATH;

    if (Object.values(queryParams).length) {
      const params = new URLSearchParams(queryParams);
      url.search = params.toString();
    }
    return url.href;
  }
}

export const ROUTES = {
  BASE: '/',
  WELCOME: new RoutePath('WELCOME'),
  SERVER_ADMIN: new RoutePath('SERVER_ADMIN'),
  DORA_METRICS: new RoutePath('DORA_METRICS'),
  get TEAMS() {
    const route = new RoutePath('TEAMS');
    return {
      ROUTE: route,
      PATH: route.PATH
    };
  },
  INTEGRATIONS: new RoutePath('INTEGRATIONS'),
  SETTINGS: new RoutePath('SETTINGS'),
  SYSTEM: new RoutePath('SYSTEM')
};

export const DEFAULT_HOME_ROUTE = ROUTES.DORA_METRICS;
