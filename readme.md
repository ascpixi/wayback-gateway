# wayback-gateway
wayback-gateway is a simple gateway for the Internet Archive Wayback Machine, which returns raw webpages (omitting the Wayback Machine interface). It's designed for older browsers, which may have trouble with processing and handling the Wayback Machine interface.

Also, if you can, then [**please donate**](https://archive.org/donate) to the Internet Archive. They're doing a fantastic job, and, as of 09/10/2024, are experiencing DDoS attacks from threat actors and an unethical lawsuit from a greedy publishing company.

## Hosting a `wayback-gateway` server
First, you'll need Node.js. You can find instructions on how to install it [here](https://nodejs.org/en/download/package-manager). Once installed, in order to install the dependencies of the project, you'll also need Yarn, which you can find the instructions for the installation of [here](https://yarnpkg.com/getting-started/install).

After installing both Node.js and Yarn, navigate into the directory of the project in your shell of choice, and install all dependencies of the project via `yarn install`. You can then run the gateway via `yarn run serve`. That's it! q(≧▽≦q)

> [!NOTE]
> This also works when you're running the gateway locally! Simply navigate to `http://localhost:8080` to access the gateway (if you set a different port, you should replace `8080` with said port).

## Configuration
In order to configure the gateway, create a `config.json` file at the root of the projects directory (where you run `yarn run serve`). This file contains the following properties (alongside their default values):

```json
{
    "port": 8080, // determines the port the gateway should run on
    "logNewRequests": true, // if true, will log each cache miss
    "cookies": "", // can be used to identify yourself when using proxied requests
    "proxies": [], // a list of HTTP proxies, in the format of <ip>:<port>
    "requestDelay": 250, // amount of ms between each request (to distribute bursts)
    "caching": {
        "enabled": true, // whether to cache archives in memory - highly recommended
        "maxSize": 268435456 // maximum amount of bytes cached resources can take up
    },
    "rateLimit": {
        "window": 60000, // length, in ms, of the rate limit window
        "limit": 50 // amount of requests one client can make in <window> ms
    }
}
```

For the cache, if the `caching.maxSize` value is exceeded, entries are evicted via a LRU policy.

Proxies are used only if requests to an existing resource (as confirmed by the Wayback Machine API) fail. It's highly recommended to include at least one proxy. These proxies will be used in a round-robin fashion.

Each user of the gateway can also set their local configuration via the gateway's root URL.
