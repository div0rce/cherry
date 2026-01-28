```ts
# .nvmrc
22
```

```ts
// package-lock.json
{
  "name": "cherry",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "cherry",
      "version": "0.1.0",
      "hasInstallScript": true,
      "dependencies": {
        "@auth/prisma-adapter": "2.11.1",
        "@prisma/client": "^6.19.0",
        "@radix-ui/react-slot": "^1.2.4",
        "class-variance-authority": "^0.7.1",
        "csv-parse": "^6.1.0",
        "next": "^16.0.8",
        "next-auth": "5.0.0-beta.30",
        "nodemailer": "^7.0.10",
        "passkit-generator": "^3.5.5",
        "pdf-parse": "^2.4.5",
        "react": "19.2.0",
        "react-dom": "19.2.0",
        "zod": "^4.1.13"
      },
      "devDependencies": {
        "@simplewebauthn/server": "^9.0.3",
        "@simplewebauthn/types": "^9.0.1",
        "@tailwindcss/language-server": "^0.14.29",
        "@tailwindcss/postcss": "^4",
        "@types/cookie": "^0.6.0",
        "@types/node": "^22",
        "@types/nodemailer": "^7.0.4",
        "@types/react": "^19",
        "@types/react-dom": "^19",
        "@typescript-eslint/eslint-plugin": "^8.0.0",
        "@typescript-eslint/parser": "^8.0.0",
        "@vscode/ripgrep": "1.17.0",
        "babel-plugin-react-compiler": "1.0.0",
        "baseline-browser-mapping": "^2.8.32",
        "eslint": "^9",
        "eslint-config-next": "16.0.3",
        "eslint-plugin-zod": "^1.4.0",
        "fast-glob": "^3.3.3",
        "patch-package": "^8.0.1",
        "postinstall-postinstall": "^2.1.0",
        "prisma": "^6.19.0",
        "tailwindcss": "^4",
        "ts-node": "^10.9.2",
        "tsconfig-paths": "^4.2.0",
        "tsx": "4.19.2",
        "typescript": "^5"
      },
      "engines": {
        "node": ">=22 <23"
      },
      "optionalDependencies": {
        "lightningcss": "^1.25.0"
      }
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.2.0.tgz",
      "integrity": "sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@auth/core": {
      "version": "0.41.1",
      "resolved": "https://registry.npmjs.org/@auth/core/-/core-0.41.1.tgz",
      "integrity": "sha512-t9cJ2zNYAdWMacGRMT6+r4xr1uybIdmYa49calBPeTqwgAFPV/88ac9TEvCR85pvATiSPt8VaNf+Gt24JIT/uw==",
      "license": "ISC",
      "dependencies": {
        "@panva/hkdf": "^1.2.1",
        "jose": "^6.0.6",
        "oauth4webapi": "^3.3.0",
        "preact": "10.24.3",
        "preact-render-to-string": "6.5.11"
      },
      "peerDependencies": {
        "@simplewebauthn/browser": "^9.0.1",
        "@simplewebauthn/server": "^9.0.2",
        "nodemailer": "^7.0.7"
      },
      "peerDependenciesMeta": {
        "@simplewebauthn/browser": {
          "optional": true
        },
        "@simplewebauthn/server": {
          "optional": true
        },
        "nodemailer": {
          "optional": true
        }
      }
    },
    "node_modules/@auth/prisma-adapter": {
      "version": "2.11.1",
      "resolved": "https://registry.npmjs.org/@auth/prisma-adapter/-/prisma-adapter-2.11.1.tgz",
      "integrity": "sha512-Ke7DXP0Fy0Mlmjz/ZJLXwQash2UkA4621xCM0rMtEczr1kppLc/njCbUkHkIQ/PnmILjqSPEKeTjDPsYruvkug==",
      "license": "ISC",
      "dependencies": {
        "@auth/core": "0.41.1"
      },
      "peerDependencies": {
        "@prisma/client": ">=2.26.0 || >=3 || >=4 || >=5 || >=6"
      }
    },
    "node_modules/@aws-crypto/sha256-browser": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@aws-crypto/sha256-browser/-/sha256-browser-5.2.0.tgz",
      "integrity": "sha512-AXfN/lGotSQwu6HNcEsIASo7kWXZ5HYWvfOmSNKDsEqC4OashTp8alTmaz+F7TC2L083SFv5RdB+qU3Vs1kZqw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-crypto/sha256-js": "^5.2.0",
        "@aws-crypto/supports-web-crypto": "^5.2.0",
        "@aws-crypto/util": "^5.2.0",
        "@aws-sdk/types": "^3.222.0",
        "@aws-sdk/util-locate-window": "^3.0.0",
        "@smithy/util-utf8": "^2.0.0",
        "tslib": "^2.6.2"
      }
    },
    "node_modules/@aws-crypto/sha256-browser/node_modules/@smithy/is-array-buffer": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/is-array-buffer/-/is-array-buffer-2.2.0.tgz",
      "integrity": "sha512-GGP3O9QFD24uGeAXYUjwSTXARoqpZykHadOmA8G5vfJPK0/DC67qa//0qvqrJzL1xc8WQWX7/yc7fwudjPHPhA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@aws-crypto/sha256-browser/node_modules/@smithy/util-buffer-from": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-buffer-from/-/util-buffer-from-2.2.0.tgz",
      "integrity": "sha512-IJdWBbTcMQ6DA0gdNhh/BwrLkDR+ADW5Kr1aZmd4k3DIF6ezMV4R2NIAmT08wQJ3yUK82thHWmC/TnK/wpMMIA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/is-array-buffer": "^2.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@aws-crypto/sha256-browser/node_modules/@smithy/util-utf8": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-utf8/-/util-utf8-2.3.0.tgz",
      "integrity": "sha512-R8Rdn8Hy72KKcebgLiv8jQcQkXoLMOGGv5uI1/k0l+snqkOzQ1R0ChUBCxWMlBsFMekWjq0wRudIweFs7sKT5A==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/util-buffer-from": "^2.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@aws-crypto/sha256-js": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@aws-crypto/sha256-js/-/sha256-js-5.2.0.tgz",
      "integrity": "sha512-FFQQyu7edu4ufvIZ+OadFpHHOt+eSTBaYaki44c+akjg7qZg9oOQeLlk77F6tSYqjDAFClrHJk9tMf0HdVyOvA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-crypto/util": "^5.2.0",
        "@aws-sdk/types": "^3.222.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/@aws-crypto/supports-web-crypto": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@aws-crypto/supports-web-crypto/-/supports-web-crypto-5.2.0.tgz",
      "integrity": "sha512-iAvUotm021kM33eCdNfwIN//F77/IADDSs58i+MDaOqFrVjZo9bAal0NK7HurRuWLLpF1iLX7gbWrjHjeo+YFg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      }
    },
    "node_modules/@aws-crypto/util": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@aws-crypto/util/-/util-5.2.0.tgz",
      "integrity": "sha512-4RkU9EsI6ZpBve5fseQlGNUWKMa1RLPQ1dnjnQoe07ldfIzcsGb5hC5W0Dm7u423KWzawlrpbjXBrXCEv9zazQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/types": "^3.222.0",
        "@smithy/util-utf8": "^2.0.0",
        "tslib": "^2.6.2"
      }
    },
    "node_modules/@aws-crypto/util/node_modules/@smithy/is-array-buffer": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/is-array-buffer/-/is-array-buffer-2.2.0.tgz",
      "integrity": "sha512-GGP3O9QFD24uGeAXYUjwSTXARoqpZykHadOmA8G5vfJPK0/DC67qa//0qvqrJzL1xc8WQWX7/yc7fwudjPHPhA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@aws-crypto/util/node_modules/@smithy/util-buffer-from": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-buffer-from/-/util-buffer-from-2.2.0.tgz",
      "integrity": "sha512-IJdWBbTcMQ6DA0gdNhh/BwrLkDR+ADW5Kr1aZmd4k3DIF6ezMV4R2NIAmT08wQJ3yUK82thHWmC/TnK/wpMMIA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/is-array-buffer": "^2.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-utf8/-/util-utf8-2.3.0.tgz",
      "integrity": "sha512-R8Rdn8Hy72KKcebgLiv8jQcQkXoLMOGGv5uI1/k0l+snqkOzQ1R0ChUBCxWMlBsFMekWjq0wRudIweFs7sKT5A==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/util-buffer-from": "^2.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@aws-sdk/client-sesv2": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/client-sesv2/-/client-sesv2-3.970.0.tgz",
      "integrity": "sha512-QLqB8yluIhgXCr/0fY2f0gI3nQl0TInI+4/SFt9i1gGuvIVp7Nc6mFxjFe+CilfIadMqwjH28KvunirmDpWGPQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-crypto/sha256-browser": "5.2.0",
        "@aws-crypto/sha256-js": "5.2.0",
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/credential-provider-node": "3.970.0",
        "@aws-sdk/middleware-host-header": "3.969.0",
        "@aws-sdk/middleware-logger": "3.969.0",
        "@aws-sdk/middleware-recursion-detection": "3.969.0",
        "@aws-sdk/middleware-user-agent": "3.970.0",
        "@aws-sdk/region-config-resolver": "3.969.0",
        "@aws-sdk/signature-v4-multi-region": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@aws-sdk/util-endpoints": "3.970.0",
        "@aws-sdk/util-user-agent-browser": "3.969.0",
        "@aws-sdk/util-user-agent-node": "3.970.0",
        "@smithy/config-resolver": "^4.4.6",
        "@smithy/core": "^3.20.6",
        "@smithy/fetch-http-handler": "^5.3.9",
        "@smithy/hash-node": "^4.2.8",
        "@smithy/invalid-dependency": "^4.2.8",
        "@smithy/middleware-content-length": "^4.2.8",
        "@smithy/middleware-endpoint": "^4.4.7",
        "@smithy/middleware-retry": "^4.4.23",
        "@smithy/middleware-serde": "^4.2.9",
        "@smithy/middleware-stack": "^4.2.8",
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/node-http-handler": "^4.4.8",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/smithy-client": "^4.10.8",
        "@smithy/types": "^4.12.0",
        "@smithy/url-parser": "^4.2.8",
        "@smithy/util-base64": "^4.3.0",
        "@smithy/util-body-length-browser": "^4.2.0",
        "@smithy/util-body-length-node": "^4.2.1",
        "@smithy/util-defaults-mode-browser": "^4.3.22",
        "@smithy/util-defaults-mode-node": "^4.2.25",
        "@smithy/util-endpoints": "^3.2.8",
        "@smithy/util-middleware": "^4.2.8",
        "@smithy/util-retry": "^4.2.8",
        "@smithy/util-utf8": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/client-sso": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/client-sso/-/client-sso-3.970.0.tgz",
      "integrity": "sha512-ArmgnOsSCXN5VyIvZb4kSP5hpqlRRHolrMtKQ/0N8Hw4MTb7/IeYHSZzVPNzzkuX6gn5Aj8txoUnDPM8O7pc9g==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-crypto/sha256-browser": "5.2.0",
        "@aws-crypto/sha256-js": "5.2.0",
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/middleware-host-header": "3.969.0",
        "@aws-sdk/middleware-logger": "3.969.0",
        "@aws-sdk/middleware-recursion-detection": "3.969.0",
        "@aws-sdk/middleware-user-agent": "3.970.0",
        "@aws-sdk/region-config-resolver": "3.969.0",
        "@aws-sdk/types": "3.969.0",
        "@aws-sdk/util-endpoints": "3.970.0",
        "@aws-sdk/util-user-agent-browser": "3.969.0",
        "@aws-sdk/util-user-agent-node": "3.970.0",
        "@smithy/config-resolver": "^4.4.6",
        "@smithy/core": "^3.20.6",
        "@smithy/fetch-http-handler": "^5.3.9",
        "@smithy/hash-node": "^4.2.8",
        "@smithy/invalid-dependency": "^4.2.8",
        "@smithy/middleware-content-length": "^4.2.8",
        "@smithy/middleware-endpoint": "^4.4.7",
        "@smithy/middleware-retry": "^4.4.23",
        "@smithy/middleware-serde": "^4.2.9",
        "@smithy/middleware-stack": "^4.2.8",
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/node-http-handler": "^4.4.8",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/smithy-client": "^4.10.8",
        "@smithy/types": "^4.12.0",
        "@smithy/url-parser": "^4.2.8",
        "@smithy/util-base64": "^4.3.0",
        "@smithy/util-body-length-browser": "^4.2.0",
        "@smithy/util-body-length-node": "^4.2.1",
        "@smithy/util-defaults-mode-browser": "^4.3.22",
        "@smithy/util-defaults-mode-node": "^4.2.25",
        "@smithy/util-endpoints": "^3.2.8",
        "@smithy/util-middleware": "^4.2.8",
        "@smithy/util-retry": "^4.2.8",
        "@smithy/util-utf8": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/core": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/core/-/core-3.970.0.tgz",
      "integrity": "sha512-klpzObldOq8HXzDjDlY6K8rMhYZU6mXRz6P9F9N+tWnjoYFfeBMra8wYApydElTUYQKP1O7RLHwH1OKFfKcqIA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/types": "3.969.0",
        "@aws-sdk/xml-builder": "3.969.0",
        "@smithy/core": "^3.20.6",
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/signature-v4": "^5.3.8",
        "@smithy/smithy-client": "^4.10.8",
        "@smithy/types": "^4.12.0",
        "@smithy/util-base64": "^4.3.0",
        "@smithy/util-middleware": "^4.2.8",
        "@smithy/util-utf8": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-env": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-env/-/credential-provider-env-3.970.0.tgz",
      "integrity": "sha512-rtVzXzEtAfZBfh+lq3DAvRar4c3jyptweOAJR2DweyXx71QSMY+O879hjpMwES7jl07a3O1zlnFIDo4KP/96kQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-http": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-http/-/credential-provider-http-3.970.0.tgz",
      "integrity": "sha512-CjDbWL7JxjLc9ZxQilMusWSw05yRvUJKRpz59IxDpWUnSMHC9JMMUUkOy5Izk8UAtzi6gupRWArp4NG4labt9Q==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/fetch-http-handler": "^5.3.9",
        "@smithy/node-http-handler": "^4.4.8",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/smithy-client": "^4.10.8",
        "@smithy/types": "^4.12.0",
        "@smithy/util-stream": "^4.5.10",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-ini": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-ini/-/credential-provider-ini-3.970.0.tgz",
      "integrity": "sha512-L5R1hN1FY/xCmH65DOYMXl8zqCFiAq0bAq8tJZU32mGjIl1GzGeOkeDa9c461d81o7gsQeYzXyqFD3vXEbJ+kQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/credential-provider-env": "3.970.0",
        "@aws-sdk/credential-provider-http": "3.970.0",
        "@aws-sdk/credential-provider-login": "3.970.0",
        "@aws-sdk/credential-provider-process": "3.970.0",
        "@aws-sdk/credential-provider-sso": "3.970.0",
        "@aws-sdk/credential-provider-web-identity": "3.970.0",
        "@aws-sdk/nested-clients": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/credential-provider-imds": "^4.2.8",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/shared-ini-file-loader": "^4.4.3",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-login": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-login/-/credential-provider-login-3.970.0.tgz",
      "integrity": "sha512-C+1dcLr+p2E+9hbHyvrQTZ46Kj4vC2RoP6N935GEukHQa637ZjXs8VlyHJ2xTvbvwwLZQNiu56Cx7o/OFOqw1A==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/nested-clients": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/shared-ini-file-loader": "^4.4.3",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-node": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-node/-/credential-provider-node-3.970.0.tgz",
      "integrity": "sha512-nMM0eeVuiLtw1taLRQ+H/H5Qp11rva8ILrzAQXSvlbDeVmbc7d8EeW5Q2xnCJu+3U+2JNZ1uxqIL22pB2sLEMA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/credential-provider-env": "3.970.0",
        "@aws-sdk/credential-provider-http": "3.970.0",
        "@aws-sdk/credential-provider-ini": "3.970.0",
        "@aws-sdk/credential-provider-process": "3.970.0",
        "@aws-sdk/credential-provider-sso": "3.970.0",
        "@aws-sdk/credential-provider-web-identity": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/credential-provider-imds": "^4.2.8",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/shared-ini-file-loader": "^4.4.3",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-process": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-process/-/credential-provider-process-3.970.0.tgz",
      "integrity": "sha512-0XeT8OaT9iMA62DFV9+m6mZfJhrD0WNKf4IvsIpj2Z7XbaYfz3CoDDvNoALf3rPY9NzyMHgDxOspmqdvXP00mw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/shared-ini-file-loader": "^4.4.3",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-sso": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-sso/-/credential-provider-sso-3.970.0.tgz",
      "integrity": "sha512-ROb+Aijw8nzkB14Nh2XRH861++SeTZykUzk427y8YtgTLxjAOjgDTchDUFW2Fx6GFWkSjqJ3sY7SZyb33IqyFw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/client-sso": "3.970.0",
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/token-providers": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/shared-ini-file-loader": "^4.4.3",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-web-identity": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-web-identity/-/credential-provider-web-identity-3.970.0.tgz",
      "integrity": "sha512-r7tnYJJg+B6QvnsRHSW5vDol+ks6n+5jBZdCFdGyK63hjcMRMqHx59zEH8O47UR1PFv5hS2Q3uGz6HXvVtP40Q==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/nested-clients": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/shared-ini-file-loader": "^4.4.3",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/middleware-host-header": {
      "version": "3.969.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/middleware-host-header/-/middleware-host-header-3.969.0.tgz",
      "integrity": "sha512-AWa4rVsAfBR4xqm7pybQ8sUNJYnjyP/bJjfAw34qPuh3M9XrfGbAHG0aiAfQGrBnmS28jlO6Kz69o+c6PRw1dw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/types": "3.969.0",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/middleware-logger": {
      "version": "3.969.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/middleware-logger/-/middleware-logger-3.969.0.tgz",
      "integrity": "sha512-xwrxfip7Y2iTtCMJ+iifN1E1XMOuhxIHY9DreMCvgdl4r7+48x2S1bCYPWH3eNY85/7CapBWdJ8cerpEl12sQQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/types": "3.969.0",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/middleware-recursion-detection": {
      "version": "3.969.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/middleware-recursion-detection/-/middleware-recursion-detection-3.969.0.tgz",
      "integrity": "sha512-2r3PuNquU3CcS1Am4vn/KHFwLi8QFjMdA/R+CRDXT4AFO/0qxevF/YStW3gAKntQIgWgQV8ZdEtKAoJvLI4UWg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/types": "3.969.0",
        "@aws/lambda-invoke-store": "^0.2.2",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/middleware-sdk-s3": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/middleware-sdk-s3/-/middleware-sdk-s3-3.970.0.tgz",
      "integrity": "sha512-v/Y5F1lbFFY7vMeG5yYxuhnn0CAshz6KMxkz1pDyPxejNE9HtA0w8R6OTBh/bVdIm44QpjhbI7qeLdOE/PLzXQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@aws-sdk/util-arn-parser": "3.968.0",
        "@smithy/core": "^3.20.6",
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/signature-v4": "^5.3.8",
        "@smithy/smithy-client": "^4.10.8",
        "@smithy/types": "^4.12.0",
        "@smithy/util-config-provider": "^4.2.0",
        "@smithy/util-middleware": "^4.2.8",
        "@smithy/util-stream": "^4.5.10",
        "@smithy/util-utf8": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/middleware-user-agent": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/middleware-user-agent/-/middleware-user-agent-3.970.0.tgz",
      "integrity": "sha512-dnSJGGUGSFGEX2NzvjwSefH+hmZQ347AwbLhAsi0cdnISSge+pcGfOFrJt2XfBIypwFe27chQhlfuf/gWdzpZg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@aws-sdk/util-endpoints": "3.970.0",
        "@smithy/core": "^3.20.6",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/nested-clients": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/nested-clients/-/nested-clients-3.970.0.tgz",
      "integrity": "sha512-RIl8s4DCa31MXtRFw23iU90OqEoWuwQxiZOZshzsPtjyrunhHFjyZJEqb+vuQcYd1o22SMaYa3lPJRp64OH35Q==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-crypto/sha256-browser": "5.2.0",
        "@aws-crypto/sha256-js": "5.2.0",
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/middleware-host-header": "3.969.0",
        "@aws-sdk/middleware-logger": "3.969.0",
        "@aws-sdk/middleware-recursion-detection": "3.969.0",
        "@aws-sdk/middleware-user-agent": "3.970.0",
        "@aws-sdk/region-config-resolver": "3.969.0",
        "@aws-sdk/types": "3.969.0",
        "@aws-sdk/util-endpoints": "3.970.0",
        "@aws-sdk/util-user-agent-browser": "3.969.0",
        "@aws-sdk/util-user-agent-node": "3.970.0",
        "@smithy/config-resolver": "^4.4.6",
        "@smithy/core": "^3.20.6",
        "@smithy/fetch-http-handler": "^5.3.9",
        "@smithy/hash-node": "^4.2.8",
        "@smithy/invalid-dependency": "^4.2.8",
        "@smithy/middleware-content-length": "^4.2.8",
        "@smithy/middleware-endpoint": "^4.4.7",
        "@smithy/middleware-retry": "^4.4.23",
        "@smithy/middleware-serde": "^4.2.9",
        "@smithy/middleware-stack": "^4.2.8",
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/node-http-handler": "^4.4.8",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/smithy-client": "^4.10.8",
        "@smithy/types": "^4.12.0",
        "@smithy/url-parser": "^4.2.8",
        "@smithy/util-base64": "^4.3.0",
        "@smithy/util-body-length-browser": "^4.2.0",
        "@smithy/util-body-length-node": "^4.2.1",
        "@smithy/util-defaults-mode-browser": "^4.3.22",
        "@smithy/util-defaults-mode-node": "^4.2.25",
        "@smithy/util-endpoints": "^3.2.8",
        "@smithy/util-middleware": "^4.2.8",
        "@smithy/util-retry": "^4.2.8",
        "@smithy/util-utf8": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/region-config-resolver": {
      "version": "3.969.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/region-config-resolver/-/region-config-resolver-3.969.0.tgz",
      "integrity": "sha512-scj9OXqKpcjJ4jsFLtqYWz3IaNvNOQTFFvEY8XMJXTv+3qF5I7/x9SJtKzTRJEBF3spjzBUYPtGFbs9sj4fisQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/types": "3.969.0",
        "@smithy/config-resolver": "^4.4.6",
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/signature-v4-multi-region": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/signature-v4-multi-region/-/signature-v4-multi-region-3.970.0.tgz",
      "integrity": "sha512-z3syXfuK/x/IsKf/AeYmgc2NT7fcJ+3fHaGO+fkghkV9WEba3fPyOwtTBX4KpFMNb2t50zDGZwbzW1/5ighcUQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/middleware-sdk-s3": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/signature-v4": "^5.3.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/token-providers": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/token-providers/-/token-providers-3.970.0.tgz",
      "integrity": "sha512-YO8KgJecxHIFMhfoP880q51VXFL9V1ELywK5yzVEqzyrwqoG93IUmnTygBUylQrfkbH+QqS0FxEdgwpP3fcwoQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "3.970.0",
        "@aws-sdk/nested-clients": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/shared-ini-file-loader": "^4.4.3",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/types": {
      "version": "3.969.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/types/-/types-3.969.0.tgz",
      "integrity": "sha512-7IIzM5TdiXn+VtgPdVLjmE6uUBUtnga0f4RiSEI1WW10RPuNvZ9U+pL3SwDiRDAdoGrOF9tSLJOFZmfuwYuVYQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/util-arn-parser": {
      "version": "3.968.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/util-arn-parser/-/util-arn-parser-3.968.0.tgz",
      "integrity": "sha512-gqqvYcitIIM2K4lrDX9de9YvOfXBcVdxfT/iLnvHJd4YHvSXlt+gs+AsL4FfPCxG4IG9A+FyulP9Sb1MEA75vw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/util-endpoints": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/util-endpoints/-/util-endpoints-3.970.0.tgz",
      "integrity": "sha512-TZNZqFcMUtjvhZoZRtpEGQAdULYiy6rcGiXAbLU7e9LSpIYlRqpLa207oMNfgbzlL2PnHko+eVg8rajDiSOYCg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/types": "3.969.0",
        "@smithy/types": "^4.12.0",
        "@smithy/url-parser": "^4.2.8",
        "@smithy/util-endpoints": "^3.2.8",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/util-locate-window": {
      "version": "3.965.2",
      "resolved": "https://registry.npmjs.org/@aws-sdk/util-locate-window/-/util-locate-window-3.965.2.tgz",
      "integrity": "sha512-qKgO7wAYsXzhwCHhdbaKFyxd83Fgs8/1Ka+jjSPrv2Ll7mB55Wbwlo0kkfMLh993/yEc8aoDIAc1Fz9h4Spi4Q==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/util-user-agent-browser": {
      "version": "3.969.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/util-user-agent-browser/-/util-user-agent-browser-3.969.0.tgz",
      "integrity": "sha512-bpJGjuKmFr0rA6UKUCmN8D19HQFMLXMx5hKBXqBlPFdalMhxJSjcxzX9DbQh0Fn6bJtxCguFmRGOBdQqNOt49g==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/types": "3.969.0",
        "@smithy/types": "^4.12.0",
        "bowser": "^2.11.0",
        "tslib": "^2.6.2"
      }
    },
    "node_modules/@aws-sdk/util-user-agent-node": {
      "version": "3.970.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/util-user-agent-node/-/util-user-agent-node-3.970.0.tgz",
      "integrity": "sha512-TNQpwIVD6SxMwkD+QKnaujKVyXy5ljN3O3jrI7nCHJ3GlJu5xJrd8yuBnanYCcrn3e2zwdfOh4d4zJAZvvIvVw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/middleware-user-agent": "3.970.0",
        "@aws-sdk/types": "3.969.0",
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "aws-crt": ">=1.0.0"
      },
      "peerDependenciesMeta": {
        "aws-crt": {
          "optional": true
        }
      }
    },
    "node_modules/@aws-sdk/xml-builder": {
      "version": "3.969.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/xml-builder/-/xml-builder-3.969.0.tgz",
      "integrity": "sha512-BSe4Lx/qdRQQdX8cSSI7Et20vqBspzAjBy8ZmXVoyLkol3y4sXBXzn+BiLtR+oh60ExQn6o2DU4QjdOZbXaKIQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "fast-xml-parser": "5.2.5",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws/lambda-invoke-store": {
      "version": "0.2.3",
      "resolved": "https://registry.npmjs.org/@aws/lambda-invoke-store/-/lambda-invoke-store-0.2.3.tgz",
      "integrity": "sha512-oLvsaPMTBejkkmHhjf09xTgk71mOqyr/409NKhRIL08If7AhVfUsJhVsx386uJaqNd42v9kWamQ9lFbkoC2dYw==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@babel/code-frame": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.28.6.tgz",
      "integrity": "sha512-JYgintcMjRiCvS8mMECzaEn+m3PfoQiyqukOMCCVQtoJGYJw8j/8LBJEiqkHLkfwCcs74E3pbAUFNg7d9VNJ+Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.28.5",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.1.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.28.6.tgz",
      "integrity": "sha512-2lfu57JtzctfIrcGMz992hyLlByuzgIk58+hhGCxjKZ3rWI82NnVLjXcaTqkI2NvlcvOskZaiZ5kjUALo3Lpxg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.28.6.tgz",
      "integrity": "sha512-H3mcG6ZDLTlYfaSNi0iOKkigqMFvkTKlGUYlD8GW7nNOYRrevuA46iTypPyv+06V3fEmvvazfntkBU34L0azAw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.28.6",
        "@babel/generator": "^7.28.6",
        "@babel/helper-compilation-targets": "^7.28.6",
        "@babel/helper-module-transforms": "^7.28.6",
        "@babel/helpers": "^7.28.6",
        "@babel/parser": "^7.28.6",
        "@babel/template": "^7.28.6",
        "@babel/traverse": "^7.28.6",
        "@babel/types": "^7.28.6",
        "@jridgewell/remapping": "^2.3.5",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/core/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.28.6.tgz",
      "integrity": "sha512-lOoVRwADj8hjf7al89tvQ2a1lf53Z+7tiXMgpZJL3maQPDxh0DgLMN62B2MKUOFcoodBHLMbDM6WAbKgNy5Suw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.28.6",
        "@babel/types": "^7.28.6",
        "@jridgewell/gen-mapping": "^0.3.12",
        "@jridgewell/trace-mapping": "^0.3.28",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.28.6.tgz",
      "integrity": "sha512-JYtls3hqi15fcx5GaSNL7SCTJ2MNmjrkHXg4FSpOA/grxK8KwyZ5bubHsCq8FXCkua6xhuaaBit+3b7+VZRfcA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.28.6",
        "@babel/helper-validator-option": "^7.27.1",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/@babel/helper-globals": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/helper-globals/-/helper-globals-7.28.0.tgz",
      "integrity": "sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.28.6.tgz",
      "integrity": "sha512-l5XkZK7r7wa9LucGw9LwZyyCUscb4x37JWTPz7swwFE/0FMQAGpiWUZn8u9DzkSBWEcK25jmvubfpw2dnAMdbw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.28.6",
        "@babel/types": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.28.6.tgz",
      "integrity": "sha512-67oXFAYr2cDLDVGLXTEABjdBJZ6drElUSI7WKp70NrpyISso3plG9SAGEF6y7zbha/wOzUByWWTJvEDVNIUGcA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.28.6",
        "@babel/helper-validator-identifier": "^7.28.5",
        "@babel/traverse": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.27.1.tgz",
      "integrity": "sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.28.5.tgz",
      "integrity": "sha512-qSs4ifwzKJSV39ucNjsvc6WVHs6b7S03sOh2OcHF9UHfVPqWWALUsNUVzhSBiItjRZoLHx7nIarVjqKVusUZ1Q==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.27.1.tgz",
      "integrity": "sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helpers": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helpers/-/helpers-7.28.6.tgz",
      "integrity": "sha512-xOBvwq86HHdB7WUDTfKfT/Vuxh7gElQ+Sfti2Cy6yIWNW05P8iUslOVcZ4/sKbE+/jQaukQAdz/gf3724kYdqw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/template": "^7.28.6",
        "@babel/types": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.28.6.tgz",
      "integrity": "sha512-TeR9zWR18BvbfPmGbLampPMW+uW1NZnJlRuuHso8i87QZNq2JRF9i6RgxRqtEq+wQGsS19NNTWr2duhnE49mfQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.28.6"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/template": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/template/-/template-7.28.6.tgz",
      "integrity": "sha512-YA6Ma2KsCdGb+WC6UpBVFJGXL58MDA6oyONbjyF/+5sBgxY/dwkhLogbMT2GXXyU84/IhRw/2D1Os1B/giz+BQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.28.6",
        "@babel/parser": "^7.28.6",
        "@babel/types": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/traverse": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/traverse/-/traverse-7.28.6.tgz",
      "integrity": "sha512-fgWX62k02qtjqdSNTAGxmKYY/7FSL9WAS1o2Hu5+I5m9T0yxZzr4cnrfXQ/MX0rIifthCSs6FKTlzYbJcPtMNg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.28.6",
        "@babel/generator": "^7.28.6",
        "@babel/helper-globals": "^7.28.0",
        "@babel/parser": "^7.28.6",
        "@babel/template": "^7.28.6",
        "@babel/types": "^7.28.6",
        "debug": "^4.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/types": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/types/-/types-7.28.6.tgz",
      "integrity": "sha512-0ZrskXVEHSWIqZM/sQZ4EV3jZJXRkio/WCxaqKZP1g//CEWEPSfeZFcms4XeKBCHU0ZKnIkdJeU/kF+eRp5lBg==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-string-parser": "^7.27.1",
        "@babel/helper-validator-identifier": "^7.28.5"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@cspotcode/source-map-support": {
      "version": "0.8.1",
      "resolved": "https://registry.npmjs.org/@cspotcode/source-map-support/-/source-map-support-0.8.1.tgz",
      "integrity": "sha512-IchNf6dN4tHoMFIn/7OE8LWZ19Y6q/67Bmf6vnGREv8RSbBVb9LPJxEcnwrcwX6ixSvaiGoomAUvu4YSxXrVgw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/trace-mapping": "0.3.9"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@cspotcode/source-map-support/node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.9",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.9.tgz",
      "integrity": "sha512-3Belt6tdc8bPgAtbcmdtNJlirVoTmEb5e2gC94PnkwEW9jI6CAHUeoG85tjWP5WquqfavoMtMwiG4P926ZKKuQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.0.3",
        "@jridgewell/sourcemap-codec": "^1.4.10"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.23.1",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.23.1.tgz",
      "integrity": "sha512-YsS2e3Wtgnw7Wq53XXBLcV6JhRsEq8hkfg91ESVadIrzr9wO6jJDMZnCQbHm1Guc5t/CdDiFSSfWP58FNuvT3Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@eslint-community/eslint-utils": {
      "version": "4.9.1",
      "resolved": "https://registry.npmjs.org/@eslint-community/eslint-utils/-/eslint-utils-4.9.1.tgz",
      "integrity": "sha512-phrYmNiYppR7znFEdqgfWHXR6NCkZEK7hwWDHZUjit/2/U0r6XvkDl0SYnoM51Hq7FhCGdLDT6zxCCOY1hexsQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "eslint-visitor-keys": "^3.4.3"
      },
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      },
      "peerDependencies": {
        "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0"
      }
    },
    "node_modules/@eslint-community/regexpp": {
      "version": "4.12.2",
      "resolved": "https://registry.npmjs.org/@eslint-community/regexpp/-/regexpp-4.12.2.tgz",
      "integrity": "sha512-EriSTlt5OC9/7SXkRSCAhfSxxoSUgBm33OH+IkwbdpgoqsSsUg7y3uh+IICI/Qg4BBWr3U2i39RpmycbxMq4ew==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^12.0.0 || ^14.0.0 || >=16.0.0"
      }
    },
    "node_modules/@eslint/config-array": {
      "version": "0.21.1",
      "resolved": "https://registry.npmjs.org/@eslint/config-array/-/config-array-0.21.1.tgz",
      "integrity": "sha512-aw1gNayWpdI/jSYVgzN5pL0cfzU02GT3NBpeT/DXbx1/1x7ZKxFPd9bwrzygx/qiwIQiJ1sw/zD8qY/kRvlGHA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/object-schema": "^2.1.7",
        "debug": "^4.3.1",
        "minimatch": "^3.1.2"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/config-array/node_modules/brace-expansion": {
      "version": "1.1.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.12.tgz",
      "integrity": "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/@eslint/config-array/node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/@eslint/config-helpers": {
      "version": "0.4.2",
      "resolved": "https://registry.npmjs.org/@eslint/config-helpers/-/config-helpers-0.4.2.tgz",
      "integrity": "sha512-gBrxN88gOIf3R7ja5K9slwNayVcZgK6SOUORm2uBzTeIEfeVaIhOpCtTox3P6R7o2jLFwLFTLnC7kU/RGcYEgw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.17.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/core": {
      "version": "0.17.0",
      "resolved": "https://registry.npmjs.org/@eslint/core/-/core-0.17.0.tgz",
      "integrity": "sha512-yL/sLrpmtDaFEiUj1osRP4TI2MDz1AddJL+jZ7KSqvBuliN4xqYY54IfdN8qD8Toa6g1iloph1fxQNkjOxrrpQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@types/json-schema": "^7.0.15"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/eslintrc": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/@eslint/eslintrc/-/eslintrc-3.3.3.tgz",
      "integrity": "sha512-Kr+LPIUVKz2qkx1HAMH8q1q6azbqBAsXJUxBl/ODDuVPX45Z9DfwB8tPjTi6nNZ8BuM3nbJxC5zCAg5elnBUTQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ajv": "^6.12.4",
        "debug": "^4.3.2",
        "espree": "^10.0.1",
        "globals": "^14.0.0",
        "ignore": "^5.2.0",
        "import-fresh": "^3.2.1",
        "js-yaml": "^4.1.1",
        "minimatch": "^3.1.2",
        "strip-json-comments": "^3.1.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/brace-expansion": {
      "version": "1.1.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.12.tgz",
      "integrity": "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/@eslint/js": {
      "version": "9.39.2",
      "resolved": "https://registry.npmjs.org/@eslint/js/-/js-9.39.2.tgz",
      "integrity": "sha512-q1mjIoW1VX4IvSocvM/vbTiveKC4k9eLrajNEuSsmjymSDEbpGddtpfOoN7YGAqBK3NG+uqo8ia4PDTt8buCYA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      }
    },
    "node_modules/@eslint/object-schema": {
      "version": "2.1.7",
      "resolved": "https://registry.npmjs.org/@eslint/object-schema/-/object-schema-2.1.7.tgz",
      "integrity": "sha512-VtAOaymWVfZcmZbp6E2mympDIHvyjXs/12LqWYjVw6qjrfF+VK+fyG33kChz3nnK+SU5/NeHOqrTEHS8sXO3OA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/plugin-kit": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/@eslint/plugin-kit/-/plugin-kit-0.4.1.tgz",
      "integrity": "sha512-43/qtrDUokr7LJqoF2c3+RInu/t4zfrpYdoSDfYyhg52rwLV6TnOvdG4fXm7IkSB3wErkcmJS9iEhjVtOSEjjA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.17.0",
        "levn": "^0.4.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@hapi/hoek": {
      "version": "9.3.0",
      "resolved": "https://registry.npmjs.org/@hapi/hoek/-/hoek-9.3.0.tgz",
      "integrity": "sha512-/c6rf4UJlmHlC9b5BaNvzAcFv7HZ2QHaV0D4/HNlBdvFnvQq8RI4kYdhyPCl7Xj+oWvTWQ8ujhqS53LIgAe6KQ==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@hapi/topo": {
      "version": "5.1.0",
      "resolved": "https://registry.npmjs.org/@hapi/topo/-/topo-5.1.0.tgz",
      "integrity": "sha512-foQZKJig7Ob0BMAYBfcJk8d77QtOe7Wo4ox7ff1lQYoNNAb6jwcY1ncdoy2e9wQZzvNy7ODZCYJkK8kzmcAnAg==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "@hapi/hoek": "^9.0.0"
      }
    },
    "node_modules/@hexagon/base64": {
      "version": "1.1.28",
      "resolved": "https://registry.npmjs.org/@hexagon/base64/-/base64-1.1.28.tgz",
      "integrity": "sha512-lhqDEAvWixy3bZ+UOYbPwUbBkwBq5C1LAJ/xPC8Oi+lL54oyakv/npbA0aU2hgCsx/1NUd4IBvV03+aUBWxerw==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/@humanfs/core": {
      "version": "0.19.1",
      "resolved": "https://registry.npmjs.org/@humanfs/core/-/core-0.19.1.tgz",
      "integrity": "sha512-5DyQ4+1JEUzejeK1JGICcideyfUbGixgS9jNgex5nqkW+cY7WZhxBigmieN5Qnw9ZosSNVC9KQKyb+GUaGyKUA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/node": {
      "version": "0.16.7",
      "resolved": "https://registry.npmjs.org/@humanfs/node/-/node-0.16.7.tgz",
      "integrity": "sha512-/zUx+yOsIrG4Y43Eh2peDeKCxlRt/gET6aHfaKpuq267qXdYDFViVHfMaLyygZOnl0kGWxFIgsBy8QFuTLUXEQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/core": "^0.19.1",
        "@humanwhocodes/retry": "^0.4.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanwhocodes/module-importer": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/module-importer/-/module-importer-1.0.1.tgz",
      "integrity": "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=12.22"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@humanwhocodes/retry": {
      "version": "0.4.3",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.4.3.tgz",
      "integrity": "sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@img/colour": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/@img/colour/-/colour-1.0.0.tgz",
      "integrity": "sha512-A5P/LfWGFSl6nsckYtjw9da+19jB8hkJ6ACTGcDfEJ0aE+l2n2El7dsVM7UVHZQ9s2lmYMWlrS21YLy2IR1LUw==",
      "license": "MIT",
      "optional": true,
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@img/sharp-darwin-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-arm64/-/sharp-darwin-arm64-0.34.5.tgz",
      "integrity": "sha512-imtQ3WMJXbMY4fxb/Ndp6HBTNVtWCUI0WdobyheGf5+ad6xX8VIDO8u2xE4qc/fr08CKG/7dDseFtn6M6g/r3w==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-arm64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-libvips-darwin-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-arm64/-/sharp-libvips-darwin-arm64-1.2.4.tgz",
      "integrity": "sha512-zqjjo7RatFfFoP0MkQ51jfuFZBnVE2pRiaydKJ1G/rHZvnsrHAOcQALIi9sA5co5xenQdTugCvtb1cuf78Vf4g==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.13",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/remapping": {
      "version": "2.3.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/remapping/-/remapping-2.3.5.tgz",
      "integrity": "sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.5.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.5.tgz",
      "integrity": "sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.31",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.31.tgz",
      "integrity": "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@levischuck/tiny-cbor": {
      "version": "0.2.11",
      "resolved": "https://registry.npmjs.org/@levischuck/tiny-cbor/-/tiny-cbor-0.2.11.tgz",
      "integrity": "sha512-llBRm4dT4Z89aRsm6u2oEZ8tfwL/2l6BwpZ7JcyieouniDECM5AqNgr/y08zalEIvW3RSK4upYyybDcmjXqAow==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/@napi-rs/canvas": {
      "version": "0.1.80",
      "resolved": "https://registry.npmjs.org/@napi-rs/canvas/-/canvas-0.1.80.tgz",
      "integrity": "sha512-DxuT1ClnIPts1kQx8FBmkk4BQDTfI5kIzywAaMjQSXfNnra5UFU9PwurXrl+Je3bJ6BGsp/zmshVVFbCmyI+ww==",
      "license": "MIT",
      "workspaces": [
        "e2e/*"
      ],
      "engines": {
        "node": ">= 10"
      },
      "optionalDependencies": {
        "@napi-rs/canvas-android-arm64": "0.1.80",
        "@napi-rs/canvas-darwin-arm64": "0.1.80",
        "@napi-rs/canvas-darwin-x64": "0.1.80",
        "@napi-rs/canvas-linux-arm-gnueabihf": "0.1.80",
        "@napi-rs/canvas-linux-arm64-gnu": "0.1.80",
        "@napi-rs/canvas-linux-arm64-musl": "0.1.80",
        "@napi-rs/canvas-linux-riscv64-gnu": "0.1.80",
        "@napi-rs/canvas-linux-x64-gnu": "0.1.80",
        "@napi-rs/canvas-linux-x64-musl": "0.1.80",
        "@napi-rs/canvas-win32-x64-msvc": "0.1.80"
      }
    },
    "node_modules/@napi-rs/canvas-darwin-arm64": {
      "version": "0.1.80",
      "resolved": "https://registry.npmjs.org/@napi-rs/canvas-darwin-arm64/-/canvas-darwin-arm64-0.1.80.tgz",
      "integrity": "sha512-O64APRTXRUiAz0P8gErkfEr3lipLJgM6pjATwavZ22ebhjYl/SUbpgM0xcWPQBNMP1n29afAC/Us5PX1vg+JNQ==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/env": {
      "version": "16.1.2",
      "resolved": "https://registry.npmjs.org/@next/env/-/env-16.1.2.tgz",
      "integrity": "sha512-r6TpLovDTvWtzw11UubUQxEK6IduT8rSAHbGX68yeFpA/1Oq9R4ovi5nqMUMgPN0jr2SpfeyFRbTZg3Inuuv3g==",
      "license": "MIT"
    },
    "node_modules/@next/eslint-plugin-next": {
      "version": "16.0.3",
      "resolved": "https://registry.npmjs.org/@next/eslint-plugin-next/-/eslint-plugin-next-16.0.3.tgz",
      "integrity": "sha512-6sPWmZetzFWMsz7Dhuxsdmbu3fK+/AxKRtj7OB0/3OZAI2MHB/v2FeYh271LZ9abvnM1WIwWc/5umYjx0jo5sQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-glob": "3.3.1"
      }
    },
    "node_modules/@next/eslint-plugin-next/node_modules/fast-glob": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/fast-glob/-/fast-glob-3.3.1.tgz",
      "integrity": "sha512-kNFPyjhh5cKjrUltxs+wFx+ZkbRaxxmZ+X0ZU31SOsxCEtP9VPgtq2teZw1DebupL5GmDaNQ6yKMMVcM41iqDg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "^2.0.2",
        "@nodelib/fs.walk": "^1.2.3",
        "glob-parent": "^5.1.2",
        "merge2": "^1.3.0",
        "micromatch": "^4.0.4"
      },
      "engines": {
        "node": ">=8.6.0"
      }
    },
    "node_modules/@next/eslint-plugin-next/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/@next/swc-darwin-arm64": {
      "version": "16.1.2",
      "resolved": "https://registry.npmjs.org/@next/swc-darwin-arm64/-/swc-darwin-arm64-16.1.2.tgz",
      "integrity": "sha512-0N2baysDpTXASTVxTV+DkBnD97bo9PatUj8sHlKA+oR9CyvReaPQchQyhCbH0Jm0mC/Oka5F52intN+lNOhSlA==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-darwin-x64": {
      "version": "16.1.2",
      "resolved": "https://registry.npmjs.org/@next/swc-darwin-x64/-/swc-darwin-x64-16.1.2.tgz",
      "integrity": "sha512-Q0wnSK0lmeC9ps+/w/bDsMSF3iWS45WEwF1bg8dvMH3CmKB2BV4346tVrjWxAkrZq20Ro6Of3R19IgrEJkXKyw==",
      "cpu": [
        "x64"
      ],
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-arm64-gnu": {
      "version": "16.1.2",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-gnu/-/swc-linux-arm64-gnu-16.1.2.tgz",
      "integrity": "sha512-4twW+h7ZatGKWq+2pUQ9SDiin6kfZE/mY+D8jOhSZ0NDzKhQfAPReXqwTDWVrNjvLzHzOcDL5kYjADHfXL/b/Q==",
      "cpu": [
        "arm64"
      ],
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-arm64-musl": {
      "version": "16.1.2",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-musl/-/swc-linux-arm64-musl-16.1.2.tgz",
      "integrity": "sha512-Sn6LxPIZcADe5AnqqMCfwBv6vRtDikhtrjwhu+19WM6jHZe31JDRcGuPZAlJrDk6aEbNBPUUAKmySJELkBOesg==",
      "cpu": [
        "arm64"
      ],
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-x64-gnu": {
      "version": "16.1.2",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-gnu/-/swc-linux-x64-gnu-16.1.2.tgz",
      "integrity": "sha512-nwzesEQBfQIOOnQ7JArzB08w9qwvBQ7nC1i8gb0tiEFH94apzQM3IRpY19MlE8RBHxc9ArG26t1DEg2aaLaqVQ==",
      "cpu": [
        "x64"
      ],
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-x64-musl": {
      "version": "16.1.2",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-musl/-/swc-linux-x64-musl-16.1.2.tgz",
      "integrity": "sha512-s60bLf16BDoICQHeKEm0lDgUNMsL1UpQCkRNZk08ZNnRpK0QUV+6TvVHuBcIA7oItzU0m7kVmXe8QjXngYxJVA==",
      "cpu": [
        "x64"
      ],
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-win32-arm64-msvc": {
      "version": "16.1.2",
      "resolved": "https://registry.npmjs.org/@next/swc-win32-arm64-msvc/-/swc-win32-arm64-msvc-16.1.2.tgz",
      "integrity": "sha512-Sq8k4SZd8Y8EokKdz304TvMO9HoiwGzo0CTacaiN1bBtbJSQ1BIwKzNFeFdxOe93SHn1YGnKXG6Mq3N+tVooyQ==",
      "cpu": [
        "arm64"
      ],
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-win32-x64-msvc": {
      "version": "16.1.2",
      "resolved": "https://registry.npmjs.org/@next/swc-win32-x64-msvc/-/swc-win32-x64-msvc-16.1.2.tgz",
      "integrity": "sha512-KQDBwspSaNX5/wwt6p7ed5oINJWIxcgpuqJdDNubAyq7dD+ZM76NuEjg8yUxNOl5R4NNgbMfqE/RyNrsbYmOKg==",
      "cpu": [
        "x64"
      ],
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@nodelib/fs.scandir": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.scandir/-/fs.scandir-2.1.5.tgz",
      "integrity": "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "2.0.5",
        "run-parallel": "^1.1.9"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.stat": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.stat/-/fs.stat-2.0.5.tgz",
      "integrity": "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.walk": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.walk/-/fs.walk-1.2.8.tgz",
      "integrity": "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.scandir": "2.1.5",
        "fastq": "^1.6.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nolyfill/is-core-module": {
      "version": "1.0.39",
      "resolved": "https://registry.npmjs.org/@nolyfill/is-core-module/-/is-core-module-1.0.39.tgz",
      "integrity": "sha512-nn5ozdjYQpUCZlWGuxcJY/KpxkWQs4DcbMCmKojjyrYDEAGy4Ce19NN4v5MduafTwJlbKc99UA8YhSVqq9yPZA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.4.0"
      }
    },
    "node_modules/@panva/hkdf": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@panva/hkdf/-/hkdf-1.2.1.tgz",
      "integrity": "sha512-6oclG6Y3PiDFcoyk8srjLfVKyMfVCKJ27JwNPViuXziFpmdz+MZnZN/aKY0JGXgYuO/VghU0jcOAZgWXZ1Dmrw==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/panva"
      }
    },
    "node_modules/@peculiar/asn1-android": {
      "version": "2.6.0",
      "resolved": "https://registry.npmjs.org/@peculiar/asn1-android/-/asn1-android-2.6.0.tgz",
      "integrity": "sha512-cBRCKtYPF7vJGN76/yG8VbxRcHLPF3HnkoHhKOZeHpoVtbMYfY9ROKtH3DtYUY9m8uI1Mh47PRhHf2hSK3xcSQ==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "@peculiar/asn1-schema": "^2.6.0",
        "asn1js": "^3.0.6",
        "tslib": "^2.8.1"
      }
    },
    "node_modules/@peculiar/asn1-ecc": {
      "version": "2.6.0",
      "resolved": "https://registry.npmjs.org/@peculiar/asn1-ecc/-/asn1-ecc-2.6.0.tgz",
      "integrity": "sha512-FF3LMGq6SfAOwUG2sKpPXblibn6XnEIKa+SryvUl5Pik+WR9rmRA3OCiwz8R3lVXnYnyRkSZsSLdml8H3UiOcw==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "@peculiar/asn1-schema": "^2.6.0",
        "@peculiar/asn1-x509": "^2.6.0",
        "asn1js": "^3.0.6",
        "tslib": "^2.8.1"
      }
    },
    "node_modules/@peculiar/asn1-rsa": {
      "version": "2.6.0",
      "resolved": "https://registry.npmjs.org/@peculiar/asn1-rsa/-/asn1-rsa-2.6.0.tgz",
      "integrity": "sha512-Nu4C19tsrTsCp9fDrH+sdcOKoVfdfoQQ7S3VqjJU6vedR7tY3RLkQ5oguOIB3zFW33USDUuYZnPEQYySlgha4w==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "@peculiar/asn1-schema": "^2.6.0",
        "@peculiar/asn1-x509": "^2.6.0",
        "asn1js": "^3.0.6",
        "tslib": "^2.8.1"
      }
    },
    "node_modules/@peculiar/asn1-schema": {
      "version": "2.6.0",
      "resolved": "https://registry.npmjs.org/@peculiar/asn1-schema/-/asn1-schema-2.6.0.tgz",
      "integrity": "sha512-xNLYLBFTBKkCzEZIw842BxytQQATQv+lDTCEMZ8C196iJcJJMBUZxrhSTxLaohMyKK8QlzRNTRkUmanucnDSqg==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "asn1js": "^3.0.6",
        "pvtsutils": "^1.3.6",
        "tslib": "^2.8.1"
      }
    },
    "node_modules/@peculiar/asn1-x509": {
      "version": "2.6.0",
      "resolved": "https://registry.npmjs.org/@peculiar/asn1-x509/-/asn1-x509-2.6.0.tgz",
      "integrity": "sha512-uzYbPEpoQiBoTq0/+jZtpM6Gq6zADBx+JNFP3yqRgziWBxQ/Dt/HcuvRfm9zJTPdRcBqPNdaRHTVwpyiq6iNMA==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "@peculiar/asn1-schema": "^2.6.0",
        "asn1js": "^3.0.6",
        "pvtsutils": "^1.3.6",
        "tslib": "^2.8.1"
      }
    },
    "node_modules/@prisma/client": {
      "version": "6.19.2",
      "resolved": "https://registry.npmjs.org/@prisma/client/-/client-6.19.2.tgz",
      "integrity": "sha512-gR2EMvfK/aTxsuooaDA32D8v+us/8AAet+C3J1cc04SW35FPdZYgLF+iN4NDLUgAaUGTKdAB0CYenu1TAgGdMg==",
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "peerDependencies": {
        "prisma": "*",
        "typescript": ">=5.1.0"
      },
      "peerDependenciesMeta": {
        "prisma": {
          "optional": true
        },
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@prisma/config": {
      "version": "6.19.2",
      "resolved": "https://registry.npmjs.org/@prisma/config/-/config-6.19.2.tgz",
      "integrity": "sha512-kadBGDl+aUswv/zZMk9Mx0C8UZs1kjao8H9/JpI4Wh4SHZaM7zkTwiKn/iFLfRg+XtOAo/Z/c6pAYhijKl0nzQ==",
      "devOptional": true,
      "license": "Apache-2.0",
      "dependencies": {
        "c12": "3.1.0",
        "deepmerge-ts": "7.1.5",
        "effect": "3.18.4",
        "empathic": "2.0.0"
      }
    },
    "node_modules/@prisma/debug": {
      "version": "6.19.2",
      "resolved": "https://registry.npmjs.org/@prisma/debug/-/debug-6.19.2.tgz",
      "integrity": "sha512-lFnEZsLdFLmEVCVNdskLDCL8Uup41GDfU0LUfquw+ercJC8ODTuL0WNKgOKmYxCJVvFwf0OuZBzW99DuWmoH2A==",
      "devOptional": true,
      "license": "Apache-2.0"
    },
    "node_modules/@prisma/engines": {
      "version": "6.19.2",
      "resolved": "https://registry.npmjs.org/@prisma/engines/-/engines-6.19.2.tgz",
      "integrity": "sha512-TTkJ8r+uk/uqczX40wb+ODG0E0icVsMgwCTyTHXehaEfb0uo80M9g1aW1tEJrxmFHeOZFXdI2sTA1j1AgcHi4A==",
      "devOptional": true,
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@prisma/debug": "6.19.2",
        "@prisma/engines-version": "7.1.1-3.c2990dca591cba766e3b7ef5d9e8a84796e47ab7",
        "@prisma/fetch-engine": "6.19.2",
        "@prisma/get-platform": "6.19.2"
      }
    },
    "node_modules/@prisma/engines-version": {
      "version": "7.1.1-3.c2990dca591cba766e3b7ef5d9e8a84796e47ab7",
      "resolved": "https://registry.npmjs.org/@prisma/engines-version/-/engines-version-7.1.1-3.c2990dca591cba766e3b7ef5d9e8a84796e47ab7.tgz",
      "integrity": "sha512-03bgb1VD5gvuumNf+7fVGBzfpJPjmqV423l/WxsWk2cNQ42JD0/SsFBPhN6z8iAvdHs07/7ei77SKu7aZfq8bA==",
      "devOptional": true,
      "license": "Apache-2.0"
    },
    "node_modules/@prisma/fetch-engine": {
      "version": "6.19.2",
      "resolved": "https://registry.npmjs.org/@prisma/fetch-engine/-/fetch-engine-6.19.2.tgz",
      "integrity": "sha512-h4Ff4Pho+SR1S8XerMCC12X//oY2bG3Iug/fUnudfcXEUnIeRiBdXHFdGlGOgQ3HqKgosTEhkZMvGM9tWtYC+Q==",
      "devOptional": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@prisma/debug": "6.19.2",
        "@prisma/engines-version": "7.1.1-3.c2990dca591cba766e3b7ef5d9e8a84796e47ab7",
        "@prisma/get-platform": "6.19.2"
      }
    },
    "node_modules/@prisma/get-platform": {
      "version": "6.19.2",
      "resolved": "https://registry.npmjs.org/@prisma/get-platform/-/get-platform-6.19.2.tgz",
      "integrity": "sha512-PGLr06JUSTqIvztJtAzIxOwtWKtJm5WwOG6xpsgD37Rc84FpfUBGLKz65YpJBGtkRQGXTYEFie7pYALocC3MtA==",
      "devOptional": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@prisma/debug": "6.19.2"
      }
    },
    "node_modules/@radix-ui/react-compose-refs": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-compose-refs/-/react-compose-refs-1.1.2.tgz",
      "integrity": "sha512-z4eqJvfiNnFMHIIvXP3CY57y2WJs5g2v3X0zm9mEJkrkNv4rDxu+sg9Jh8EkXyeqBkB7SOcboo9dMVqhyrACIg==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-slot": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-slot/-/react-slot-1.2.4.tgz",
      "integrity": "sha512-Jl+bCv8HxKnlTLVrcDE8zTMJ09R9/ukw4qBs/oZClOfoQk/cOTbDn+NceXfV7j09YPVQUryJPHurafcSg6EVKA==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-compose-refs": "1.1.2"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@rtsao/scc": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@rtsao/scc/-/scc-1.1.0.tgz",
      "integrity": "sha512-zt6OdqaDoOnJ1ZYsCYGt9YmWzDXl4vQdKTyJev62gFhRGKdx7mcT54V9KIjg+d2wi9EXsPvAPKe7i7WjfVWB8g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@sideway/address": {
      "version": "4.1.5",
      "resolved": "https://registry.npmjs.org/@sideway/address/-/address-4.1.5.tgz",
      "integrity": "sha512-IqO/DUQHUkPeixNQ8n0JA6102hT9CmaljNTPmQ1u8MEhBo/R4Q8eKLN/vGZxuebwOroDB4cbpjheD4+/sKFK4Q==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "@hapi/hoek": "^9.0.0"
      }
    },
    "node_modules/@sideway/formula": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/@sideway/formula/-/formula-3.0.1.tgz",
      "integrity": "sha512-/poHZJJVjx3L+zVD6g9KgHfYnb443oi7wLu/XKojDviHy6HOEOA6z1Trk5aR1dGcmPenJEgb2sK2I80LeS3MIg==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@sideway/pinpoint": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/@sideway/pinpoint/-/pinpoint-2.0.0.tgz",
      "integrity": "sha512-RNiOoTPkptFtSVzQevY/yWtZwf/RxyVnPy/OcA9HBM3MlGDnBEYL5B41H0MTn0Uec8Hi+2qUtTfG2WWZBmMejQ==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@simplewebauthn/server": {
      "version": "9.0.3",
      "resolved": "https://registry.npmjs.org/@simplewebauthn/server/-/server-9.0.3.tgz",
      "integrity": "sha512-FMZieoBosrVLFxCnxPFD9Enhd1U7D8nidVDT4MsHc6l4fdVcjoeHjDueeXCloO1k5O/fZg1fsSXXPKbY2XTzDA==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "@hexagon/base64": "^1.1.27",
        "@levischuck/tiny-cbor": "^0.2.2",
        "@peculiar/asn1-android": "^2.3.10",
        "@peculiar/asn1-ecc": "^2.3.8",
        "@peculiar/asn1-rsa": "^2.3.8",
        "@peculiar/asn1-schema": "^2.3.8",
        "@peculiar/asn1-x509": "^2.3.8",
        "@simplewebauthn/types": "^9.0.1",
        "cross-fetch": "^4.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/@simplewebauthn/types": {
      "version": "9.0.1",
      "resolved": "https://registry.npmjs.org/@simplewebauthn/types/-/types-9.0.1.tgz",
      "integrity": "sha512-tGSRP1QvsAvsJmnOlRQyw/mvK9gnPtjEc5fg2+m8n+QUa+D7rvrKkOYyfpy42GTs90X3RDOnqJgfHt+qO67/+w==",
      "deprecated": "Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/@smithy/abort-controller": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/abort-controller/-/abort-controller-4.2.8.tgz",
      "integrity": "sha512-peuVfkYHAmS5ybKxWcfraK7WBBP0J+rkfUcbHJJKQ4ir3UAUNQI+Y4Vt/PqSzGqgloJ5O1dk7+WzNL8wcCSXbw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/config-resolver": {
      "version": "4.4.6",
      "resolved": "https://registry.npmjs.org/@smithy/config-resolver/-/config-resolver-4.4.6.tgz",
      "integrity": "sha512-qJpzYC64kaj3S0fueiu3kXm8xPrR3PcXDPEgnaNMRn0EjNSZFoFjvbUp0YUDsRhN1CB90EnHJtbxWKevnH99UQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/types": "^4.12.0",
        "@smithy/util-config-provider": "^4.2.0",
        "@smithy/util-endpoints": "^3.2.8",
        "@smithy/util-middleware": "^4.2.8",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/core": {
      "version": "3.20.6",
      "resolved": "https://registry.npmjs.org/@smithy/core/-/core-3.20.6.tgz",
      "integrity": "sha512-BpAffW1mIyRZongoKBbh3RgHG+JDHJek/8hjA/9LnPunM+ejorO6axkxCgwxCe4K//g/JdPeR9vROHDYr/hfnQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/middleware-serde": "^4.2.9",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/types": "^4.12.0",
        "@smithy/util-base64": "^4.3.0",
        "@smithy/util-body-length-browser": "^4.2.0",
        "@smithy/util-middleware": "^4.2.8",
        "@smithy/util-stream": "^4.5.10",
        "@smithy/util-utf8": "^4.2.0",
        "@smithy/uuid": "^1.1.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/credential-provider-imds": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/credential-provider-imds/-/credential-provider-imds-4.2.8.tgz",
      "integrity": "sha512-FNT0xHS1c/CPN8upqbMFP83+ul5YgdisfCfkZ86Jh2NSmnqw/AJ6x5pEogVCTVvSm7j9MopRU89bmDelxuDMYw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/types": "^4.12.0",
        "@smithy/url-parser": "^4.2.8",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/fetch-http-handler": {
      "version": "5.3.9",
      "resolved": "https://registry.npmjs.org/@smithy/fetch-http-handler/-/fetch-http-handler-5.3.9.tgz",
      "integrity": "sha512-I4UhmcTYXBrct03rwzQX1Y/iqQlzVQaPxWjCjula++5EmWq9YGBrx6bbGqluGc1f0XEfhSkiY4jhLgbsJUMKRA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/querystring-builder": "^4.2.8",
        "@smithy/types": "^4.12.0",
        "@smithy/util-base64": "^4.3.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/hash-node": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/hash-node/-/hash-node-4.2.8.tgz",
      "integrity": "sha512-7ZIlPbmaDGxVoxErDZnuFG18WekhbA/g2/i97wGj+wUBeS6pcUeAym8u4BXh/75RXWhgIJhyC11hBzig6MljwA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "@smithy/util-buffer-from": "^4.2.0",
        "@smithy/util-utf8": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/invalid-dependency": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/invalid-dependency/-/invalid-dependency-4.2.8.tgz",
      "integrity": "sha512-N9iozRybwAQ2dn9Fot9kI6/w9vos2oTXLhtK7ovGqwZjlOcxu6XhPlpLpC+INsxktqHinn5gS2DXDjDF2kG5sQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/is-array-buffer": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/is-array-buffer/-/is-array-buffer-4.2.0.tgz",
      "integrity": "sha512-DZZZBvC7sjcYh4MazJSGiWMI2L7E0oCiRHREDzIxi/M2LY79/21iXt6aPLHge82wi5LsuRF5A06Ds3+0mlh6CQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/middleware-content-length": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/middleware-content-length/-/middleware-content-length-4.2.8.tgz",
      "integrity": "sha512-RO0jeoaYAB1qBRhfVyq0pMgBoUK34YEJxVxyjOWYZiOKOq2yMZ4MnVXMZCUDenpozHue207+9P5ilTV1zeda0A==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/middleware-endpoint": {
      "version": "4.4.7",
      "resolved": "https://registry.npmjs.org/@smithy/middleware-endpoint/-/middleware-endpoint-4.4.7.tgz",
      "integrity": "sha512-SCmhUG1UwtnEhF5Sxd8qk7bJwkj1BpFzFlHkXqKCEmDPLrRjJyTGM0EhqT7XBtDaDJjCfjRJQodgZcKDR843qg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/core": "^3.20.6",
        "@smithy/middleware-serde": "^4.2.9",
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/shared-ini-file-loader": "^4.4.3",
        "@smithy/types": "^4.12.0",
        "@smithy/url-parser": "^4.2.8",
        "@smithy/util-middleware": "^4.2.8",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/middleware-retry": {
      "version": "4.4.23",
      "resolved": "https://registry.npmjs.org/@smithy/middleware-retry/-/middleware-retry-4.4.23.tgz",
      "integrity": "sha512-lLEmkQj7I7oKfvZ1wsnToGJouLOtfkMXDKRA1Hi6F+mMp5O1N8GcVWmVeNgTtgZtd0OTXDTI2vpVQmeutydGew==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/service-error-classification": "^4.2.8",
        "@smithy/smithy-client": "^4.10.8",
        "@smithy/types": "^4.12.0",
        "@smithy/util-middleware": "^4.2.8",
        "@smithy/util-retry": "^4.2.8",
        "@smithy/uuid": "^1.1.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/middleware-serde": {
      "version": "4.2.9",
      "resolved": "https://registry.npmjs.org/@smithy/middleware-serde/-/middleware-serde-4.2.9.tgz",
      "integrity": "sha512-eMNiej0u/snzDvlqRGSN3Vl0ESn3838+nKyVfF2FKNXFbi4SERYT6PR392D39iczngbqqGG0Jl1DlCnp7tBbXQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/middleware-stack": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/middleware-stack/-/middleware-stack-4.2.8.tgz",
      "integrity": "sha512-w6LCfOviTYQjBctOKSwy6A8FIkQy7ICvglrZFl6Bw4FmcQ1Z420fUtIhxaUZZshRe0VCq4kvDiPiXrPZAe8oRA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/node-config-provider": {
      "version": "4.3.8",
      "resolved": "https://registry.npmjs.org/@smithy/node-config-provider/-/node-config-provider-4.3.8.tgz",
      "integrity": "sha512-aFP1ai4lrbVlWjfpAfRSL8KFcnJQYfTl5QxLJXY32vghJrDuFyPZ6LtUL+JEGYiFRG1PfPLHLoxj107ulncLIg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/property-provider": "^4.2.8",
        "@smithy/shared-ini-file-loader": "^4.4.3",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/node-http-handler": {
      "version": "4.4.8",
      "resolved": "https://registry.npmjs.org/@smithy/node-http-handler/-/node-http-handler-4.4.8.tgz",
      "integrity": "sha512-q9u+MSbJVIJ1QmJ4+1u+cERXkrhuILCBDsJUBAW1MPE6sFonbCNaegFuwW9ll8kh5UdyY3jOkoOGlc7BesoLpg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/abort-controller": "^4.2.8",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/querystring-builder": "^4.2.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/property-provider": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/property-provider/-/property-provider-4.2.8.tgz",
      "integrity": "sha512-EtCTbyIveCKeOXDSWSdze3k612yCPq1YbXsbqX3UHhkOSW8zKsM9NOJG5gTIya0vbY2DIaieG8pKo1rITHYL0w==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/protocol-http": {
      "version": "5.3.8",
      "resolved": "https://registry.npmjs.org/@smithy/protocol-http/-/protocol-http-5.3.8.tgz",
      "integrity": "sha512-QNINVDhxpZ5QnP3aviNHQFlRogQZDfYlCkQT+7tJnErPQbDhysondEjhikuANxgMsZrkGeiAxXy4jguEGsDrWQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/querystring-builder": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/querystring-builder/-/querystring-builder-4.2.8.tgz",
      "integrity": "sha512-Xr83r31+DrE8CP3MqPgMJl+pQlLLmOfiEUnoyAlGzzJIrEsbKsPy1hqH0qySaQm4oWrCBlUqRt+idEgunKB+iw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "@smithy/util-uri-escape": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/querystring-parser": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/querystring-parser/-/querystring-parser-4.2.8.tgz",
      "integrity": "sha512-vUurovluVy50CUlazOiXkPq40KGvGWSdmusa3130MwrR1UNnNgKAlj58wlOe61XSHRpUfIIh6cE0zZ8mzKaDPA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/service-error-classification": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/service-error-classification/-/service-error-classification-4.2.8.tgz",
      "integrity": "sha512-mZ5xddodpJhEt3RkCjbmUQuXUOaPNTkbMGR0bcS8FE0bJDLMZlhmpgrvPNCYglVw5rsYTpSnv19womw9WWXKQQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/shared-ini-file-loader": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/@smithy/shared-ini-file-loader/-/shared-ini-file-loader-4.4.3.tgz",
      "integrity": "sha512-DfQjxXQnzC5UbCUPeC3Ie8u+rIWZTvuDPAGU/BxzrOGhRvgUanaP68kDZA+jaT3ZI+djOf+4dERGlm9mWfFDrg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/signature-v4": {
      "version": "5.3.8",
      "resolved": "https://registry.npmjs.org/@smithy/signature-v4/-/signature-v4-5.3.8.tgz",
      "integrity": "sha512-6A4vdGj7qKNRF16UIcO8HhHjKW27thsxYci+5r/uVRkdcBEkOEiY8OMPuydLX4QHSrJqGHPJzPRwwVTqbLZJhg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/is-array-buffer": "^4.2.0",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/types": "^4.12.0",
        "@smithy/util-hex-encoding": "^4.2.0",
        "@smithy/util-middleware": "^4.2.8",
        "@smithy/util-uri-escape": "^4.2.0",
        "@smithy/util-utf8": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/smithy-client": {
      "version": "4.10.8",
      "resolved": "https://registry.npmjs.org/@smithy/smithy-client/-/smithy-client-4.10.8.tgz",
      "integrity": "sha512-wcr3UEL26k7lLoyf9eVDZoD1nNY3Fa1gbNuOXvfxvVWLGkOVW+RYZgUUp/bXHryJfycIOQnBq9o1JAE00ax8HQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/core": "^3.20.6",
        "@smithy/middleware-endpoint": "^4.4.7",
        "@smithy/middleware-stack": "^4.2.8",
        "@smithy/protocol-http": "^5.3.8",
        "@smithy/types": "^4.12.0",
        "@smithy/util-stream": "^4.5.10",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/types": {
      "version": "4.12.0",
      "resolved": "https://registry.npmjs.org/@smithy/types/-/types-4.12.0.tgz",
      "integrity": "sha512-9YcuJVTOBDjg9LWo23Qp0lTQ3D7fQsQtwle0jVfpbUHy9qBwCEgKuVH4FqFB3VYu0nwdHKiEMA+oXz7oV8X1kw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/url-parser": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/url-parser/-/url-parser-4.2.8.tgz",
      "integrity": "sha512-NQho9U68TGMEU639YkXnVMV3GEFFULmmaWdlu1E9qzyIePOHsoSnagTGSDv1Zi8DCNN6btxOSdgmy5E/hsZwhA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/querystring-parser": "^4.2.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-base64": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-base64/-/util-base64-4.3.0.tgz",
      "integrity": "sha512-GkXZ59JfyxsIwNTWFnjmFEI8kZpRNIBfxKjv09+nkAWPt/4aGaEWMM04m4sxgNVWkbt2MdSvE3KF/PfX4nFedQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/util-buffer-from": "^4.2.0",
        "@smithy/util-utf8": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-body-length-browser": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-body-length-browser/-/util-body-length-browser-4.2.0.tgz",
      "integrity": "sha512-Fkoh/I76szMKJnBXWPdFkQJl2r9SjPt3cMzLdOB6eJ4Pnpas8hVoWPYemX/peO0yrrvldgCUVJqOAjUrOLjbxg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-body-length-node": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/@smithy/util-body-length-node/-/util-body-length-node-4.2.1.tgz",
      "integrity": "sha512-h53dz/pISVrVrfxV1iqXlx5pRg3V2YWFcSQyPyXZRrZoZj4R4DeWRDo1a7dd3CPTcFi3kE+98tuNyD2axyZReA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-buffer-from": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-buffer-from/-/util-buffer-from-4.2.0.tgz",
      "integrity": "sha512-kAY9hTKulTNevM2nlRtxAG2FQ3B2OR6QIrPY3zE5LqJy1oxzmgBGsHLWTcNhWXKchgA0WHW+mZkQrng/pgcCew==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/is-array-buffer": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-config-provider": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-config-provider/-/util-config-provider-4.2.0.tgz",
      "integrity": "sha512-YEjpl6XJ36FTKmD+kRJJWYvrHeUvm5ykaUS5xK+6oXffQPHeEM4/nXlZPe+Wu0lsgRUcNZiliYNh/y7q9c2y6Q==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-defaults-mode-browser": {
      "version": "4.3.22",
      "resolved": "https://registry.npmjs.org/@smithy/util-defaults-mode-browser/-/util-defaults-mode-browser-4.3.22.tgz",
      "integrity": "sha512-O2WXr6ZRqPnbyoepb7pKcLt1QL6uRfFzGYJ9sGb5hMJQi7v/4RjRmCQa9mNjA0YiXqsc5lBmLXqJPhjM1Vjv5A==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/property-provider": "^4.2.8",
        "@smithy/smithy-client": "^4.10.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-defaults-mode-node": {
      "version": "4.2.25",
      "resolved": "https://registry.npmjs.org/@smithy/util-defaults-mode-node/-/util-defaults-mode-node-4.2.25.tgz",
      "integrity": "sha512-7uMhppVNRbgNIpyUBVRfjGHxygP85wpXalRvn9DvUlCx4qgy1AB/uxOPSiDx/jFyrwD3/BypQhx1JK7f3yxrAw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/config-resolver": "^4.4.6",
        "@smithy/credential-provider-imds": "^4.2.8",
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/property-provider": "^4.2.8",
        "@smithy/smithy-client": "^4.10.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-endpoints": {
      "version": "3.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/util-endpoints/-/util-endpoints-3.2.8.tgz",
      "integrity": "sha512-8JaVTn3pBDkhZgHQ8R0epwWt+BqPSLCjdjXXusK1onwJlRuN69fbvSK66aIKKO7SwVFM6x2J2ox5X8pOaWcUEw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/node-config-provider": "^4.3.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-hex-encoding": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-hex-encoding/-/util-hex-encoding-4.2.0.tgz",
      "integrity": "sha512-CCQBwJIvXMLKxVbO88IukazJD9a4kQ9ZN7/UMGBjBcJYvatpWk+9g870El4cB8/EJxfe+k+y0GmR9CAzkF+Nbw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-middleware": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/util-middleware/-/util-middleware-4.2.8.tgz",
      "integrity": "sha512-PMqfeJxLcNPMDgvPbbLl/2Vpin+luxqTGPpW3NAQVLbRrFRzTa4rNAASYeIGjRV9Ytuhzny39SpyU04EQreF+A==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-retry": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/@smithy/util-retry/-/util-retry-4.2.8.tgz",
      "integrity": "sha512-CfJqwvoRY0kTGe5AkQokpURNCT1u/MkRzMTASWMPPo2hNSnKtF1D45dQl3DE2LKLr4m+PW9mCeBMJr5mCAVThg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/service-error-classification": "^4.2.8",
        "@smithy/types": "^4.12.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-stream": {
      "version": "4.5.10",
      "resolved": "https://registry.npmjs.org/@smithy/util-stream/-/util-stream-4.5.10.tgz",
      "integrity": "sha512-jbqemy51UFSZSp2y0ZmRfckmrzuKww95zT9BYMmuJ8v3altGcqjwoV1tzpOwuHaKrwQrCjIzOib499ymr2f98g==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/fetch-http-handler": "^5.3.9",
        "@smithy/node-http-handler": "^4.4.8",
        "@smithy/types": "^4.12.0",
        "@smithy/util-base64": "^4.3.0",
        "@smithy/util-buffer-from": "^4.2.0",
        "@smithy/util-hex-encoding": "^4.2.0",
        "@smithy/util-utf8": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-uri-escape": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-uri-escape/-/util-uri-escape-4.2.0.tgz",
      "integrity": "sha512-igZpCKV9+E/Mzrpq6YacdTQ0qTiLm85gD6N/IrmyDvQFA4UnU3d5g3m8tMT/6zG/vVkWSU+VxeUyGonL62DuxA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/util-utf8": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/@smithy/util-utf8/-/util-utf8-4.2.0.tgz",
      "integrity": "sha512-zBPfuzoI8xyBtR2P6WQj63Rz8i3AmfAaJLuNG8dWsfvPe8lO4aCPYLn879mEgHndZH1zQ2oXmG8O1GGzzaoZiw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/util-buffer-from": "^4.2.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/uuid": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@smithy/uuid/-/uuid-1.1.0.tgz",
      "integrity": "sha512-4aUIteuyxtBUhVdiQqcDhKFitwfd9hqoSDYY2KRXiWtgoWJ9Bmise+KfEPDiVHWeJepvF8xJO9/9+WDIciMFFw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@standard-schema/spec": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@standard-schema/spec/-/spec-1.1.0.tgz",
      "integrity": "sha512-l2aFy5jALhniG5HgqrD6jXLi/rUWrKvqN/qJx6yoJsgKhblVd+iqqU4RCXavm/jPityDo5TCvKMnpjKnOriy0w==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/@swc/helpers": {
      "version": "0.5.15",
      "resolved": "https://registry.npmjs.org/@swc/helpers/-/helpers-0.5.15.tgz",
      "integrity": "sha512-JQ5TuMi45Owi4/BIMAJBoSQoOJu12oOk/gADqlcUL9JEdHB8vyjUSsxqeNXnmXHjYKMi2WcYtezGEEhqUI/E2g==",
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.8.0"
      }
    },
    "node_modules/@tailwindcss/language-server": {
      "version": "0.14.29",
      "resolved": "https://registry.npmjs.org/@tailwindcss/language-server/-/language-server-0.14.29.tgz",
      "integrity": "sha512-aZ3/XyTNmsoIyhs09Fghlw6D6y7o70aIxHmQEYPFiJPe/1k3HqtxXqhn7g7a5UpA1yeGOyKK9HRNJ8ghZqIclg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "css-language-server": "bin/css-language-server",
        "tailwindcss-language-server": "bin/tailwindcss-language-server"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@tailwindcss/node": {
      "version": "4.1.18",
      "resolved": "https://registry.npmjs.org/@tailwindcss/node/-/node-4.1.18.tgz",
      "integrity": "sha512-DoR7U1P7iYhw16qJ49fgXUlry1t4CpXeErJHnQ44JgTSKMaZUdf17cfn5mHchfJ4KRBZRFA/Coo+MUF5+gOaCQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/remapping": "^2.3.4",
        "enhanced-resolve": "^5.18.3",
        "jiti": "^2.6.1",
        "lightningcss": "1.30.2",
        "magic-string": "^0.30.21",
        "source-map-js": "^1.2.1",
        "tailwindcss": "4.1.18"
      }
    },
    "node_modules/@tailwindcss/oxide": {
      "version": "4.1.18",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide/-/oxide-4.1.18.tgz",
      "integrity": "sha512-EgCR5tTS5bUSKQgzeMClT6iCY3ToqE1y+ZB0AKldj809QXk1Y+3jB0upOYZrn9aGIzPtUsP7sX4QQ4XtjBB95A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 10"
      },
      "optionalDependencies": {
        "@tailwindcss/oxide-android-arm64": "4.1.18",
        "@tailwindcss/oxide-darwin-arm64": "4.1.18",
        "@tailwindcss/oxide-darwin-x64": "4.1.18",
        "@tailwindcss/oxide-freebsd-x64": "4.1.18",
        "@tailwindcss/oxide-linux-arm-gnueabihf": "4.1.18",
        "@tailwindcss/oxide-linux-arm64-gnu": "4.1.18",
        "@tailwindcss/oxide-linux-arm64-musl": "4.1.18",
        "@tailwindcss/oxide-linux-x64-gnu": "4.1.18",
        "@tailwindcss/oxide-linux-x64-musl": "4.1.18",
        "@tailwindcss/oxide-wasm32-wasi": "4.1.18",
        "@tailwindcss/oxide-win32-arm64-msvc": "4.1.18",
        "@tailwindcss/oxide-win32-x64-msvc": "4.1.18"
      }
    },
    "node_modules/@tailwindcss/oxide-darwin-arm64": {
      "version": "4.1.18",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-arm64/-/oxide-darwin-arm64-4.1.18.tgz",
      "integrity": "sha512-Gc2q4Qhs660bhjyBSKgq6BYvwDz4G+BuyJ5H1xfhmDR3D8HnHCmT/BSkvSL0vQLy/nkMLY20PQ2OoYMO15Jd0A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/postcss": {
      "version": "4.1.18",
      "resolved": "https://registry.npmjs.org/@tailwindcss/postcss/-/postcss-4.1.18.tgz",
      "integrity": "sha512-Ce0GFnzAOuPyfV5SxjXGn0CubwGcuDB0zcdaPuCSzAa/2vII24JTkH+I6jcbXLb1ctjZMZZI6OjDaLPJQL1S0g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@alloc/quick-lru": "^5.2.0",
        "@tailwindcss/node": "4.1.18",
        "@tailwindcss/oxide": "4.1.18",
        "postcss": "^8.4.41",
        "tailwindcss": "4.1.18"
      }
    },
    "node_modules/@tsconfig/node10": {
      "version": "1.0.12",
      "resolved": "https://registry.npmjs.org/@tsconfig/node10/-/node10-1.0.12.tgz",
      "integrity": "sha512-UCYBaeFvM11aU2y3YPZ//O5Rhj+xKyzy7mvcIoAjASbigy8mHMryP5cK7dgjlz2hWxh1g5pLw084E0a/wlUSFQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@tsconfig/node12": {
      "version": "1.0.11",
      "resolved": "https://registry.npmjs.org/@tsconfig/node12/-/node12-1.0.11.tgz",
      "integrity": "sha512-cqefuRsh12pWyGsIoBKJA9luFu3mRxCA+ORZvA4ktLSzIuCUtWVxGIuXigEwO5/ywWFMZ2QEGKWvkZG1zDMTag==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@tsconfig/node14": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/@tsconfig/node14/-/node14-1.0.3.tgz",
      "integrity": "sha512-ysT8mhdixWK6Hw3i1V2AeRqZ5WfXg1G43mqoYlM2nc6388Fq5jcXyr5mRsqViLx/GJYdoL0bfXD8nmF+Zn/Iow==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@tsconfig/node16": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/@tsconfig/node16/-/node16-1.0.4.tgz",
      "integrity": "sha512-vxhUy4J8lyeyinH7Azl1pdd43GJhZH/tP2weN8TntQblOY+A0XbT8DJk1/oCPuOOyg/Ja757rG0CgHcWC8OfMA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/cookie": {
      "version": "0.6.0",
      "resolved": "https://registry.npmjs.org/@types/cookie/-/cookie-0.6.0.tgz",
      "integrity": "sha512-4Kh9a6B2bQciAhf7FSuMRRkUWecJgJu9nPnx3yzpsfXX/c50REIqpHY4C82bXP90qrLtXtkDxTZosYO3UpOwlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/estree": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.8.tgz",
      "integrity": "sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/json-schema": {
      "version": "7.0.15",
      "resolved": "https://registry.npmjs.org/@types/json-schema/-/json-schema-7.0.15.tgz",
      "integrity": "sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/json5": {
      "version": "0.0.29",
      "resolved": "https://registry.npmjs.org/@types/json5/-/json5-0.0.29.tgz",
      "integrity": "sha512-dRLjCWHYg4oaA77cxO64oO+7JwCwnIzkZPdrrC71jQmQtlhM556pwKo5bUzqvZndkVbeFLIIi+9TC40JNF5hNQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "22.19.7",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-22.19.7.tgz",
      "integrity": "sha512-MciR4AKGHWl7xwxkBa6xUGxQJ4VBOmPTF7sL+iGzuahOFaO0jHCsuEfS80pan1ef4gWId1oWOweIhrDEYLuaOw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "undici-types": "~6.21.0"
      }
    },
    "node_modules/@types/nodemailer": {
      "version": "7.0.5",
      "resolved": "https://registry.npmjs.org/@types/nodemailer/-/nodemailer-7.0.5.tgz",
      "integrity": "sha512-7WtR4MFJUNN2UFy0NIowBRJswj5KXjXDhlZY43Hmots5eGu5q/dTeFd/I6GgJA/qj3RqO6dDy4SvfcV3fOVeIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@aws-sdk/client-sesv2": "^3.839.0",
        "@types/node": "*"
      }
    },
    "node_modules/@types/react": {
      "version": "19.2.8",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.2.8.tgz",
      "integrity": "sha512-3MbSL37jEchWZz2p2mjntRZtPt837ij10ApxKfgmXCTuHWagYg7iA5bqPw6C8BMPfwidlvfPI/fxOc42HLhcyg==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.2.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "19.2.3",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-19.2.3.tgz",
      "integrity": "sha512-jp2L/eY6fn+KgVVQAOqYItbF0VY/YApe5Mz2F0aykSO8gx31bYCZyvSeYxCHKvzHG5eZjc+zyaS5BrBWya2+kQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^19.2.0"
      }
    },
    "node_modules/@typescript-eslint/eslint-plugin": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/eslint-plugin/-/eslint-plugin-8.53.0.tgz",
      "integrity": "sha512-eEXsVvLPu8Z4PkFibtuFJLJOTAV/nPdgtSjkGoPpddpFk3/ym2oy97jynY6ic2m6+nc5M8SE1e9v/mHKsulcJg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/regexpp": "^4.12.2",
        "@typescript-eslint/scope-manager": "8.53.0",
        "@typescript-eslint/type-utils": "8.53.0",
        "@typescript-eslint/utils": "8.53.0",
        "@typescript-eslint/visitor-keys": "8.53.0",
        "ignore": "^7.0.5",
        "natural-compare": "^1.4.0",
        "ts-api-utils": "^2.4.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "@typescript-eslint/parser": "^8.53.0",
        "eslint": "^8.57.0 || ^9.0.0",
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/parser": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/parser/-/parser-8.53.0.tgz",
      "integrity": "sha512-npiaib8XzbjtzS2N4HlqPvlpxpmZ14FjSJrteZpPxGUaYPlvhzlzUZ4mZyABo0EFrOWnvyd0Xxroq//hKhtAWg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/scope-manager": "8.53.0",
        "@typescript-eslint/types": "8.53.0",
        "@typescript-eslint/typescript-estree": "8.53.0",
        "@typescript-eslint/visitor-keys": "8.53.0",
        "debug": "^4.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0",
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/project-service": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/project-service/-/project-service-8.53.0.tgz",
      "integrity": "sha512-Bl6Gdr7NqkqIP5yP9z1JU///Nmes4Eose6L1HwpuVHwScgDPPuEWbUVhvlZmb8hy0vX9syLk5EGNL700WcBlbg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/tsconfig-utils": "^8.53.0",
        "@typescript-eslint/types": "^8.53.0",
        "debug": "^4.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/scope-manager": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/scope-manager/-/scope-manager-8.53.0.tgz",
      "integrity": "sha512-kWNj3l01eOGSdVBnfAF2K1BTh06WS0Yet6JUgb9Cmkqaz3Jlu0fdVUjj9UI8gPidBWSMqDIglmEXifSgDT/D0g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.53.0",
        "@typescript-eslint/visitor-keys": "8.53.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/tsconfig-utils": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/tsconfig-utils/-/tsconfig-utils-8.53.0.tgz",
      "integrity": "sha512-K6Sc0R5GIG6dNoPdOooQ+KtvT5KCKAvTcY8h2rIuul19vxH5OTQk7ArKkd4yTzkw66WnNY0kPPzzcmWA+XRmiA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/type-utils": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/type-utils/-/type-utils-8.53.0.tgz",
      "integrity": "sha512-BBAUhlx7g4SmcLhn8cnbxoxtmS7hcq39xKCgiutL3oNx1TaIp+cny51s8ewnKMpVUKQUGb41RAUWZ9kxYdovuw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.53.0",
        "@typescript-eslint/typescript-estree": "8.53.0",
        "@typescript-eslint/utils": "8.53.0",
        "debug": "^4.4.3",
        "ts-api-utils": "^2.4.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0",
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/types": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/types/-/types-8.53.0.tgz",
      "integrity": "sha512-Bmh9KX31Vlxa13+PqPvt4RzKRN1XORYSLlAE+sO1i28NkisGbTtSLFVB3l7PWdHtR3E0mVMuC7JilWJ99m2HxQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/typescript-estree/-/typescript-estree-8.53.0.tgz",
      "integrity": "sha512-pw0c0Gdo7Z4xOG987u3nJ8akL9093yEEKv8QTJ+Bhkghj1xyj8cgPaavlr9rq8h7+s6plUJ4QJYw2gCZodqmGw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/project-service": "8.53.0",
        "@typescript-eslint/tsconfig-utils": "8.53.0",
        "@typescript-eslint/types": "8.53.0",
        "@typescript-eslint/visitor-keys": "8.53.0",
        "debug": "^4.4.3",
        "minimatch": "^9.0.5",
        "semver": "^7.7.3",
        "tinyglobby": "^0.2.15",
        "ts-api-utils": "^2.4.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/utils": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/utils/-/utils-8.53.0.tgz",
      "integrity": "sha512-XDY4mXTez3Z1iRDI5mbRhH4DFSt46oaIFsLg+Zn97+sYrXACziXSQcSelMybnVZ5pa1P6xYkPr5cMJyunM1ZDA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.9.1",
        "@typescript-eslint/scope-manager": "8.53.0",
        "@typescript-eslint/types": "8.53.0",
        "@typescript-eslint/typescript-estree": "8.53.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0",
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/visitor-keys/-/visitor-keys-8.53.0.tgz",
      "integrity": "sha512-LZ2NqIHFhvFwxG0qZeLL9DvdNAHPGCY5dIRwBhyYeU+LfLhcStE1ImjsuTG/WaVh3XysGaeLW8Rqq7cGkPCFvw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.53.0",
        "eslint-visitor-keys": "^4.2.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys/node_modules/eslint-visitor-keys": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.2.1.tgz",
      "integrity": "sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@unrs/resolver-binding-darwin-arm64": {
      "version": "1.11.1",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-darwin-arm64/-/resolver-binding-darwin-arm64-1.11.1.tgz",
      "integrity": "sha512-gPVA1UjRu1Y/IsB/dQEsp2V1pm44Of6+LWvbLc9SDk1c2KhhDRDBUkQCYVWe6f26uJb3fOK8saWMgtX8IrMk3g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@vscode/ripgrep": {
      "version": "1.17.0",
      "resolved": "https://registry.npmjs.org/@vscode/ripgrep/-/ripgrep-1.17.0.tgz",
      "integrity": "sha512-mBRKm+ASPkUcw4o9aAgfbusIu6H4Sdhw09bjeP1YOBFTJEZAnrnk6WZwzv8NEjgC82f7ILvhmb1WIElSugea6g==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "dependencies": {
        "https-proxy-agent": "^7.0.2",
        "proxy-from-env": "^1.1.0",
        "yauzl": "^2.9.2"
      }
    },
    "node_modules/@yarnpkg/lockfile": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@yarnpkg/lockfile/-/lockfile-1.1.0.tgz",
      "integrity": "sha512-GpSwvyXOcOOlV70vbnzjj4fW5xW/FdUF6nQEt1ENy7m4ZCczi1+/buVUPAqmGfqznsORNFzUMjctTIp8a9tuCQ==",
      "dev": true,
      "license": "BSD-2-Clause"
    },
    "node_modules/acorn": {
      "version": "8.15.0",
      "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.15.0.tgz",
      "integrity": "sha512-NZyJarBfL7nWwIq+FDL6Zp/yHEhePMNnnJ0y3qfieCrmNvYct8uvtiV41UvlSe6apAfk0fY1FbWx+NwfmpvtTg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "acorn": "bin/acorn"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/acorn-jsx": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/acorn-jsx/-/acorn-jsx-5.3.2.tgz",
      "integrity": "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0"
      }
    },
    "node_modules/acorn-walk": {
      "version": "8.3.4",
      "resolved": "https://registry.npmjs.org/acorn-walk/-/acorn-walk-8.3.4.tgz",
      "integrity": "sha512-ueEepnujpqee2o5aIYnvHU6C0A42MNdsIDeqy5BydrkuC5R1ZuUFnm27EeFJGoEHJQgn3uleRvmTXaJgfXbt4g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "acorn": "^8.11.0"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/agent-base": {
      "version": "7.1.4",
      "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-7.1.4.tgz",
      "integrity": "sha512-MnA+YT8fwfJPgBx3m60MNqakm30XOkyIoH1y6huTQvC0PwZG7ki8NacLBcrPbNoo8vEZy7Jpuk7+jMO+CUovTQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/ajv": {
      "version": "6.12.6",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-6.12.6.tgz",
      "integrity": "sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.1",
        "fast-json-stable-stringify": "^2.0.0",
        "json-schema-traverse": "^0.4.1",
        "uri-js": "^4.2.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/arg": {
      "version": "4.1.3",
      "resolved": "https://registry.npmjs.org/arg/-/arg-4.1.3.tgz",
      "integrity": "sha512-58S9QDqG0Xx27YwPSt9fJxivjYl432YCwfDMfZ+71RAqUrZef7LrKQZ3LHLOwCS4FLNBplP533Zx895SeOCHvA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "dev": true,
      "license": "Python-2.0"
    },
    "node_modules/aria-query": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/aria-query/-/aria-query-5.3.2.tgz",
      "integrity": "sha512-COROpnaoap1E2F000S62r6A60uHZnmlvomhfyT2DlTcrY1OrBKn2UhH7qn5wTC9zMvD0AY7csdPSNwKP+7WiQw==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/array-buffer-byte-length": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/array-buffer-byte-length/-/array-buffer-byte-length-1.0.2.tgz",
      "integrity": "sha512-LHE+8BuR7RYGDKvnrmcuSq3tDcKv9OFEXQt/HpbZhY7V6h0zlUXutnAD82GiFx9rdieCMjkvtcsPqBwgUl1Iiw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "is-array-buffer": "^3.0.5"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array-includes": {
      "version": "3.1.9",
      "resolved": "https://registry.npmjs.org/array-includes/-/array-includes-3.1.9.tgz",
      "integrity": "sha512-FmeCCAenzH0KH381SPT5FZmiA/TmpndpcaShhfgEN9eCVjnFBqq3l1xrI42y8+PPLI6hypzou4GXw00WHmPBLQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.24.0",
        "es-object-atoms": "^1.1.1",
        "get-intrinsic": "^1.3.0",
        "is-string": "^1.1.1",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.findlast": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/array.prototype.findlast/-/array.prototype.findlast-1.2.5.tgz",
      "integrity": "sha512-CVvd6FHg1Z3POpBLxO6E6zr+rSKEQ9L6rZHAaY7lLfhKsWYUBBOuMs0e9o24oopj6H+geRCX0YJ+TJLBK2eHyQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.2",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.findlastindex": {
      "version": "1.2.6",
      "resolved": "https://registry.npmjs.org/array.prototype.findlastindex/-/array.prototype.findlastindex-1.2.6.tgz",
      "integrity": "sha512-F/TKATkzseUExPlfvmwQKGITM3DGTK+vkAsCZoDc5daVygbJBnjEUCbgkAvVFsgfXfX4YIqZ/27G3k3tdXrTxQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.9",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "es-shim-unscopables": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.flat": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/array.prototype.flat/-/array.prototype.flat-1.3.3.tgz",
      "integrity": "sha512-rwG/ja1neyLqCuGZ5YYrznA62D4mZXg0i1cIskIUKSiqF3Cje9/wXAls9B9s1Wa2fomMsIv8czB8jZcPmxCXFg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.5",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.flatmap": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/array.prototype.flatmap/-/array.prototype.flatmap-1.3.3.tgz",
      "integrity": "sha512-Y7Wt51eKJSyi80hFrJCePGGNo5ktJCslFuboqJsbf57CCPcm5zztluPlc4/aD8sWsKvlwatezpV4U1efk8kpjg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.5",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.tosorted": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/array.prototype.tosorted/-/array.prototype.tosorted-1.1.4.tgz",
      "integrity": "sha512-p6Fx8B7b7ZhL/gmUsAy0D15WhvDccw3mnGNbZpi3pmeJdxtWsj2jEaI4Y6oo3XiHfzuSgPwKc04MYt6KgvC/wA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.3",
        "es-errors": "^1.3.0",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/arraybuffer.prototype.slice": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/arraybuffer.prototype.slice/-/arraybuffer.prototype.slice-1.0.4.tgz",
      "integrity": "sha512-BNoCY6SXXPQ7gF2opIP4GBE+Xw7U+pHMYKuzjgCN3GwiaIR09UUeKfheyIry77QtrCBlC0KK0q5/TER/tYh3PQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-buffer-byte-length": "^1.0.1",
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.5",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6",
        "is-array-buffer": "^3.0.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/asn1js": {
      "version": "3.0.7",
      "resolved": "https://registry.npmjs.org/asn1js/-/asn1js-3.0.7.tgz",
      "integrity": "sha512-uLvq6KJu04qoQM6gvBfKFjlh6Gl0vOKQuR5cJMDHQkmwfMOQeN3F3SHCv9SNYSL+CRoHvOGFfllDlVz03GQjvQ==",
      "devOptional": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "pvtsutils": "^1.3.6",
        "pvutils": "^1.1.3",
        "tslib": "^2.8.1"
      },
      "engines": {
        "node": ">=12.0.0"
      }
    },
    "node_modules/ast-types-flow": {
      "version": "0.0.8",
      "resolved": "https://registry.npmjs.org/ast-types-flow/-/ast-types-flow-0.0.8.tgz",
      "integrity": "sha512-OH/2E5Fg20h2aPrbe+QL8JZQFko0YZaF+j4mnQ7BGhfavO7OpSLa8a0y9sBwomHdSbkhTS8TQNayBfnW5DwbvQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/async-function": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/async-function/-/async-function-1.0.0.tgz",
      "integrity": "sha512-hsU18Ae8CDTR6Kgu9DYf0EbCr/a5iGL0rytQDobUcdpYOKokk8LEjVphnXkDkgpi0wYVsqrXuP0bZxJaTqdgoA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/available-typed-arrays": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/available-typed-arrays/-/available-typed-arrays-1.0.7.tgz",
      "integrity": "sha512-wvUjBtSGN7+7SjNpq/9M2Tg350UZD3q62IFZLbRAR1bSMlCo1ZaeW+BJ+D090e4hIIZLBcTDWe4Mh4jvUDajzQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "possible-typed-array-names": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/axe-core": {
      "version": "4.11.1",
      "resolved": "https://registry.npmjs.org/axe-core/-/axe-core-4.11.1.tgz",
      "integrity": "sha512-BASOg+YwO2C+346x3LZOeoovTIoTrRqEsqMa6fmfAV0P+U9mFr9NsyOEpiYvFjbc64NMrSswhV50WdXzdb/Z5A==",
      "dev": true,
      "license": "MPL-2.0",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/axobject-query": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/axobject-query/-/axobject-query-4.1.0.tgz",
      "integrity": "sha512-qIj0G9wZbMGNLjLmg1PT6v2mE9AH2zlnADJD/2tC6E00hgmhUOfEB6greHPAfLRSufHqROIUTkw6E+M3lH0PTQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/babel-plugin-react-compiler": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/babel-plugin-react-compiler/-/babel-plugin-react-compiler-1.0.0.tgz",
      "integrity": "sha512-Ixm8tFfoKKIPYdCCKYTsqv+Fd4IJ0DQqMyEimo+pxUOMUR9cVPlwTrFt9Avu+3cb6Zp3mAzl+t1MrG2fxxKsxw==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.26.0"
      }
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/baseline-browser-mapping": {
      "version": "2.9.14",
      "resolved": "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.9.14.tgz",
      "integrity": "sha512-B0xUquLkiGLgHhpPBqvl7GWegWBUNuujQ6kXd/r1U38ElPT6Ok8KZ8e+FpUGEc2ZoRQUzq/aUnaKFc/svWUGSg==",
      "license": "Apache-2.0",
      "bin": {
        "baseline-browser-mapping": "dist/cli.js"
      }
    },
    "node_modules/bowser": {
      "version": "2.13.1",
      "resolved": "https://registry.npmjs.org/bowser/-/bowser-2.13.1.tgz",
      "integrity": "sha512-OHawaAbjwx6rqICCKgSG0SAnT05bzd7ppyKLVUITZpANBaaMFBAsaNkto3LoQ31tyFP5kNujE8Cdx85G9VzOkw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/brace-expansion": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-2.0.2.tgz",
      "integrity": "sha512-Jt0vHyM+jmUBqojB7E1NIYadt0vI0Qxjxd2TErW94wDz+E2LAm5vKMXXwg6ZZBTHPuUlDgQHKXvjGBdfcF1ZDQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0"
      }
    },
    "node_modules/braces": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/braces/-/braces-3.0.3.tgz",
      "integrity": "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fill-range": "^7.1.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/browserslist": {
      "version": "4.28.1",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.28.1.tgz",
      "integrity": "sha512-ZC5Bd0LgJXgwGqUknZY/vkUQ04r8NXnJZ3yYi4vDmSiZmC/pdSN0NbNRPxZpbtO4uAfDUAFffO8IZoM3Gj8IkA==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "baseline-browser-mapping": "^2.9.0",
        "caniuse-lite": "^1.0.30001759",
        "electron-to-chromium": "^1.5.263",
        "node-releases": "^2.0.27",
        "update-browserslist-db": "^1.2.0"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/buffer-crc32": {
      "version": "0.2.13",
      "resolved": "https://registry.npmjs.org/buffer-crc32/-/buffer-crc32-0.2.13.tgz",
      "integrity": "sha512-VO9Ht/+p3SN7SKWqcrgEzjGbRSJYTx+Q1pTQC0wrWqHx0vpJraQ6GtHx8tvcg1rlK1byhU5gccxgOgj7B0TDkQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "*"
      }
    },
    "node_modules/c12": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/c12/-/c12-3.1.0.tgz",
      "integrity": "sha512-uWoS8OU1MEIsOv8p/5a82c3H31LsWVR5qiyXVfBNOzfffjUWtPnhAb4BYI2uG2HfGmZmFjCtui5XNWaps+iFuw==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "chokidar": "^4.0.3",
        "confbox": "^0.2.2",
        "defu": "^6.1.4",
        "dotenv": "^16.6.1",
        "exsolve": "^1.0.7",
        "giget": "^2.0.0",
        "jiti": "^2.4.2",
        "ohash": "^2.0.11",
        "pathe": "^2.0.3",
        "perfect-debounce": "^1.0.0",
        "pkg-types": "^2.2.0",
        "rc9": "^2.1.2"
      },
      "peerDependencies": {
        "magicast": "^0.3.5"
      },
      "peerDependenciesMeta": {
        "magicast": {
          "optional": true
        }
      }
    },
    "node_modules/call-bind": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/call-bind/-/call-bind-1.0.8.tgz",
      "integrity": "sha512-oKlSFMcMwpUg2ednkhQ454wfWiU/ul3CkJe/PEHcTKuiX6RpbehUiFMXu13HalGZxfUwCQzZG747YXBn1im9ww==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.0",
        "es-define-property": "^1.0.0",
        "get-intrinsic": "^1.2.4",
        "set-function-length": "^1.2.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/call-bound": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "get-intrinsic": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/callsites": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/callsites/-/callsites-3.1.0.tgz",
      "integrity": "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001764",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001764.tgz",
      "integrity": "sha512-9JGuzl2M+vPL+pz70gtMF9sHdMFbY9FJaQBi186cHKH3pSzDvzoUJUPV6fqiKIMyXbud9ZLg4F3Yza1vJ1+93g==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chalk": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz",
      "integrity": "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.1.0",
        "supports-color": "^7.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/chalk?sponsor=1"
      }
    },
    "node_modules/chokidar": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/chokidar/-/chokidar-4.0.3.tgz",
      "integrity": "sha512-Qgzu8kfBvo+cA4962jnP1KkS6Dop5NS6g7R5LFYJr4b8Ub94PPQXUksCw9PvXoeXPRRddRNC5C1JQUR2SMGtnA==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "readdirp": "^4.0.1"
      },
      "engines": {
        "node": ">= 14.16.0"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      }
    },
    "node_modules/ci-info": {
      "version": "3.9.0",
      "resolved": "https://registry.npmjs.org/ci-info/-/ci-info-3.9.0.tgz",
      "integrity": "sha512-NIxF55hv4nSqQswkAeiOi1r83xy8JldOFDTWiug55KBu9Jnblncd2U6ViHmYgHf01TPZS77NJBhBMKdWj9HQMQ==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/sibiraj-s"
        }
      ],
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/citty": {
      "version": "0.1.6",
      "resolved": "https://registry.npmjs.org/citty/-/citty-0.1.6.tgz",
      "integrity": "sha512-tskPPKEs8D2KPafUypv2gxwJP8h/OaJmC82QQGGDQcHvXX43xF2VDACcJVmZ0EuSxkpO9Kc4MlrA3q0+FG58AQ==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "consola": "^3.2.3"
      }
    },
    "node_modules/class-variance-authority": {
      "version": "0.7.1",
      "resolved": "https://registry.npmjs.org/class-variance-authority/-/class-variance-authority-0.7.1.tgz",
      "integrity": "sha512-Ka+9Trutv7G8M6WT6SeiRWz792K5qEqIGEGzXKhAE6xOWAY6pPH8U+9IY3oCMv6kqTmLsv7Xh/2w2RigkePMsg==",
      "license": "Apache-2.0",
      "dependencies": {
        "clsx": "^2.1.1"
      },
      "funding": {
        "url": "https://polar.sh/cva"
      }
    },
    "node_modules/client-only": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/client-only/-/client-only-0.0.1.tgz",
      "integrity": "sha512-IV3Ou0jSMzZrd3pZ48nLkT9DA7Ag1pnPzaiQhpW7c3RbcqqzvzzVu+L8gfqMp/8IM2MQtSiqaCxrrcfu8I8rMA==",
      "license": "MIT"
    },
    "node_modules/clsx": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/clsx/-/clsx-2.1.1.tgz",
      "integrity": "sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/confbox": {
      "version": "0.2.2",
      "resolved": "https://registry.npmjs.org/confbox/-/confbox-0.2.2.tgz",
      "integrity": "sha512-1NB+BKqhtNipMsov4xI/NnhCKp9XG9NamYp5PVm9klAT0fsrNPjaFICsCFhNhwZJKNh7zB/3q8qXz0E9oaMNtQ==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/consola": {
      "version": "3.4.2",
      "resolved": "https://registry.npmjs.org/consola/-/consola-3.4.2.tgz",
      "integrity": "sha512-5IKcdX0nnYavi6G7TtOhwkYzyjfJlatbjMjuLSfE2kYT5pMDOilZ4OvMhi637CcDICTmz3wARPoyhqyX1Y+XvA==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": "^14.18.0 || >=16.10.0"
      }
    },
    "node_modules/convert-source-map": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/convert-source-map/-/convert-source-map-2.0.0.tgz",
      "integrity": "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/create-require": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/create-require/-/create-require-1.1.1.tgz",
      "integrity": "sha512-dcKFX3jn0MpIaXjisoRvexIJVEKzaq7z2rZKxf+MSr9TkdmHmsU4m2lcLojrj/FHl8mk5VxMmYA+ftRkP/3oKQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/cross-fetch": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/cross-fetch/-/cross-fetch-4.1.0.tgz",
      "integrity": "sha512-uKm5PU+MHTootlWEY+mZ4vvXoCn4fLQxT9dSc1sXVMSFkINTJVN8cAQROpwcKm8bJ/c7rgZVIBWzH5T78sNZZw==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "node-fetch": "^2.7.0"
      }
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz",
      "integrity": "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/csstype": {
      "version": "3.2.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz",
      "integrity": "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/csv-parse": {
      "version": "6.1.0",
      "resolved": "https://registry.npmjs.org/csv-parse/-/csv-parse-6.1.0.tgz",
      "integrity": "sha512-CEE+jwpgLn+MmtCpVcPtiCZpVtB6Z2OKPTr34pycYYoL7sxdOkXDdQ4lRiw6ioC0q6BLqhc6cKweCVvral8yhw==",
      "license": "MIT"
    },
    "node_modules/damerau-levenshtein": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/damerau-levenshtein/-/damerau-levenshtein-1.0.8.tgz",
      "integrity": "sha512-sdQSFB7+llfUcQHUQO3+B8ERRj0Oa4w9POWMI/puGtuf7gFywGmkaLCElnudfTiKZV+NvHqL0ifzdrI8Ro7ESA==",
      "dev": true,
      "license": "BSD-2-Clause"
    },
    "node_modules/data-view-buffer": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/data-view-buffer/-/data-view-buffer-1.0.2.tgz",
      "integrity": "sha512-EmKO5V3OLXh1rtK2wgXRansaK1/mtVdTUEiEI0W8RkvgT05kfxaH29PliLnpLP73yYO6142Q72QNa8Wx/A5CqQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "is-data-view": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/data-view-byte-length": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/data-view-byte-length/-/data-view-byte-length-1.0.2.tgz",
      "integrity": "sha512-tuhGbE6CfTM9+5ANGf+oQb72Ky/0+s3xKUpHvShfiz2RxMFgFPjsXuRLBVMtvMs15awe45SRb83D6wH4ew6wlQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "is-data-view": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/inspect-js"
      }
    },
    "node_modules/data-view-byte-offset": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/data-view-byte-offset/-/data-view-byte-offset-1.0.1.tgz",
      "integrity": "sha512-BS8PfmtDGnrgYdOonGZQdLZslWIeCGFP9tpan0hi1Co2Zr2NKADsvGYA8XxuG/4UWgJ6Cjtv+YJnB6MM69QGlQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "is-data-view": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/deep-is": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/deep-is/-/deep-is-0.1.4.tgz",
      "integrity": "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/deepmerge-ts": {
      "version": "7.1.5",
      "resolved": "https://registry.npmjs.org/deepmerge-ts/-/deepmerge-ts-7.1.5.tgz",
      "integrity": "sha512-HOJkrhaYsweh+W+e74Yn7YStZOilkoPb6fycpwNLKzSPtruFs48nYis0zy5yJz1+ktUhHxoRDJ27RQAWLIJVJw==",
      "devOptional": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/define-data-property": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/define-data-property/-/define-data-property-1.1.4.tgz",
      "integrity": "sha512-rBMvIzlpA8v6E+SJZoo++HAYqsLrkg7MSfIinMPFhmkorw7X+dOXVJQs+QT69zGkzMyfDnIMN2Wid1+NbL3T+A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-define-property": "^1.0.0",
        "es-errors": "^1.3.0",
        "gopd": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/define-properties": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/define-properties/-/define-properties-1.2.1.tgz",
      "integrity": "sha512-8QmQKqEASLd5nx0U1B1okLElbUuuttJ/AnYmRXbbbGDWh6uS208EjD4Xqq/I9wK7u0v6O08XhTWnt5XtEbR6Dg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.0.1",
        "has-property-descriptors": "^1.0.0",
        "object-keys": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/defu": {
      "version": "6.1.4",
      "resolved": "https://registry.npmjs.org/defu/-/defu-6.1.4.tgz",
      "integrity": "sha512-mEQCMmwJu317oSz8CwdIOdwf3xMif1ttiM8LTufzc3g6kR+9Pe236twL8j3IYT1F7GfRgGcW6MWxzZjLIkuHIg==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/destr": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/destr/-/destr-2.0.5.tgz",
      "integrity": "sha512-ugFTXCtDZunbzasqBxrK93Ik/DRYsO6S/fedkWEMKqt04xZ4csmnmwGDBAb07QWNaGMAmnTIemsYZCksjATwsA==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "devOptional": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/diff": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/diff/-/diff-4.0.2.tgz",
      "integrity": "sha512-58lmxKSA4BNyLz+HHMUzlOEpg09FV+ev6ZMe3vJihgdxzgcwZ8VoEEPmALCZG9LmqfVoNMMKpttIYTVG6uDY7A==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.3.1"
      }
    },
    "node_modules/do-not-zip": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/do-not-zip/-/do-not-zip-1.0.0.tgz",
      "integrity": "sha512-Pgd81ET43bhAGaN2Hq1zluSX1FmD7kl7KcV9ER/lawiLsRUB9pRA5y8r6us29Xk6BrINZETO8TjhYwtwafWUww==",
      "license": "MIT"
    },
    "node_modules/doctrine": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/doctrine/-/doctrine-2.1.0.tgz",
      "integrity": "sha512-35mSku4ZXK0vfCuHEDAwt55dg2jNajHZ1odvF+8SSr82EsZY4QmXfuWso8oEd8zRhVObSN18aM0CjSdoBX7zIw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "esutils": "^2.0.2"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/dotenv": {
      "version": "16.6.1",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-16.6.1.tgz",
      "integrity": "sha512-uBq4egWHTcTt33a72vpSG0z3HnPuIl6NqYcTrKEg2azoEyl2hpW0zqlxysq2pK9HlDIHyHyakeYaYnSAwd8bow==",
      "devOptional": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/effect": {
      "version": "3.18.4",
      "resolved": "https://registry.npmjs.org/effect/-/effect-3.18.4.tgz",
      "integrity": "sha512-b1LXQJLe9D11wfnOKAk3PKxuqYshQ0Heez+y5pnkd3jLj1yx9QhM72zZ9uUrOQyNvrs2GZZd/3maL0ZV18YuDA==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "@standard-schema/spec": "^1.0.0",
        "fast-check": "^3.23.1"
      }
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.267",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.267.tgz",
      "integrity": "sha512-0Drusm6MVRXSOJpGbaSVgcQsuB4hEkMpHXaVstcPmhu5LIedxs1xNK/nIxmQIU/RPC0+1/o0AVZfBTkTNJOdUw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/emoji-regex": {
      "version": "9.2.2",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-9.2.2.tgz",
      "integrity": "sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/empathic": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/empathic/-/empathic-2.0.0.tgz",
      "integrity": "sha512-i6UzDscO/XfAcNYD75CfICkmfLedpyPDdozrLMmQc5ORaQcdMoc21OnlEylMIqI7U8eniKrPMxxtj8k0vhmJhA==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": ">=14"
      }
    },
    "node_modules/enhanced-resolve": {
      "version": "5.18.4",
      "resolved": "https://registry.npmjs.org/enhanced-resolve/-/enhanced-resolve-5.18.4.tgz",
      "integrity": "sha512-LgQMM4WXU3QI+SYgEc2liRgznaD5ojbmY3sb8LxyguVkIg5FxdpTkvk72te2R38/TGKxH634oLxXRGY6d7AP+Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "graceful-fs": "^4.2.4",
        "tapable": "^2.2.0"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/es-abstract": {
      "version": "1.24.1",
      "resolved": "https://registry.npmjs.org/es-abstract/-/es-abstract-1.24.1.tgz",
      "integrity": "sha512-zHXBLhP+QehSSbsS9Pt23Gg964240DPd6QCf8WpkqEXxQ7fhdZzYsocOr5u7apWonsS5EjZDmTF+/slGMyasvw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-buffer-byte-length": "^1.0.2",
        "arraybuffer.prototype.slice": "^1.0.4",
        "available-typed-arrays": "^1.0.7",
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "data-view-buffer": "^1.0.2",
        "data-view-byte-length": "^1.0.2",
        "data-view-byte-offset": "^1.0.1",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "es-set-tostringtag": "^2.1.0",
        "es-to-primitive": "^1.3.0",
        "function.prototype.name": "^1.1.8",
        "get-intrinsic": "^1.3.0",
        "get-proto": "^1.0.1",
        "get-symbol-description": "^1.1.0",
        "globalthis": "^1.0.4",
        "gopd": "^1.2.0",
        "has-property-descriptors": "^1.0.2",
        "has-proto": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "internal-slot": "^1.1.0",
        "is-array-buffer": "^3.0.5",
        "is-callable": "^1.2.7",
        "is-data-view": "^1.0.2",
        "is-negative-zero": "^2.0.3",
        "is-regex": "^1.2.1",
        "is-set": "^2.0.3",
        "is-shared-array-buffer": "^1.0.4",
        "is-string": "^1.1.1",
        "is-typed-array": "^1.1.15",
        "is-weakref": "^1.1.1",
        "math-intrinsics": "^1.1.0",
        "object-inspect": "^1.13.4",
        "object-keys": "^1.1.1",
        "object.assign": "^4.1.7",
        "own-keys": "^1.0.1",
        "regexp.prototype.flags": "^1.5.4",
        "safe-array-concat": "^1.1.3",
        "safe-push-apply": "^1.0.0",
        "safe-regex-test": "^1.1.0",
        "set-proto": "^1.0.0",
        "stop-iteration-iterator": "^1.1.0",
        "string.prototype.trim": "^1.2.10",
        "string.prototype.trimend": "^1.0.9",
        "string.prototype.trimstart": "^1.0.8",
        "typed-array-buffer": "^1.0.3",
        "typed-array-byte-length": "^1.0.3",
        "typed-array-byte-offset": "^1.0.4",
        "typed-array-length": "^1.0.7",
        "unbox-primitive": "^1.1.0",
        "which-typed-array": "^1.1.19"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-iterator-helpers": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/es-iterator-helpers/-/es-iterator-helpers-1.2.2.tgz",
      "integrity": "sha512-BrUQ0cPTB/IwXj23HtwHjS9n7O4h9FX94b4xc5zlTHxeLgTAdzYUDyy6KdExAl9lbN5rtfe44xpjpmj9grxs5w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.24.1",
        "es-errors": "^1.3.0",
        "es-set-tostringtag": "^2.1.0",
        "function-bind": "^1.1.2",
        "get-intrinsic": "^1.3.0",
        "globalthis": "^1.0.4",
        "gopd": "^1.2.0",
        "has-property-descriptors": "^1.0.2",
        "has-proto": "^1.2.0",
        "has-symbols": "^1.1.0",
        "internal-slot": "^1.1.0",
        "iterator.prototype": "^1.1.5",
        "safe-array-concat": "^1.1.3"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.1.tgz",
      "integrity": "sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-set-tostringtag": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/es-set-tostringtag/-/es-set-tostringtag-2.1.0.tgz",
      "integrity": "sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6",
        "has-tostringtag": "^1.0.2",
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-shim-unscopables": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/es-shim-unscopables/-/es-shim-unscopables-1.1.0.tgz",
      "integrity": "sha512-d9T8ucsEhh8Bi1woXCf+TIKDIROLG5WCkxg8geBCbvk22kzwC5G2OnXVMO6FUsvQlgUUXQ2itephWDLqDzbeCw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-to-primitive": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-to-primitive/-/es-to-primitive-1.3.0.tgz",
      "integrity": "sha512-w+5mJ3GuFL+NjVtJlvydShqE1eN3h3PbI7/5LAsYJP/2qtuMXjfL2LpHSRqo4b4eSF5K/DH1JXKUAHSB2UW50g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-callable": "^1.2.7",
        "is-date-object": "^1.0.5",
        "is-symbol": "^1.0.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/esbuild": {
      "version": "0.23.1",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.23.1.tgz",
      "integrity": "sha512-VVNz/9Sa0bs5SELtn3f7qhJCDPCF5oMEl5cO9/SSinpE9hbPVvxbd572HH5AKiP7WD8INO53GgfDDhRjkylHEg==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.23.1",
        "@esbuild/android-arm": "0.23.1",
        "@esbuild/android-arm64": "0.23.1",
        "@esbuild/android-x64": "0.23.1",
        "@esbuild/darwin-arm64": "0.23.1",
        "@esbuild/darwin-x64": "0.23.1",
        "@esbuild/freebsd-arm64": "0.23.1",
        "@esbuild/freebsd-x64": "0.23.1",
        "@esbuild/linux-arm": "0.23.1",
        "@esbuild/linux-arm64": "0.23.1",
        "@esbuild/linux-ia32": "0.23.1",
        "@esbuild/linux-loong64": "0.23.1",
        "@esbuild/linux-mips64el": "0.23.1",
        "@esbuild/linux-ppc64": "0.23.1",
        "@esbuild/linux-riscv64": "0.23.1",
        "@esbuild/linux-s390x": "0.23.1",
        "@esbuild/linux-x64": "0.23.1",
        "@esbuild/netbsd-x64": "0.23.1",
        "@esbuild/openbsd-arm64": "0.23.1",
        "@esbuild/openbsd-x64": "0.23.1",
        "@esbuild/sunos-x64": "0.23.1",
        "@esbuild/win32-arm64": "0.23.1",
        "@esbuild/win32-ia32": "0.23.1",
        "@esbuild/win32-x64": "0.23.1"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint": {
      "version": "9.39.2",
      "resolved": "https://registry.npmjs.org/eslint/-/eslint-9.39.2.tgz",
      "integrity": "sha512-LEyamqS7W5HB3ujJyvi0HQK/dtVINZvd5mAAp9eT5S/ujByGjiZLCzPcHVzuXbpJDJF/cxwHlfceVUDZ2lnSTw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.8.0",
        "@eslint-community/regexpp": "^4.12.1",
        "@eslint/config-array": "^0.21.1",
        "@eslint/config-helpers": "^0.4.2",
        "@eslint/core": "^0.17.0",
        "@eslint/eslintrc": "^3.3.1",
        "@eslint/js": "9.39.2",
        "@eslint/plugin-kit": "^0.4.1",
        "@humanfs/node": "^0.16.6",
        "@humanwhocodes/module-importer": "^1.0.1",
        "@humanwhocodes/retry": "^0.4.2",
        "@types/estree": "^1.0.6",
        "ajv": "^6.12.4",
        "chalk": "^4.0.0",
        "cross-spawn": "^7.0.6",
        "debug": "^4.3.2",
        "escape-string-regexp": "^4.0.0",
        "eslint-scope": "^8.4.0",
        "eslint-visitor-keys": "^4.2.1",
        "espree": "^10.4.0",
        "esquery": "^1.5.0",
        "esutils": "^2.0.2",
        "fast-deep-equal": "^3.1.3",
        "file-entry-cache": "^8.0.0",
        "find-up": "^5.0.0",
        "glob-parent": "^6.0.2",
        "ignore": "^5.2.0",
        "imurmurhash": "^0.1.4",
        "is-glob": "^4.0.0",
        "json-stable-stringify-without-jsonify": "^1.0.1",
        "lodash.merge": "^4.6.2",
        "minimatch": "^3.1.2",
        "natural-compare": "^1.4.0",
        "optionator": "^0.9.3"
      },
      "bin": {
        "eslint": "bin/eslint.js"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      },
      "peerDependencies": {
        "jiti": "*"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-config-next": {
      "version": "16.0.3",
      "resolved": "https://registry.npmjs.org/eslint-config-next/-/eslint-config-next-16.0.3.tgz",
      "integrity": "sha512-5F6qDjcZldf0Y0ZbqvWvap9xzYUxyDf7/of37aeyhvkrQokj/4bT1JYWZdlWUr283aeVa+s52mPq9ogmGg+5dw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@next/eslint-plugin-next": "16.0.3",
        "eslint-import-resolver-node": "^0.3.6",
        "eslint-import-resolver-typescript": "^3.5.2",
        "eslint-plugin-import": "^2.32.0",
        "eslint-plugin-jsx-a11y": "^6.10.0",
        "eslint-plugin-react": "^7.37.0",
        "eslint-plugin-react-hooks": "^7.0.0",
        "globals": "16.4.0",
        "typescript-eslint": "^8.46.0"
      },
      "peerDependencies": {
        "eslint": ">=9.0.0",
        "typescript": ">=3.3.1"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-config-next/node_modules/globals": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-16.4.0.tgz",
      "integrity": "sha512-ob/2LcVVaVGCYN+r14cnwnoDPUufjiYgSqRhiFD0Q1iI4Odora5RE8Iv1D24hAz5oMophRGkGz+yuvQmmUMnMw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint-import-resolver-node": {
      "version": "0.3.9",
      "resolved": "https://registry.npmjs.org/eslint-import-resolver-node/-/eslint-import-resolver-node-0.3.9.tgz",
      "integrity": "sha512-WFj2isz22JahUv+B788TlO3N6zL3nNJGU8CcZbPZvVEkBPaJdCV4vy5wyghty5ROFbCRnm132v8BScu5/1BQ8g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "debug": "^3.2.7",
        "is-core-module": "^2.13.0",
        "resolve": "^1.22.4"
      }
    },
    "node_modules/eslint-import-resolver-node/node_modules/debug": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-3.2.7.tgz",
      "integrity": "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.1"
      }
    },
    "node_modules/eslint-import-resolver-typescript": {
      "version": "3.10.1",
      "resolved": "https://registry.npmjs.org/eslint-import-resolver-typescript/-/eslint-import-resolver-typescript-3.10.1.tgz",
      "integrity": "sha512-A1rHYb06zjMGAxdLSkN2fXPBwuSaQ0iO5M/hdyS0Ajj1VBaRp0sPD3dn1FhME3c/JluGFbwSxyCfqdSbtQLAHQ==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "@nolyfill/is-core-module": "1.0.39",
        "debug": "^4.4.0",
        "get-tsconfig": "^4.10.0",
        "is-bun-module": "^2.0.0",
        "stable-hash": "^0.0.5",
        "tinyglobby": "^0.2.13",
        "unrs-resolver": "^1.6.2"
      },
      "engines": {
        "node": "^14.18.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint-import-resolver-typescript"
      },
      "peerDependencies": {
        "eslint": "*",
        "eslint-plugin-import": "*",
        "eslint-plugin-import-x": "*"
      },
      "peerDependenciesMeta": {
        "eslint-plugin-import": {
          "optional": true
        },
        "eslint-plugin-import-x": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-module-utils": {
      "version": "2.12.1",
      "resolved": "https://registry.npmjs.org/eslint-module-utils/-/eslint-module-utils-2.12.1.tgz",
      "integrity": "sha512-L8jSWTze7K2mTg0vos/RuLRS5soomksDPoJLXIslC7c8Wmut3bx7CPpJijDcBZtxQ5lrbUdM+s0OlNbz0DCDNw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "debug": "^3.2.7"
      },
      "engines": {
        "node": ">=4"
      },
      "peerDependenciesMeta": {
        "eslint": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-module-utils/node_modules/debug": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-3.2.7.tgz",
      "integrity": "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.1"
      }
    },
    "node_modules/eslint-plugin-import": {
      "version": "2.32.0",
      "resolved": "https://registry.npmjs.org/eslint-plugin-import/-/eslint-plugin-import-2.32.0.tgz",
      "integrity": "sha512-whOE1HFo/qJDyX4SnXzP4N6zOWn79WhnCUY/iDR0mPfQZO8wcYE4JClzI2oZrhBnnMUCBCHZhO6VQyoBU95mZA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@rtsao/scc": "^1.1.0",
        "array-includes": "^3.1.9",
        "array.prototype.findlastindex": "^1.2.6",
        "array.prototype.flat": "^1.3.3",
        "array.prototype.flatmap": "^1.3.3",
        "debug": "^3.2.7",
        "doctrine": "^2.1.0",
        "eslint-import-resolver-node": "^0.3.9",
        "eslint-module-utils": "^2.12.1",
        "hasown": "^2.0.2",
        "is-core-module": "^2.16.1",
        "is-glob": "^4.0.3",
        "minimatch": "^3.1.2",
        "object.fromentries": "^2.0.8",
        "object.groupby": "^1.0.3",
        "object.values": "^1.2.1",
        "semver": "^6.3.1",
        "string.prototype.trimend": "^1.0.9",
        "tsconfig-paths": "^3.15.0"
      },
      "engines": {
        "node": ">=4"
      },
      "peerDependencies": {
        "eslint": "^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/brace-expansion": {
      "version": "1.1.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.12.tgz",
      "integrity": "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/debug": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-3.2.7.tgz",
      "integrity": "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.1"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/json5": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/json5/-/json5-1.0.2.tgz",
      "integrity": "sha512-g1MWMLBiz8FKi1e4w0UyVL3w+iJceWAFBAaBnnGKOpNa5f8TLktkbre1+s6oICydWAm+HRUGTmI+//xv2hvXYA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "minimist": "^1.2.0"
      },
      "bin": {
        "json5": "lib/cli.js"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/tsconfig-paths": {
      "version": "3.15.0",
      "resolved": "https://registry.npmjs.org/tsconfig-paths/-/tsconfig-paths-3.15.0.tgz",
      "integrity": "sha512-2Ac2RgzDe/cn48GvOe3M+o82pEFewD3UPbyoUHHdKasHwJKjds4fLXWf/Ux5kATBKN20oaFGu+jbElp1pos0mg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/json5": "^0.0.29",
        "json5": "^1.0.2",
        "minimist": "^1.2.6",
        "strip-bom": "^3.0.0"
      }
    },
    "node_modules/eslint-plugin-jsx-a11y": {
      "version": "6.10.2",
      "resolved": "https://registry.npmjs.org/eslint-plugin-jsx-a11y/-/eslint-plugin-jsx-a11y-6.10.2.tgz",
      "integrity": "sha512-scB3nz4WmG75pV8+3eRUQOHZlNSUhFNq37xnpgRkCCELU3XMvXAxLk1eqWWyE22Ki4Q01Fnsw9BA3cJHDPgn2Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "aria-query": "^5.3.2",
        "array-includes": "^3.1.8",
        "array.prototype.flatmap": "^1.3.2",
        "ast-types-flow": "^0.0.8",
        "axe-core": "^4.10.0",
        "axobject-query": "^4.1.0",
        "damerau-levenshtein": "^1.0.8",
        "emoji-regex": "^9.2.2",
        "hasown": "^2.0.2",
        "jsx-ast-utils": "^3.3.5",
        "language-tags": "^1.0.9",
        "minimatch": "^3.1.2",
        "object.fromentries": "^2.0.8",
        "safe-regex-test": "^1.0.3",
        "string.prototype.includes": "^2.0.1"
      },
      "engines": {
        "node": ">=4.0"
      },
      "peerDependencies": {
        "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9"
      }
    },
    "node_modules/eslint-plugin-jsx-a11y/node_modules/brace-expansion": {
      "version": "1.1.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.12.tgz",
      "integrity": "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/eslint-plugin-jsx-a11y/node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/eslint-plugin-react": {
      "version": "7.37.5",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react/-/eslint-plugin-react-7.37.5.tgz",
      "integrity": "sha512-Qteup0SqU15kdocexFNAJMvCJEfa2xUKNV4CC1xsVMrIIqEy3SQ/rqyxCWNzfrd3/ldy6HMlD2e0JDVpDg2qIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-includes": "^3.1.8",
        "array.prototype.findlast": "^1.2.5",
        "array.prototype.flatmap": "^1.3.3",
        "array.prototype.tosorted": "^1.1.4",
        "doctrine": "^2.1.0",
        "es-iterator-helpers": "^1.2.1",
        "estraverse": "^5.3.0",
        "hasown": "^2.0.2",
        "jsx-ast-utils": "^2.4.1 || ^3.0.0",
        "minimatch": "^3.1.2",
        "object.entries": "^1.1.9",
        "object.fromentries": "^2.0.8",
        "object.values": "^1.2.1",
        "prop-types": "^15.8.1",
        "resolve": "^2.0.0-next.5",
        "semver": "^6.3.1",
        "string.prototype.matchall": "^4.0.12",
        "string.prototype.repeat": "^1.0.0"
      },
      "engines": {
        "node": ">=4"
      },
      "peerDependencies": {
        "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7"
      }
    },
    "node_modules/eslint-plugin-react-hooks": {
      "version": "7.0.1",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-hooks/-/eslint-plugin-react-hooks-7.0.1.tgz",
      "integrity": "sha512-O0d0m04evaNzEPoSW+59Mezf8Qt0InfgGIBJnpC0h3NH/WjUAR7BIKUfysC6todmtiZ/A0oUVS8Gce0WhBrHsA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.24.4",
        "@babel/parser": "^7.24.4",
        "hermes-parser": "^0.25.1",
        "zod": "^3.25.0 || ^4.0.0",
        "zod-validation-error": "^3.5.0 || ^4.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0"
      }
    },
    "node_modules/eslint-plugin-react/node_modules/brace-expansion": {
      "version": "1.1.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.12.tgz",
      "integrity": "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/eslint-plugin-react/node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/eslint-plugin-react/node_modules/resolve": {
      "version": "2.0.0-next.5",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-2.0.0-next.5.tgz",
      "integrity": "sha512-U7WjGVG9sH8tvjW5SmGbQuui75FiyjAX72HX15DwBBwF9dNiQZRQAg9nnPhYy+TUnE0+VcrttuvNI8oSxZcocA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-core-module": "^2.13.0",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/eslint-plugin-react/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/eslint-plugin-zod": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/eslint-plugin-zod/-/eslint-plugin-zod-1.4.0.tgz",
      "integrity": "sha512-i9WzQGw2X5fQcuQh33mA8DQjZJM/yuyZvs1Fc5EyTidX7Ed/g832+1FEQ4u5gtXy+jZ+DVsB5+oMHj4tIOfeZg==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=12"
      },
      "peerDependencies": {
        "eslint": ">=8.1.0"
      }
    },
    "node_modules/eslint-scope": {
      "version": "8.4.0",
      "resolved": "https://registry.npmjs.org/eslint-scope/-/eslint-scope-8.4.0.tgz",
      "integrity": "sha512-sNXOfKCn74rt8RICKMvJS7XKV/Xk9kA7DyJr8mJik3S7Cwgy3qlkkmyS2uQB3jiJg6VNdZd/pDBJu0nvG2NlTg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "esrecurse": "^4.3.0",
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint/node_modules/brace-expansion": {
      "version": "1.1.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.12.tgz",
      "integrity": "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/eslint/node_modules/eslint-visitor-keys": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.2.1.tgz",
      "integrity": "sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint/node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/eslint/node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/espree": {
      "version": "10.4.0",
      "resolved": "https://registry.npmjs.org/espree/-/espree-10.4.0.tgz",
      "integrity": "sha512-j6PAQ2uUr79PZhBjP5C5fhl8e39FmRnOjsD5lGnWrFU8i2G776tBK7+nP8KuQUTTyAZUwfQqXAgrVH5MbH9CYQ==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "acorn": "^8.15.0",
        "acorn-jsx": "^5.3.2",
        "eslint-visitor-keys": "^4.2.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/espree/node_modules/eslint-visitor-keys": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.2.1.tgz",
      "integrity": "sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/esquery": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/esquery/-/esquery-1.7.0.tgz",
      "integrity": "sha512-Ap6G0WQwcU/LHsvLwON1fAQX9Zp0A2Y6Y/cJBl9r/JbW90Zyg4/zbG6zzKa2OTALELarYHmKu0GhpM5EO+7T0g==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "estraverse": "^5.1.0"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/esrecurse": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/esrecurse/-/esrecurse-4.3.0.tgz",
      "integrity": "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estraverse": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/estraverse/-/estraverse-5.3.0.tgz",
      "integrity": "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/esutils": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/esutils/-/esutils-2.0.3.tgz",
      "integrity": "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/exsolve": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/exsolve/-/exsolve-1.0.8.tgz",
      "integrity": "sha512-LmDxfWXwcTArk8fUEnOfSZpHOJ6zOMUJKOtFLFqJLoKJetuQG874Uc7/Kki7zFLzYybmZhp1M7+98pfMqeX8yA==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/fast-check": {
      "version": "3.23.2",
      "resolved": "https://registry.npmjs.org/fast-check/-/fast-check-3.23.2.tgz",
      "integrity": "sha512-h5+1OzzfCC3Ef7VbtKdcv7zsstUQwUDlYpUTvjeUsJAssPgLn7QzbboPtL5ro04Mq0rPOsMzl7q5hIbRs2wD1A==",
      "devOptional": true,
      "funding": [
        {
          "type": "individual",
          "url": "https://github.com/sponsors/dubzzz"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fast-check"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "pure-rand": "^6.1.0"
      },
      "engines": {
        "node": ">=8.0.0"
      }
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-glob": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/fast-glob/-/fast-glob-3.3.3.tgz",
      "integrity": "sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "^2.0.2",
        "@nodelib/fs.walk": "^1.2.3",
        "glob-parent": "^5.1.2",
        "merge2": "^1.3.0",
        "micromatch": "^4.0.8"
      },
      "engines": {
        "node": ">=8.6.0"
      }
    },
    "node_modules/fast-glob/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/fast-json-stable-stringify": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fast-json-stable-stringify/-/fast-json-stable-stringify-2.1.0.tgz",
      "integrity": "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-levenshtein": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/fast-levenshtein/-/fast-levenshtein-2.0.6.tgz",
      "integrity": "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-xml-parser": {
      "version": "5.2.5",
      "resolved": "https://registry.npmjs.org/fast-xml-parser/-/fast-xml-parser-5.2.5.tgz",
      "integrity": "sha512-pfX9uG9Ki0yekDHx2SiuRIyFdyAr1kMIMitPvb0YBo8SUfKvia7w7FIyd/l6av85pFYRhZscS75MwMnbvY+hcQ==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/NaturalIntelligence"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "strnum": "^2.1.0"
      },
      "bin": {
        "fxparser": "src/cli/cli.js"
      }
    },
    "node_modules/fastq": {
      "version": "1.20.1",
      "resolved": "https://registry.npmjs.org/fastq/-/fastq-1.20.1.tgz",
      "integrity": "sha512-GGToxJ/w1x32s/D2EKND7kTil4n8OVk/9mycTc4VDza13lOvpUZTGX3mFSCtV9ksdGBVzvsyAVLM6mHFThxXxw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "reusify": "^1.0.4"
      }
    },
    "node_modules/fd-slicer": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/fd-slicer/-/fd-slicer-1.1.0.tgz",
      "integrity": "sha512-cE1qsB/VwyQozZ+q1dGxR8LBYNZeofhEdUNGSMbQD3Gw2lAzX9Zb3uIU6Ebc/Fmyjo9AWWfnn0AUCHqtevs/8g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "pend": "~1.2.0"
      }
    },
    "node_modules/file-entry-cache": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
      "integrity": "sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flat-cache": "^4.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/fill-range": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/fill-range/-/fill-range-7.1.1.tgz",
      "integrity": "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "to-regex-range": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/find-up": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/find-up/-/find-up-5.0.0.tgz",
      "integrity": "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "locate-path": "^6.0.0",
        "path-exists": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/find-yarn-workspace-root": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/find-yarn-workspace-root/-/find-yarn-workspace-root-2.0.0.tgz",
      "integrity": "sha512-1IMnbjt4KzsQfnhnzNd8wUEgXZ44IzZaZmnLYx7D5FZlaHt2gW20Cri8Q+E/t5tIj4+epTBub+2Zxu/vNILzqQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "micromatch": "^4.0.2"
      }
    },
    "node_modules/flat-cache": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/flat-cache/-/flat-cache-4.0.1.tgz",
      "integrity": "sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flatted": "^3.2.9",
        "keyv": "^4.5.4"
      },
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/flatted": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/flatted/-/flatted-3.3.3.tgz",
      "integrity": "sha512-GX+ysw4PBCz0PzosHDepZGANEuFCMLrnRTiEy9McGjmkCQYwRq4A/X786G/fjM/+OjsWSU1ZrY5qyARZmO/uwg==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/for-each": {
      "version": "0.3.5",
      "resolved": "https://registry.npmjs.org/for-each/-/for-each-0.3.5.tgz",
      "integrity": "sha512-dKx12eRCVIzqCxFGplyFKJMPvLEWgmNtUrpTiJIR5u97zEhRG8ySrtboPHZXx7daLxQVrl643cTzbab2tkQjxg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-callable": "^1.2.7"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/fs-extra": {
      "version": "10.1.0",
      "resolved": "https://registry.npmjs.org/fs-extra/-/fs-extra-10.1.0.tgz",
      "integrity": "sha512-oRXApq54ETRj4eMiFzGnHWGy+zo5raudjuxN0b8H7s/RU2oW0Wvsx9O0ACRN/kRq9E8Vu/ReskGB5o3ji+FzHQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "graceful-fs": "^4.2.0",
        "jsonfile": "^6.0.1",
        "universalify": "^2.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/function.prototype.name": {
      "version": "1.1.8",
      "resolved": "https://registry.npmjs.org/function.prototype.name/-/function.prototype.name-1.1.8.tgz",
      "integrity": "sha512-e5iwyodOHhbMr/yNrc7fDYG4qlbIvI5gajyzPnb5TCwyhjApznQh1BMFou9b30SevY43gCJKXycoCBjMbsuW0Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "define-properties": "^1.2.1",
        "functions-have-names": "^1.2.3",
        "hasown": "^2.0.2",
        "is-callable": "^1.2.7"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/functions-have-names": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/functions-have-names/-/functions-have-names-1.2.3.tgz",
      "integrity": "sha512-xckBUXyTIqT97tq2x2AMb+g163b5JFysYk0x4qxNFwbfQkmNZoiRHb6sPzI9/QV33WeuvVYBUIiD4NzNIyqaRQ==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/generator-function": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/generator-function/-/generator-function-2.0.1.tgz",
      "integrity": "sha512-SFdFmIJi+ybC0vjlHN0ZGVGHc3lgE0DxPAT0djjVg+kjOnSqclqmj0KQ7ykTOLP6YxoqOvuAODGdcHJn+43q3g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/gensync": {
      "version": "1.0.0-beta.2",
      "resolved": "https://registry.npmjs.org/gensync/-/gensync-1.0.0-beta.2.tgz",
      "integrity": "sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/get-symbol-description": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/get-symbol-description/-/get-symbol-description-1.1.0.tgz",
      "integrity": "sha512-w9UMqWwJxHNOvoNzSJ2oPF5wvYcvP7jUvYzhp67yEhTi17ZDBBC1z9pTdGuzjD+EFIqLSYRweZjqfiPzQ06Ebg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-tsconfig": {
      "version": "4.13.0",
      "resolved": "https://registry.npmjs.org/get-tsconfig/-/get-tsconfig-4.13.0.tgz",
      "integrity": "sha512-1VKTZJCwBrvbd+Wn3AOgQP/2Av+TfTCOlE4AcRJE72W1ksZXbAx8PPBR9RzgTeSPzlPMHrbANMH3LbltH73wxQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "resolve-pkg-maps": "^1.0.0"
      },
      "funding": {
        "url": "https://github.com/privatenumber/get-tsconfig?sponsor=1"
      }
    },
    "node_modules/giget": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/giget/-/giget-2.0.0.tgz",
      "integrity": "sha512-L5bGsVkxJbJgdnwyuheIunkGatUF/zssUoxxjACCseZYAVbaqdh9Tsmmlkl8vYan09H7sbvKt4pS8GqKLBrEzA==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "citty": "^0.1.6",
        "consola": "^3.4.0",
        "defu": "^6.1.4",
        "node-fetch-native": "^1.6.6",
        "nypm": "^0.6.0",
        "pathe": "^2.0.3"
      },
      "bin": {
        "giget": "dist/cli.mjs"
      }
    },
    "node_modules/glob-parent": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz",
      "integrity": "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/globals": {
      "version": "14.0.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-14.0.0.tgz",
      "integrity": "sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/globalthis": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/globalthis/-/globalthis-1.0.4.tgz",
      "integrity": "sha512-DpLKbNU4WylpxJykQujfCcwYWiV/Jhm50Goo0wrVILAv5jOr9d+H+UR3PhSCD2rCCEIg0uc+G+muBTwD54JhDQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-properties": "^1.2.1",
        "gopd": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/has-bigints": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-bigints/-/has-bigints-1.1.0.tgz",
      "integrity": "sha512-R3pbpkcIqv2Pm3dUwgjclDRVmWpTJW2DcMzcIhEXEx1oh/CEMObMm3KLmRJOdvhM7o4uQBnwr8pzRK2sJWIqfg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-flag": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-4.0.0.tgz",
      "integrity": "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/has-property-descriptors": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/has-property-descriptors/-/has-property-descriptors-1.0.2.tgz",
      "integrity": "sha512-55JNKuIW+vq4Ke1BjOTjM2YctQIvCT7GFzHwmfZPGo5wnrgkid0YQtnAleFSqumZm4az3n2BS+erby5ipJdgrg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-define-property": "^1.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-proto": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/has-proto/-/has-proto-1.2.0.tgz",
      "integrity": "sha512-KIL7eQPfHQRC8+XluaIw7BHUwwqL19bQn4hzNgdr+1wXoU0KKj6rufu47lhY7KbJR2C6T6+PfyN0Ea7wkSS+qQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-tostringtag": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/has-tostringtag/-/has-tostringtag-1.0.2.tgz",
      "integrity": "sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-symbols": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.2.tgz",
      "integrity": "sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/hermes-estree": {
      "version": "0.25.1",
      "resolved": "https://registry.npmjs.org/hermes-estree/-/hermes-estree-0.25.1.tgz",
      "integrity": "sha512-0wUoCcLp+5Ev5pDW2OriHC2MJCbwLwuRx+gAqMTOkGKJJiBCLjtrvy4PWUGn6MIVefecRpzoOZ/UV6iGdOr+Cw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/hermes-parser": {
      "version": "0.25.1",
      "resolved": "https://registry.npmjs.org/hermes-parser/-/hermes-parser-0.25.1.tgz",
      "integrity": "sha512-6pEjquH3rqaI6cYAXYPcz9MS4rY6R4ngRgrgfDshRptUZIc3lw0MCIJIGDj9++mfySOuPTHB4nrSW99BCvOPIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hermes-estree": "0.25.1"
      }
    },
    "node_modules/https-proxy-agent": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-7.0.6.tgz",
      "integrity": "sha512-vK9P5/iUfdl95AI+JVyUuIcVtd4ofvtrOr3HNtM2yxC9bnMbEdp3x01OhQNnjb8IJYi38VlTE3mBXwcfvywuSw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "agent-base": "^7.1.2",
        "debug": "4"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/ignore": {
      "version": "7.0.5",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-7.0.5.tgz",
      "integrity": "sha512-Hs59xBNfUIunMFgWAbGX5cq6893IbWg4KnrjbYwX3tx0ztorVgTDA6B2sxf8ejHJ4wz8BqGUMYlnzNBer5NvGg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/import-fresh": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/import-fresh/-/import-fresh-3.3.1.tgz",
      "integrity": "sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "parent-module": "^1.0.0",
        "resolve-from": "^4.0.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/imurmurhash": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz",
      "integrity": "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.8.19"
      }
    },
    "node_modules/internal-slot": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/internal-slot/-/internal-slot-1.1.0.tgz",
      "integrity": "sha512-4gd7VpWNQNB4UKKCFFVcp1AVv+FMOgs9NKzjHKusc8jTMhd5eL1NqQqOpE0KzMds804/yHlglp3uxgluOqAPLw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "hasown": "^2.0.2",
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/is-array-buffer": {
      "version": "3.0.5",
      "resolved": "https://registry.npmjs.org/is-array-buffer/-/is-array-buffer-3.0.5.tgz",
      "integrity": "sha512-DDfANUiiG2wC1qawP66qlTugJeL5HyzMpfr8lLK+jMQirGzNod0B12cFB/9q838Ru27sBwfw78/rdoU7RERz6A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "get-intrinsic": "^1.2.6"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-async-function": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-async-function/-/is-async-function-2.1.1.tgz",
      "integrity": "sha512-9dgM/cZBnNvjzaMYHVoxxfPj2QXt22Ev7SuuPrs+xav0ukGB0S6d4ydZdEiM48kLx5kDV+QBPrpVnFyefL8kkQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "async-function": "^1.0.0",
        "call-bound": "^1.0.3",
        "get-proto": "^1.0.1",
        "has-tostringtag": "^1.0.2",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-bigint": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/is-bigint/-/is-bigint-1.1.0.tgz",
      "integrity": "sha512-n4ZT37wG78iz03xPRKJrHTdZbe3IicyucEtdRsV5yglwc3GyUfbAfpSeD0FJ41NbUNSt5wbhqfp1fS+BgnvDFQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-bigints": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-boolean-object": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/is-boolean-object/-/is-boolean-object-1.2.2.tgz",
      "integrity": "sha512-wa56o2/ElJMYqjCjGkXri7it5FbebW5usLw/nPmCMs5DeZ7eziSYZhSmPRn0txqeW4LnAmQQU7FgqLpsEFKM4A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-bun-module": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/is-bun-module/-/is-bun-module-2.0.0.tgz",
      "integrity": "sha512-gNCGbnnnnFAUGKeZ9PdbyeGYJqewpmc2aKHUEMO5nQPWU9lOmv7jcmQIv+qHD8fXW6W7qfuCwX4rY9LNRjXrkQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "semver": "^7.7.1"
      }
    },
    "node_modules/is-callable": {
      "version": "1.2.7",
      "resolved": "https://registry.npmjs.org/is-callable/-/is-callable-1.2.7.tgz",
      "integrity": "sha512-1BC0BVFhS/p0qtw6enp8e+8OD0UrK0oFLztSjNzhcKA3WDuJxxAPXzPuPtKkjEY9UUoEWlX/8fgKeu2S8i9JTA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-core-module": {
      "version": "2.16.1",
      "resolved": "https://registry.npmjs.org/is-core-module/-/is-core-module-2.16.1.tgz",
      "integrity": "sha512-UfoeMA6fIJ8wTYFEUjelnaGI67v6+N7qXJEvQuIGa99l4xsCruSYOVSQ0uPANn4dAzm8lkYPaKLrrijLq7x23w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-data-view": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/is-data-view/-/is-data-view-1.0.2.tgz",
      "integrity": "sha512-RKtWF8pGmS87i2D6gqQu/l7EYRlVdfzemCJN/P3UOs//x1QE7mfhvzHIApBTRf7axvT6DMGwSwBXYCT0nfB9xw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "get-intrinsic": "^1.2.6",
        "is-typed-array": "^1.1.13"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-date-object": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/is-date-object/-/is-date-object-1.1.0.tgz",
      "integrity": "sha512-PwwhEakHVKTdRNVOw+/Gyh0+MzlCl4R6qKvkhuvLtPMggI1WAHt9sOwZxQLSGpUaDnrdyDsomoRgNnCfKNSXXg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-docker": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/is-docker/-/is-docker-2.2.1.tgz",
      "integrity": "sha512-F+i2BKsFrH66iaUFc0woD8sLy8getkwTwtOBjvs56Cx4CgJDeKQeqfz8wAYiSb8JOprWhHH5p77PbmYCvvUuXQ==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "is-docker": "cli.js"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-finalizationregistry": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-finalizationregistry/-/is-finalizationregistry-1.1.1.tgz",
      "integrity": "sha512-1pC6N8qWJbWoPtEjgcL2xyhQOP491EQjeUo3qTKcmV8YSDDJrOepfG8pcC7h/QgnQHYSv0mJ3Z/ZWxmatVrysg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-generator-function": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/is-generator-function/-/is-generator-function-1.1.2.tgz",
      "integrity": "sha512-upqt1SkGkODW9tsGNG5mtXTXtECizwtS2kA161M+gJPc1xdb/Ax629af6YrTwcOeQHbewrPNlE5Dx7kzvXTizA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.4",
        "generator-function": "^2.0.0",
        "get-proto": "^1.0.1",
        "has-tostringtag": "^1.0.2",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-map": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/is-map/-/is-map-2.0.3.tgz",
      "integrity": "sha512-1Qed0/Hr2m+YqxnM09CjA2d/i6YZNfF6R2oRAOj36eUdS6qIV/huPJNSEpKbupewFs+ZsJlxsjjPbc0/afW6Lw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-negative-zero": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/is-negative-zero/-/is-negative-zero-2.0.3.tgz",
      "integrity": "sha512-5KoIu2Ngpyek75jXodFvnafB6DJgr3u8uuK0LEZJjrU19DrMD3EVERaR8sjz8CCGgpZvxPl9SuE1GMVPFHx1mw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-number": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
      "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.12.0"
      }
    },
    "node_modules/is-number-object": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-number-object/-/is-number-object-1.1.1.tgz",
      "integrity": "sha512-lZhclumE1G6VYD8VHe35wFaIif+CTy5SJIi5+3y4psDgWu4wPDoBhF8NxUOinEc7pHgiTsT6MaBb92rKhhD+Xw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-regex": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/is-regex/-/is-regex-1.2.1.tgz",
      "integrity": "sha512-MjYsKHO5O7mCsmRGxWcLWheFqN9DJ/2TmngvjKXihe6efViPqc274+Fx/4fYj/r03+ESvBdTXK0V6tA3rgez1g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "gopd": "^1.2.0",
        "has-tostringtag": "^1.0.2",
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-set": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/is-set/-/is-set-2.0.3.tgz",
      "integrity": "sha512-iPAjerrse27/ygGLxw+EBR9agv9Y6uLeYVJMu+QNCoouJ1/1ri0mGrcWpfCqFZuzzx3WjtwxG098X+n4OuRkPg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-shared-array-buffer": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/is-shared-array-buffer/-/is-shared-array-buffer-1.0.4.tgz",
      "integrity": "sha512-ISWac8drv4ZGfwKl5slpHG9OwPNty4jOWPRIhBpxOoD+hqITiwuipOQ2bNthAzwA3B4fIjO4Nln74N0S9byq8A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-string": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-string/-/is-string-1.1.1.tgz",
      "integrity": "sha512-BtEeSsoaQjlSPBemMQIrY1MY0uM6vnS1g5fmufYOtnxLGUZM2178PKbhsk7Ffv58IX+ZtcvoGwccYsh0PglkAA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-symbol": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-symbol/-/is-symbol-1.1.1.tgz",
      "integrity": "sha512-9gGx6GTtCQM73BgmHQXfDmLtfjjTUDSyoxTCbp5WtoixAhfgsDirWIcVQ/IHpvI5Vgd5i/J5F7B9cN/WlVbC/w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "has-symbols": "^1.1.0",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-typed-array": {
      "version": "1.1.15",
      "resolved": "https://registry.npmjs.org/is-typed-array/-/is-typed-array-1.1.15.tgz",
      "integrity": "sha512-p3EcsicXjit7SaskXHs1hA91QxgTw46Fv6EFKKGS5DRFLD8yKnohjF3hxoju94b/OcMZoQukzpPpBE9uLVKzgQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "which-typed-array": "^1.1.16"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-weakmap": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/is-weakmap/-/is-weakmap-2.0.2.tgz",
      "integrity": "sha512-K5pXYOm9wqY1RgjpL3YTkF39tni1XajUIkawTLUo9EZEVUFga5gSQJF8nNS7ZwJQ02y+1YCNYcMh+HIf1ZqE+w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-weakref": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-weakref/-/is-weakref-1.1.1.tgz",
      "integrity": "sha512-6i9mGWSlqzNMEqpCp93KwRS1uUOodk2OJ6b+sq7ZPDSy2WuI5NFIxp/254TytR8ftefexkWn5xNiHUNpPOfSew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-weakset": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/is-weakset/-/is-weakset-2.0.4.tgz",
      "integrity": "sha512-mfcwb6IzQyOKTs84CQMrOwW4gQcaTOAWJ0zzJCl2WSPDrWk/OzDaImWFH3djXhb24g4eudZfLRozAvPGw4d9hQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "get-intrinsic": "^1.2.6"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-wsl": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/is-wsl/-/is-wsl-2.2.0.tgz",
      "integrity": "sha512-fKzAra0rGJUUBwGBgNkHZuToZcn+TtXHpeCgmkMJMMYx1sQDYaCSyjJBSCa2nH1DGm7s3n1oBnohoVTBaN7Lww==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-docker": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/isarray": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/isarray/-/isarray-2.0.5.tgz",
      "integrity": "sha512-xHjhDr3cNBK0BzdUJSPXZntQUx/mwMS5Rw4A7lPJ90XGAO6ISP/ePDNuo0vhqOZU+UD5JoodwCAAoZQd3FeAKw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/iterator.prototype": {
      "version": "1.1.5",
      "resolved": "https://registry.npmjs.org/iterator.prototype/-/iterator.prototype-1.1.5.tgz",
      "integrity": "sha512-H0dkQoCa3b2VEeKQBOxFph+JAbcrQdE7KC0UkqwpLmv2EC4P41QXP+rqo9wYodACiG5/WM5s9oDApTU8utwj9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.1.4",
        "es-object-atoms": "^1.0.0",
        "get-intrinsic": "^1.2.6",
        "get-proto": "^1.0.0",
        "has-symbols": "^1.1.0",
        "set-function-name": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/jiti": {
      "version": "2.6.1",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-2.6.1.tgz",
      "integrity": "sha512-ekilCSN1jwRvIbgeg/57YFh8qQDNbwDb9xT/qu2DAHbFFZUicIl4ygVaAvzveMhMVr3LnpSKTNnwt8PoOfmKhQ==",
      "devOptional": true,
      "license": "MIT",
      "bin": {
        "jiti": "lib/jiti-cli.mjs"
      }
    },
    "node_modules/joi": {
      "version": "17.4.2",
      "resolved": "https://registry.npmjs.org/joi/-/joi-17.4.2.tgz",
      "integrity": "sha512-Lm56PP+n0+Z2A2rfRvsfWVDXGEWjXxatPopkQ8qQ5mxCEhwHG+Ettgg5o98FFaxilOxozoa14cFhrE/hOzh/Nw==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "@hapi/hoek": "^9.0.0",
        "@hapi/topo": "^5.0.0",
        "@sideway/address": "^4.1.0",
        "@sideway/formula": "^3.0.0",
        "@sideway/pinpoint": "^2.0.0"
      }
    },
    "node_modules/jose": {
      "version": "6.1.3",
      "resolved": "https://registry.npmjs.org/jose/-/jose-6.1.3.tgz",
      "integrity": "sha512-0TpaTfihd4QMNwrz/ob2Bp7X04yuxJkjRGi4aKmOqwhov54i6u79oCv7T+C7lo70MKH6BesI3vscD1yb/yzKXQ==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/panva"
      }
    },
    "node_modules/js-tokens": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
      "integrity": "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/js-yaml": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.1.1.tgz",
      "integrity": "sha512-qQKT4zQxXl8lLwBtHMWwaTcGfFOZviOJet3Oy/xmGk2gZH677CJM9EvtfdSkgWcATZhj/55JZ0rmy3myCT5lsA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/jsesc": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/jsesc/-/jsesc-3.1.0.tgz",
      "integrity": "sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jsesc": "bin/jsesc"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/json-buffer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/json-buffer/-/json-buffer-3.0.1.tgz",
      "integrity": "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-schema-traverse": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-0.4.1.tgz",
      "integrity": "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-stable-stringify": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/json-stable-stringify/-/json-stable-stringify-1.3.0.tgz",
      "integrity": "sha512-qtYiSSFlwot9XHtF9bD9c7rwKjr+RecWT//ZnPvSmEjpV5mmPOCN4j8UjY5hbjNkOwZ/jQv3J6R1/pL7RwgMsg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "isarray": "^2.0.5",
        "jsonify": "^0.0.1",
        "object-keys": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/json-stable-stringify-without-jsonify": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz",
      "integrity": "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json5": {
      "version": "2.2.3",
      "resolved": "https://registry.npmjs.org/json5/-/json5-2.2.3.tgz",
      "integrity": "sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "json5": "lib/cli.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/jsonfile": {
      "version": "6.2.0",
      "resolved": "https://registry.npmjs.org/jsonfile/-/jsonfile-6.2.0.tgz",
      "integrity": "sha512-FGuPw30AdOIUTRMC2OMRtQV+jkVj2cfPqSeWXv1NEAJ1qZ5zb1X6z1mFhbfOB/iy3ssJCD+3KuZ8r8C3uVFlAg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "universalify": "^2.0.0"
      },
      "optionalDependencies": {
        "graceful-fs": "^4.1.6"
      }
    },
    "node_modules/jsonify": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/jsonify/-/jsonify-0.0.1.tgz",
      "integrity": "sha512-2/Ki0GcmuqSrgFyelQq9M05y7PS0mEwuIzrf3f1fPqkVDVRvZrPZtVSMHxdgo8Aq0sxAOb/cr2aqqA3LeWHVPg==",
      "dev": true,
      "license": "Public Domain",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/jsx-ast-utils": {
      "version": "3.3.5",
      "resolved": "https://registry.npmjs.org/jsx-ast-utils/-/jsx-ast-utils-3.3.5.tgz",
      "integrity": "sha512-ZZow9HBI5O6EPgSJLUb8n2NKgmVWTwCvHGwFuJlMjvLFqlGG6pjirPhtdsseaLZjSibD8eegzmYpUZwoIlj2cQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-includes": "^3.1.6",
        "array.prototype.flat": "^1.3.1",
        "object.assign": "^4.1.4",
        "object.values": "^1.1.6"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/keyv": {
      "version": "4.5.4",
      "resolved": "https://registry.npmjs.org/keyv/-/keyv-4.5.4.tgz",
      "integrity": "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "json-buffer": "3.0.1"
      }
    },
    "node_modules/klaw-sync": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/klaw-sync/-/klaw-sync-6.0.0.tgz",
      "integrity": "sha512-nIeuVSzdCCs6TDPTqI8w1Yre34sSq7AkZ4B3sfOBbI2CgVSB4Du4aLQijFU2+lhAFCwt9+42Hel6lQNIv6AntQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "graceful-fs": "^4.1.11"
      }
    },
    "node_modules/language-subtag-registry": {
      "version": "0.3.23",
      "resolved": "https://registry.npmjs.org/language-subtag-registry/-/language-subtag-registry-0.3.23.tgz",
      "integrity": "sha512-0K65Lea881pHotoGEa5gDlMxt3pctLi2RplBb7Ezh4rRdLEOtgi7n4EwK9lamnUCkKBqaeKRVebTq6BAxSkpXQ==",
      "dev": true,
      "license": "CC0-1.0"
    },
    "node_modules/language-tags": {
      "version": "1.0.9",
      "resolved": "https://registry.npmjs.org/language-tags/-/language-tags-1.0.9.tgz",
      "integrity": "sha512-MbjN408fEndfiQXbFQ1vnd+1NoLDsnQW41410oQBXiyXDMYH5z505juWa4KUE1LqxRC7DgOgZDbKLxHIwm27hA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "language-subtag-registry": "^0.3.20"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/levn": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/levn/-/levn-0.4.1.tgz",
      "integrity": "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1",
        "type-check": "~0.4.0"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/lightningcss": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.30.2.tgz",
      "integrity": "sha512-utfs7Pr5uJyyvDETitgsaqSyjCb2qNRAtuqUeWIAKztsOYdcACf2KtARYXg2pSvhkt+9NfoaNY7fxjl6nuMjIQ==",
      "devOptional": true,
      "license": "MPL-2.0",
      "dependencies": {
        "detect-libc": "^2.0.3"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      },
      "optionalDependencies": {
        "lightningcss-android-arm64": "1.30.2",
        "lightningcss-darwin-arm64": "1.30.2",
        "lightningcss-darwin-x64": "1.30.2",
        "lightningcss-freebsd-x64": "1.30.2",
        "lightningcss-linux-arm-gnueabihf": "1.30.2",
        "lightningcss-linux-arm64-gnu": "1.30.2",
        "lightningcss-linux-arm64-musl": "1.30.2",
        "lightningcss-linux-x64-gnu": "1.30.2",
        "lightningcss-linux-x64-musl": "1.30.2",
        "lightningcss-win32-arm64-msvc": "1.30.2",
        "lightningcss-win32-x64-msvc": "1.30.2"
      }
    },
    "node_modules/lightningcss-darwin-arm64": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.30.2.tgz",
      "integrity": "sha512-ylTcDJBN3Hp21TdhRT5zBOIi73P6/W0qwvlFEk22fkdXchtNTOU4Qc37SkzV+EKYxLouZ6M4LG9NfZ1qkhhBWA==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/locate-path": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/locate-path/-/locate-path-6.0.0.tgz",
      "integrity": "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-locate": "^5.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/lodash.merge": {
      "version": "4.6.2",
      "resolved": "https://registry.npmjs.org/lodash.merge/-/lodash.merge-4.6.2.tgz",
      "integrity": "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/loose-envify": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/loose-envify/-/loose-envify-1.4.0.tgz",
      "integrity": "sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "js-tokens": "^3.0.0 || ^4.0.0"
      },
      "bin": {
        "loose-envify": "cli.js"
      }
    },
    "node_modules/lru-cache": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-5.1.1.tgz",
      "integrity": "sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "yallist": "^3.0.2"
      }
    },
    "node_modules/magic-string": {
      "version": "0.30.21",
      "resolved": "https://registry.npmjs.org/magic-string/-/magic-string-0.30.21.tgz",
      "integrity": "sha512-vd2F4YUyEXKGcLHoq+TEyCjxueSeHnFxyyjNp80yg0XV4vUhnDer/lvvlqM/arB5bXQN5K2/3oinyCRyx8T2CQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.5"
      }
    },
    "node_modules/make-error": {
      "version": "1.3.6",
      "resolved": "https://registry.npmjs.org/make-error/-/make-error-1.3.6.tgz",
      "integrity": "sha512-s8UhlNe7vPKomQhC1qFelMokr/Sc3AgNbso3n74mVPA5LTZwkB9NlXf4XPamLxJE8h0gh73rM94xvwRT2CVInw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/merge2": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/merge2/-/merge2-1.4.1.tgz",
      "integrity": "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/micromatch": {
      "version": "4.0.8",
      "resolved": "https://registry.npmjs.org/micromatch/-/micromatch-4.0.8.tgz",
      "integrity": "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "braces": "^3.0.3",
        "picomatch": "^2.3.1"
      },
      "engines": {
        "node": ">=8.6"
      }
    },
    "node_modules/minimatch": {
      "version": "9.0.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-9.0.5.tgz",
      "integrity": "sha512-G6T0ZX48xgozx7587koeX9Ys2NYy6Gmv//P89sEte9V9whIapMNF4idKxnW2QtCcLiTWlb/wfCabAtAFWhhBow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^2.0.1"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/minimist": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/minimist/-/minimist-1.2.8.tgz",
      "integrity": "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/nanoid": {
      "version": "3.3.11",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.11.tgz",
      "integrity": "sha512-N8SpfPUnUp1bK+PMYW8qSWdl9U+wwNWI4QKxOYDy9JAro3WMX7p2OeVRF9v+347pnakNevPmiHhNmZ2HbFA76w==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/napi-postinstall": {
      "version": "0.3.4",
      "resolved": "https://registry.npmjs.org/napi-postinstall/-/napi-postinstall-0.3.4.tgz",
      "integrity": "sha512-PHI5f1O0EP5xJ9gQmFGMS6IZcrVvTjpXjz7Na41gTE7eE2hK11lg04CECCYEEjdc17EV4DO+fkGEtt7TpTaTiQ==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "napi-postinstall": "lib/cli.js"
      },
      "engines": {
        "node": "^12.20.0 || ^14.18.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/napi-postinstall"
      }
    },
    "node_modules/natural-compare": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/natural-compare/-/natural-compare-1.4.0.tgz",
      "integrity": "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/next": {
      "version": "16.1.2",
      "resolved": "https://registry.npmjs.org/next/-/next-16.1.2.tgz",
      "integrity": "sha512-SVSWX7wjUUDrIDVqhl4xm/jiOrvYGMG7NzVE/dGzzgs7r3dFGm4V19ia0xn3GDNtHCKM7C9h+5BoimnJBhmt9A==",
      "license": "MIT",
      "dependencies": {
        "@next/env": "16.1.2",
        "@swc/helpers": "0.5.15",
        "baseline-browser-mapping": "^2.8.3",
        "caniuse-lite": "^1.0.30001579",
        "postcss": "8.4.31",
        "styled-jsx": "5.1.6"
      },
      "bin": {
        "next": "dist/bin/next"
      },
      "engines": {
        "node": ">=20.9.0"
      },
      "optionalDependencies": {
        "@next/swc-darwin-arm64": "16.1.2",
        "@next/swc-darwin-x64": "16.1.2",
        "@next/swc-linux-arm64-gnu": "16.1.2",
        "@next/swc-linux-arm64-musl": "16.1.2",
        "@next/swc-linux-x64-gnu": "16.1.2",
        "@next/swc-linux-x64-musl": "16.1.2",
        "@next/swc-win32-arm64-msvc": "16.1.2",
        "@next/swc-win32-x64-msvc": "16.1.2",
        "sharp": "^0.34.4"
      },
      "peerDependencies": {
        "@opentelemetry/api": "^1.1.0",
        "@playwright/test": "^1.51.1",
        "babel-plugin-react-compiler": "*",
        "react": "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0",
        "react-dom": "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0",
        "sass": "^1.3.0"
      },
      "peerDependenciesMeta": {
        "@opentelemetry/api": {
          "optional": true
        },
        "@playwright/test": {
          "optional": true
        },
        "babel-plugin-react-compiler": {
          "optional": true
        },
        "sass": {
          "optional": true
        }
      }
    },
    "node_modules/next-auth": {
      "version": "5.0.0-beta.30",
      "resolved": "https://registry.npmjs.org/next-auth/-/next-auth-5.0.0-beta.30.tgz",
      "integrity": "sha512-+c51gquM3F6nMVmoAusRJ7RIoY0K4Ts9HCCwyy/BRoe4mp3msZpOzYMyb5LAYc1wSo74PMQkGDcaghIO7W6Xjg==",
      "license": "ISC",
      "dependencies": {
        "@auth/core": "0.41.0"
      },
      "peerDependencies": {
        "@simplewebauthn/browser": "^9.0.1",
        "@simplewebauthn/server": "^9.0.2",
        "next": "^14.0.0-0 || ^15.0.0 || ^16.0.0",
        "nodemailer": "^7.0.7",
        "react": "^18.2.0 || ^19.0.0"
      },
      "peerDependenciesMeta": {
        "@simplewebauthn/browser": {
          "optional": true
        },
        "@simplewebauthn/server": {
          "optional": true
        },
        "nodemailer": {
          "optional": true
        }
      }
    },
    "node_modules/next/node_modules/postcss": {
      "version": "8.4.31",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.4.31.tgz",
      "integrity": "sha512-PS08Iboia9mts/2ygV3eLpY5ghnUcfLV/EXTOW1E2qYxJKGGBUtNjN76FYHnMs36RmARn41bC0AZmn+rR0OVpQ==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.6",
        "picocolors": "^1.0.0",
        "source-map-js": "^1.0.2"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/node-fetch": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/node-fetch/-/node-fetch-2.7.0.tgz",
      "integrity": "sha512-c4FRfUm/dbcWZ7U+1Wq0AwCyFL+3nt2bEw05wfxSz+DWpWsitgmSgYmy2dQdWyKC1694ELPqMs/YzUSNozLt8A==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "whatwg-url": "^5.0.0"
      },
      "engines": {
        "node": "4.x || >=6.0.0"
      },
      "peerDependencies": {
        "encoding": "^0.1.0"
      },
      "peerDependenciesMeta": {
        "encoding": {
          "optional": true
        }
      }
    },
    "node_modules/node-fetch-native": {
      "version": "1.6.7",
      "resolved": "https://registry.npmjs.org/node-fetch-native/-/node-fetch-native-1.6.7.tgz",
      "integrity": "sha512-g9yhqoedzIUm0nTnTqAQvueMPVOuIY16bqgAJJC8XOOubYFNwz6IER9qs0Gq2Xd0+CecCKFjtdDTMA4u4xG06Q==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/node-forge": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/node-forge/-/node-forge-1.3.3.tgz",
      "integrity": "sha512-rLvcdSyRCyouf6jcOIPe/BgwG/d7hKjzMKOas33/pHEr6gbq18IK9zV7DiPvzsz0oBJPme6qr6H6kGZuI9/DZg==",
      "license": "(BSD-3-Clause OR GPL-2.0)",
      "engines": {
        "node": ">= 6.13.0"
      }
    },
    "node_modules/node-releases": {
      "version": "2.0.27",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.27.tgz",
      "integrity": "sha512-nmh3lCkYZ3grZvqcCH+fjmQ7X+H0OeZgP40OierEaAptX4XofMh5kwNbWh7lBduUzCcV/8kZ+NDLCwm2iorIlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/nodemailer": {
      "version": "7.0.12",
      "resolved": "https://registry.npmjs.org/nodemailer/-/nodemailer-7.0.12.tgz",
      "integrity": "sha512-H+rnK5bX2Pi/6ms3sN4/jRQvYSMltV6vqup/0SFOrxYYY/qoNvhXPlYq3e+Pm9RFJRwrMGbMIwi81M4dxpomhA==",
      "license": "MIT-0",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/nypm": {
      "version": "0.6.2",
      "resolved": "https://registry.npmjs.org/nypm/-/nypm-0.6.2.tgz",
      "integrity": "sha512-7eM+hpOtrKrBDCh7Ypu2lJ9Z7PNZBdi/8AT3AX8xoCj43BBVHD0hPSTEvMtkMpfs8FCqBGhxB+uToIQimA111g==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "citty": "^0.1.6",
        "consola": "^3.4.2",
        "pathe": "^2.0.3",
        "pkg-types": "^2.3.0",
        "tinyexec": "^1.0.1"
      },
      "bin": {
        "nypm": "dist/cli.mjs"
      },
      "engines": {
        "node": "^14.16.0 || >=16.10.0"
      }
    },
    "node_modules/oauth4webapi": {
      "version": "3.8.3",
      "resolved": "https://registry.npmjs.org/oauth4webapi/-/oauth4webapi-3.8.3.tgz",
      "integrity": "sha512-pQ5BsX3QRTgnt5HxgHwgunIRaDXBdkT23tf8dfzmtTIL2LTpdmxgbpbBm0VgFWAIDlezQvQCTgnVIUmHupXHxw==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/panva"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-inspect": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/object-inspect/-/object-inspect-1.13.4.tgz",
      "integrity": "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/object-keys": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/object-keys/-/object-keys-1.1.1.tgz",
      "integrity": "sha512-NuAESUOUMrlIXOfHKzD6bpPu3tYt3xvjNdRIQ+FeT0lNb4K8WR70CaDxhuNguS2XG+GjkyMwOzsN5ZktImfhLA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/object.assign": {
      "version": "4.1.7",
      "resolved": "https://registry.npmjs.org/object.assign/-/object.assign-4.1.7.tgz",
      "integrity": "sha512-nK28WOo+QIjBkDduTINE4JkF/UJJKyf2EJxvJKfblDpyg0Q+pkOHNTL0Qwy6NP6FhE/EnzV73BxxqcJaXY9anw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.0.0",
        "has-symbols": "^1.1.0",
        "object-keys": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/object.entries": {
      "version": "1.1.9",
      "resolved": "https://registry.npmjs.org/object.entries/-/object.entries-1.1.9.tgz",
      "integrity": "sha512-8u/hfXFRBD1O0hPUjioLhoWFHRmt6tKA4/vZPyckBr18l1KE9uHrFaFaUi8MDRTpi4uak2goyPTSNJLXX2k2Hw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/object.fromentries": {
      "version": "2.0.8",
      "resolved": "https://registry.npmjs.org/object.fromentries/-/object.fromentries-2.0.8.tgz",
      "integrity": "sha512-k6E21FzySsSK5a21KRADBd/NGneRegFO5pLHfdQLpRDETUNJueLXs3WCzyQ3tFRDYgbq3KHGXfTbi2bs8WQ6rQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.2",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/object.groupby": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/object.groupby/-/object.groupby-1.0.3.tgz",
      "integrity": "sha512-+Lhy3TQTuzXI5hevh8sBGqbmurHbbIjAi0Z4S63nthVLmLxfbj4T54a4CfZrXIrt9iP4mVAPYMo/v99taj3wjQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/object.values": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/object.values/-/object.values-1.2.1.tgz",
      "integrity": "sha512-gXah6aZrcUxjWg2zR2MwouP2eHlCBzdV4pygudehaKXSGW4v2AsRQUK+lwwXhii6KFZcunEnmSUoYp5CXibxtA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/ohash": {
      "version": "2.0.11",
      "resolved": "https://registry.npmjs.org/ohash/-/ohash-2.0.11.tgz",
      "integrity": "sha512-RdR9FQrFwNBNXAr4GixM8YaRZRJ5PUWbKYbE5eOsrwAjJW0q2REGcf79oYPsLyskQCZG1PLN+S/K1V00joZAoQ==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/open": {
      "version": "7.4.2",
      "resolved": "https://registry.npmjs.org/open/-/open-7.4.2.tgz",
      "integrity": "sha512-MVHddDVweXZF3awtlAS+6pgKLlm/JgxZ90+/NBurBoQctVOOB/zDdVjcyPzQ+0laDGbsWgrRkflI65sQeOgT9Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-docker": "^2.0.0",
        "is-wsl": "^2.1.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/optionator": {
      "version": "0.9.4",
      "resolved": "https://registry.npmjs.org/optionator/-/optionator-0.9.4.tgz",
      "integrity": "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "deep-is": "^0.1.3",
        "fast-levenshtein": "^2.0.6",
        "levn": "^0.4.1",
        "prelude-ls": "^1.2.1",
        "type-check": "^0.4.0",
        "word-wrap": "^1.2.5"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/own-keys": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/own-keys/-/own-keys-1.0.1.tgz",
      "integrity": "sha512-qFOyK5PjiWZd+QQIh+1jhdb9LpxTF0qs7Pm8o5QHYZ0M3vKqSqzsZaEB6oWlxZ+q2sJBMI/Ktgd2N5ZwQoRHfg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "get-intrinsic": "^1.2.6",
        "object-keys": "^1.1.1",
        "safe-push-apply": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/p-limit": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/p-limit/-/p-limit-3.1.0.tgz",
      "integrity": "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "yocto-queue": "^0.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/p-locate": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/p-locate/-/p-locate-5.0.0.tgz",
      "integrity": "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-limit": "^3.0.2"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/parent-module": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/parent-module/-/parent-module-1.0.1.tgz",
      "integrity": "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "callsites": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/passkit-generator": {
      "version": "3.5.7",
      "resolved": "https://registry.npmjs.org/passkit-generator/-/passkit-generator-3.5.7.tgz",
      "integrity": "sha512-DS9qRZFUhTsMdyfV9t8IyLHDI6Iyf6RCRJF3oX0Trnz9COgYBB6gceIJdUcqfdGY0vvAf5rNWdFnEwzo7l3pmg==",
      "license": "MIT",
      "dependencies": {
        "do-not-zip": "^1.0.0",
        "joi": "17.4.2",
        "node-forge": "^1.3.2",
        "tslib": "^2.7.0"
      },
      "engines": {
        "node": ">=14.21.3"
      }
    },
    "node_modules/patch-package": {
      "version": "8.0.1",
      "resolved": "https://registry.npmjs.org/patch-package/-/patch-package-8.0.1.tgz",
      "integrity": "sha512-VsKRIA8f5uqHQ7NGhwIna6Bx6D9s/1iXlA1hthBVBEbkq+t4kXD0HHt+rJhf/Z+Ci0F/HCB2hvn0qLdLG+Qxlw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@yarnpkg/lockfile": "^1.1.0",
        "chalk": "^4.1.2",
        "ci-info": "^3.7.0",
        "cross-spawn": "^7.0.3",
        "find-yarn-workspace-root": "^2.0.0",
        "fs-extra": "^10.0.0",
        "json-stable-stringify": "^1.0.2",
        "klaw-sync": "^6.0.0",
        "minimist": "^1.2.6",
        "open": "^7.4.2",
        "semver": "^7.5.3",
        "slash": "^2.0.0",
        "tmp": "^0.2.4",
        "yaml": "^2.2.2"
      },
      "bin": {
        "patch-package": "index.js"
      },
      "engines": {
        "node": ">=14",
        "npm": ">5"
      }
    },
    "node_modules/path-exists": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz",
      "integrity": "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-parse": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/path-parse/-/path-parse-1.0.7.tgz",
      "integrity": "sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/pathe": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/pathe/-/pathe-2.0.3.tgz",
      "integrity": "sha512-WUjGcAqP1gQacoQe+OBJsFA7Ld4DyXuUIjZ5cc75cLHvJ7dtNsTugphxIADwspS+AraAUePCKrSVtPLFj/F88w==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/pdf-parse": {
      "version": "2.4.5",
      "resolved": "https://registry.npmjs.org/pdf-parse/-/pdf-parse-2.4.5.tgz",
      "integrity": "sha512-mHU89HGh7v+4u2ubfnevJ03lmPgQ5WU4CxAVmTSh/sxVTEDYd1er/dKS/A6vg77NX47KTEoihq8jZBLr8Cxuwg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@napi-rs/canvas": "0.1.80",
        "pdfjs-dist": "5.4.296"
      },
      "bin": {
        "pdf-parse": "bin/cli.mjs"
      },
      "engines": {
        "node": ">=20.16.0 <21 || >=22.3.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/mehmet-kozan"
      }
    },
    "node_modules/pdfjs-dist": {
      "version": "5.4.296",
      "resolved": "https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-5.4.296.tgz",
      "integrity": "sha512-DlOzet0HO7OEnmUmB6wWGJrrdvbyJKftI1bhMitK7O2N8W2gc757yyYBbINy9IDafXAV9wmKr9t7xsTaNKRG5Q==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=20.16.0 || >=22.3.0"
      },
      "optionalDependencies": {
        "@napi-rs/canvas": "^0.1.80"
      }
    },
    "node_modules/pend": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/pend/-/pend-1.2.0.tgz",
      "integrity": "sha512-F3asv42UuXchdzt+xXqfW1OGlVBe+mxa2mqI0pg5yAHZPvFmY3Y6drSf/GQ1A86WgWEN9Kzh/WrgKa6iGcHXLg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/perfect-debounce": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/perfect-debounce/-/perfect-debounce-1.0.0.tgz",
      "integrity": "sha512-xCy9V055GLEqoFaHoC1SoLIaLmWctgCUaBaWxDZ7/Zx4CTyX7cJQLJOok/orfjZAh9kEYpjJa4d0KcJmCbctZA==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.1.tgz",
      "integrity": "sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/pkg-types": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/pkg-types/-/pkg-types-2.3.0.tgz",
      "integrity": "sha512-SIqCzDRg0s9npO5XQ3tNZioRY1uK06lA41ynBC1YmFTmnY6FjUjVt6s4LoADmwoig1qqD0oK8h1p/8mlMx8Oig==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "confbox": "^0.2.2",
        "exsolve": "^1.0.7",
        "pathe": "^2.0.3"
      }
    },
    "node_modules/possible-typed-array-names": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/possible-typed-array-names/-/possible-typed-array-names-1.1.0.tgz",
      "integrity": "sha512-/+5VFTchJDoVj3bhoqi6UeymcD00DAwb1nJwamzPvHEszJ4FpF6SNNbUbOS8yI56qHzdV8eK0qEfOSiodkTdxg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.6",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.6.tgz",
      "integrity": "sha512-3Ybi1tAuwAP9s0r1UQ2J4n5Y0G05bJkpUIO0/bI9MhwmD70S5aTWbXGBwxHrelT+XM1k6dM0pk+SwNkpTRN7Pg==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.11",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/postinstall-postinstall": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/postinstall-postinstall/-/postinstall-postinstall-2.1.0.tgz",
      "integrity": "sha512-7hQX6ZlZXIoRiWNrbMQaLzUUfH+sSx39u8EJ9HYuDc1kLo9IXKWjM5RSquZN1ad5GnH8CGFM78fsAAQi3OKEEQ==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT"
    },
    "node_modules/preact": {
      "version": "10.24.3",
      "resolved": "https://registry.npmjs.org/preact/-/preact-10.24.3.tgz",
      "integrity": "sha512-Z2dPnBnMUfyQfSQ+GBdsGa16hz35YmLmtTLhM169uW944hYL6xzTYkJjC07j+Wosz733pMWx0fgON3JNw1jJQA==",
      "license": "MIT",
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/preact"
      }
    },
    "node_modules/preact-render-to-string": {
      "version": "6.5.11",
      "resolved": "https://registry.npmjs.org/preact-render-to-string/-/preact-render-to-string-6.5.11.tgz",
      "integrity": "sha512-ubnauqoGczeGISiOh6RjX0/cdaF8v/oDXIjO85XALCQjwQP+SB4RDXXtvZ6yTYSjG+PC1QRP2AhPgCEsM2EvUw==",
      "license": "MIT",
      "peerDependencies": {
        "preact": ">=10"
      }
    },
    "node_modules/prelude-ls": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/prelude-ls/-/prelude-ls-1.2.1.tgz",
      "integrity": "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/prisma": {
      "version": "6.19.2",
      "resolved": "https://registry.npmjs.org/prisma/-/prisma-6.19.2.tgz",
      "integrity": "sha512-XTKeKxtQElcq3U9/jHyxSPgiRgeYDKxWTPOf6NkXA0dNj5j40MfEsZkMbyNpwDWCUv7YBFUl7I2VK/6ALbmhEg==",
      "devOptional": true,
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@prisma/config": "6.19.2",
        "@prisma/engines": "6.19.2"
      },
      "bin": {
        "prisma": "build/index.js"
      },
      "engines": {
        "node": ">=18.18"
      },
      "peerDependencies": {
        "typescript": ">=5.1.0"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/prop-types": {
      "version": "15.8.1",
      "resolved": "https://registry.npmjs.org/prop-types/-/prop-types-15.8.1.tgz",
      "integrity": "sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.4.0",
        "object-assign": "^4.1.1",
        "react-is": "^16.13.1"
      }
    },
    "node_modules/proxy-from-env": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/proxy-from-env/-/proxy-from-env-1.1.0.tgz",
      "integrity": "sha512-D+zkORCbA9f1tdWRK0RaCR3GPv50cMxcrz4X8k5LTSUD1Dkw47mKJEZQNunItRTkWwgtaUSo1RVFRIG9ZXiFYg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/punycode": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz",
      "integrity": "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/pure-rand": {
      "version": "6.1.0",
      "resolved": "https://registry.npmjs.org/pure-rand/-/pure-rand-6.1.0.tgz",
      "integrity": "sha512-bVWawvoZoBYpp6yIoQtQXHZjmz35RSVHnUOTefl8Vcjr8snTPY1wnpSPMWekcFwbxI6gtmT7rSYPFvz71ldiOA==",
      "devOptional": true,
      "funding": [
        {
          "type": "individual",
          "url": "https://github.com/sponsors/dubzzz"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fast-check"
        }
      ],
      "license": "MIT"
    },
    "node_modules/pvtsutils": {
      "version": "1.3.6",
      "resolved": "https://registry.npmjs.org/pvtsutils/-/pvtsutils-1.3.6.tgz",
      "integrity": "sha512-PLgQXQ6H2FWCaeRak8vvk1GW462lMxB5s3Jm673N82zI4vqtVUPuZdffdZbPDFRoU8kAhItWFtPCWiPpp4/EDg==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "tslib": "^2.8.1"
      }
    },
    "node_modules/pvutils": {
      "version": "1.1.5",
      "resolved": "https://registry.npmjs.org/pvutils/-/pvutils-1.1.5.tgz",
      "integrity": "sha512-KTqnxsgGiQ6ZAzZCVlJH5eOjSnvlyEgx1m8bkRJfOhmGRqfo5KLvmAlACQkrjEtOQ4B7wF9TdSLIs9O90MX9xA==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/queue-microtask": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/queue-microtask/-/queue-microtask-1.2.3.tgz",
      "integrity": "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/rc9": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/rc9/-/rc9-2.1.2.tgz",
      "integrity": "sha512-btXCnMmRIBINM2LDZoEmOogIZU7Qe7zn4BpomSKZ/ykbLObuBdvG+mFq11DL6fjH1DRwHhrlgtYWG96bJiC7Cg==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "defu": "^6.1.4",
        "destr": "^2.0.3"
      }
    },
    "node_modules/react": {
      "version": "19.2.0",
      "resolved": "https://registry.npmjs.org/react/-/react-19.2.0.tgz",
      "integrity": "sha512-tmbWg6W31tQLeB5cdIBOicJDJRR2KzXsV7uSK9iNfLWQ5bIZfxuPEHp7M8wiHyHnn0DD1i7w3Zmin0FtkrwoCQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.2.0",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.2.0.tgz",
      "integrity": "sha512-UlbRu4cAiGaIewkPyiRGJk0imDN2T3JjieT6spoL2UeSf5od4n5LB/mQ4ejmxhCFT1tYe8IvaFulzynWovsEFQ==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.27.0"
      },
      "peerDependencies": {
        "react": "^19.2.0"
      }
    },
    "node_modules/react-is": {
      "version": "16.13.1",
      "resolved": "https://registry.npmjs.org/react-is/-/react-is-16.13.1.tgz",
      "integrity": "sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/readdirp": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/readdirp/-/readdirp-4.1.2.tgz",
      "integrity": "sha512-GDhwkLfywWL2s6vEjyhri+eXmfH6j1L7JE27WhqLeYzoh/A3DBaYGEj2H/HFZCn/kMfim73FXxEJTw06WtxQwg==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": ">= 14.18.0"
      },
      "funding": {
        "type": "individual",
        "url": "https://paulmillr.com/funding/"
      }
    },
    "node_modules/reflect.getprototypeof": {
      "version": "1.0.10",
      "resolved": "https://registry.npmjs.org/reflect.getprototypeof/-/reflect.getprototypeof-1.0.10.tgz",
      "integrity": "sha512-00o4I+DVrefhv+nX0ulyi3biSHCPDe+yLv5o/p6d/UVlirijB8E16FtfwSAi4g3tcqrQ4lRAqQSoFEZJehYEcw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.9",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0",
        "get-intrinsic": "^1.2.7",
        "get-proto": "^1.0.1",
        "which-builtin-type": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/regexp.prototype.flags": {
      "version": "1.5.4",
      "resolved": "https://registry.npmjs.org/regexp.prototype.flags/-/regexp.prototype.flags-1.5.4.tgz",
      "integrity": "sha512-dYqgNSZbDwkaJ2ceRd9ojCGjBq+mOm9LmtXnAnEGyHhN/5R7iDW2TRw3h+o/jCFxus3P2LfWIIiwowAjANm7IA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-errors": "^1.3.0",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "set-function-name": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/resolve": {
      "version": "1.22.11",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-1.22.11.tgz",
      "integrity": "sha512-RfqAvLnMl313r7c9oclB1HhUEAezcpLjz95wFH4LVuhk9JF/r22qmVP9AMmOU4vMX7Q8pN8jwNg/CSpdFnMjTQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-core-module": "^2.16.1",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/resolve-from": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-4.0.0.tgz",
      "integrity": "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/resolve-pkg-maps": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/resolve-pkg-maps/-/resolve-pkg-maps-1.0.0.tgz",
      "integrity": "sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/privatenumber/resolve-pkg-maps?sponsor=1"
      }
    },
    "node_modules/reusify": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/reusify/-/reusify-1.1.0.tgz",
      "integrity": "sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "iojs": ">=1.0.0",
        "node": ">=0.10.0"
      }
    },
    "node_modules/run-parallel": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/run-parallel/-/run-parallel-1.2.0.tgz",
      "integrity": "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "queue-microtask": "^1.2.2"
      }
    },
    "node_modules/safe-array-concat": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/safe-array-concat/-/safe-array-concat-1.1.3.tgz",
      "integrity": "sha512-AURm5f0jYEOydBj7VQlVvDrjeFgthDdEF5H1dP+6mNpoXOMo1quQqJ4wvJDyRZ9+pO3kGWoOdmV08cSv2aJV6Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.2",
        "get-intrinsic": "^1.2.6",
        "has-symbols": "^1.1.0",
        "isarray": "^2.0.5"
      },
      "engines": {
        "node": ">=0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/safe-push-apply": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/safe-push-apply/-/safe-push-apply-1.0.0.tgz",
      "integrity": "sha512-iKE9w/Z7xCzUMIZqdBsp6pEQvwuEebH4vdpjcDWnyzaI6yl6O9FHvVpmGelvEHNsoY6wGblkxR6Zty/h00WiSA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "isarray": "^2.0.5"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/safe-regex-test": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/safe-regex-test/-/safe-regex-test-1.1.0.tgz",
      "integrity": "sha512-x/+Cz4YrimQxQccJf5mKEbIa1NzeCRNI5Ecl/ekmlYaampdNLPalVyIcCZNNH3MvmqBugV5TMYZXv0ljslUlaw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "is-regex": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/scheduler": {
      "version": "0.27.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.27.0.tgz",
      "integrity": "sha512-eNv+WrVbKu1f3vbYJT/xtiF5syA5HPIMtf9IgY/nKg0sWqzAUEvqY/xm7OcZc/qafLx/iO9FgOmeSAp4v5ti/Q==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "7.7.3",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.7.3.tgz",
      "integrity": "sha512-SdsKMrI9TdgjdweUSR9MweHA4EJ8YxHn8DFaDisvhVlUOe4BF1tLD7GAj0lIqWVl+dPb/rExr0Btby5loQm20Q==",
      "devOptional": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/set-function-length": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/set-function-length/-/set-function-length-1.2.2.tgz",
      "integrity": "sha512-pgRc4hJ4/sNjWCSS9AmnS40x3bNMDTknHgL5UaMBTMyJnU90EgWh1Rz+MC9eFu4BuN/UwZjKQuY/1v3rM7HMfg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.1.4",
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2",
        "get-intrinsic": "^1.2.4",
        "gopd": "^1.0.1",
        "has-property-descriptors": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/set-function-name": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/set-function-name/-/set-function-name-2.0.2.tgz",
      "integrity": "sha512-7PGFlmtwsEADb0WYyvCMa1t+yke6daIG4Wirafur5kcf+MhUnPms1UeR0CKQdTZD81yESwMHbtn+TR+dMviakQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.1.4",
        "es-errors": "^1.3.0",
        "functions-have-names": "^1.2.3",
        "has-property-descriptors": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/set-proto": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/set-proto/-/set-proto-1.0.0.tgz",
      "integrity": "sha512-RJRdvCo6IAnPdsvP/7m6bsQqNnn1FCBX5ZNtFL98MmFF/4xAIJTIg1YbHW5DC2W5SKZanrC6i4HsJqlajw/dZw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/sharp": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/sharp/-/sharp-0.34.5.tgz",
      "integrity": "sha512-Ou9I5Ft9WNcCbXrU9cMgPBcCK8LiwLqcbywW3t4oDV37n1pzpuNLsYiAV8eODnjbtQlSDwZ2cUEeQz4E54Hltg==",
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "optional": true,
      "dependencies": {
        "@img/colour": "^1.0.0",
        "detect-libc": "^2.1.2",
        "semver": "^7.7.3"
      },
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-darwin-arm64": "0.34.5",
        "@img/sharp-darwin-x64": "0.34.5",
        "@img/sharp-libvips-darwin-arm64": "1.2.4",
        "@img/sharp-libvips-darwin-x64": "1.2.4",
        "@img/sharp-libvips-linux-arm": "1.2.4",
        "@img/sharp-libvips-linux-arm64": "1.2.4",
        "@img/sharp-libvips-linux-ppc64": "1.2.4",
        "@img/sharp-libvips-linux-riscv64": "1.2.4",
        "@img/sharp-libvips-linux-s390x": "1.2.4",
        "@img/sharp-libvips-linux-x64": "1.2.4",
        "@img/sharp-libvips-linuxmusl-arm64": "1.2.4",
        "@img/sharp-libvips-linuxmusl-x64": "1.2.4",
        "@img/sharp-linux-arm": "0.34.5",
        "@img/sharp-linux-arm64": "0.34.5",
        "@img/sharp-linux-ppc64": "0.34.5",
        "@img/sharp-linux-riscv64": "0.34.5",
        "@img/sharp-linux-s390x": "0.34.5",
        "@img/sharp-linux-x64": "0.34.5",
        "@img/sharp-linuxmusl-arm64": "0.34.5",
        "@img/sharp-linuxmusl-x64": "0.34.5",
        "@img/sharp-wasm32": "0.34.5",
        "@img/sharp-win32-arm64": "0.34.5",
        "@img/sharp-win32-ia32": "0.34.5",
        "@img/sharp-win32-x64": "0.34.5"
      }
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/side-channel": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/side-channel/-/side-channel-1.1.0.tgz",
      "integrity": "sha512-ZX99e6tRweoUXqR+VBrslhda51Nh5MTQwou5tnUDgbtyM0dBgmhEDtWGP/xbKn6hqfPRHujUNwz5fy/wbbhnpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.3",
        "side-channel-list": "^1.0.0",
        "side-channel-map": "^1.0.1",
        "side-channel-weakmap": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-list": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/side-channel-list/-/side-channel-list-1.0.0.tgz",
      "integrity": "sha512-FCLHtRD/gnpCiCHEiJLOwdmFP+wzCmDEkc9y7NsYxeF4u7Btsn1ZuwgwJGxImImHicJArLP4R0yX4c2KCrMrTA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-map": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-map/-/side-channel-map-1.0.1.tgz",
      "integrity": "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-weakmap": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/side-channel-weakmap/-/side-channel-weakmap-1.0.2.tgz",
      "integrity": "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3",
        "side-channel-map": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/slash": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/slash/-/slash-2.0.0.tgz",
      "integrity": "sha512-ZYKh3Wh2z1PpEXWr0MpSBZ0V6mZHAQfYevttO11c51CaWjGTaadiKZ+wVt1PbMlDV5qhMFslpZCemhwOK7C89A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/stable-hash": {
      "version": "0.0.5",
      "resolved": "https://registry.npmjs.org/stable-hash/-/stable-hash-0.0.5.tgz",
      "integrity": "sha512-+L3ccpzibovGXFK+Ap/f8LOS0ahMrHTf3xu7mMLSpEGU0EO9ucaysSylKo9eRDFNhWve/y275iPmIZ4z39a9iA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/stop-iteration-iterator": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/stop-iteration-iterator/-/stop-iteration-iterator-1.1.0.tgz",
      "integrity": "sha512-eLoXW/DHyl62zxY4SCaIgnRhuMr6ri4juEYARS8E6sCEqzKpOiE521Ucofdx+KnDZl5xmvGYaaKCk5FEOxJCoQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "internal-slot": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/string.prototype.includes": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/string.prototype.includes/-/string.prototype.includes-2.0.1.tgz",
      "integrity": "sha512-o7+c9bW6zpAdJHTtujeePODAhkuicdAryFsfVKwA+wGw89wJ4GTY484WTucM9hLtDEOpOvI+aHnzqnC5lHp4Rg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.3"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/string.prototype.matchall": {
      "version": "4.0.12",
      "resolved": "https://registry.npmjs.org/string.prototype.matchall/-/string.prototype.matchall-4.0.12.tgz",
      "integrity": "sha512-6CC9uyBL+/48dYizRf7H7VAYCMCNTBeM78x/VTUe9bFEaxBepPJDa1Ow99LqI/1yF7kuy7Q3cQsYMrcjGUcskA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.6",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0",
        "get-intrinsic": "^1.2.6",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "internal-slot": "^1.1.0",
        "regexp.prototype.flags": "^1.5.3",
        "set-function-name": "^2.0.2",
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/string.prototype.repeat": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/string.prototype.repeat/-/string.prototype.repeat-1.0.0.tgz",
      "integrity": "sha512-0u/TldDbKD8bFCQ/4f5+mNRrXwZ8hg2w7ZR8wa16e8z9XpePWl3eGEcUD0OXpEH/VJH/2G3gjUtR3ZOiBe2S/w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-properties": "^1.1.3",
        "es-abstract": "^1.17.5"
      }
    },
    "node_modules/string.prototype.trim": {
      "version": "1.2.10",
      "resolved": "https://registry.npmjs.org/string.prototype.trim/-/string.prototype.trim-1.2.10.tgz",
      "integrity": "sha512-Rs66F0P/1kedk5lyYyH9uBzuiI/kNRmwJAR9quK6VOtIpZ2G+hMZd+HQbbv25MgCA6gEffoMZYxlTod4WcdrKA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.2",
        "define-data-property": "^1.1.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.5",
        "es-object-atoms": "^1.0.0",
        "has-property-descriptors": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/string.prototype.trimend": {
      "version": "1.0.9",
      "resolved": "https://registry.npmjs.org/string.prototype.trimend/-/string.prototype.trimend-1.0.9.tgz",
      "integrity": "sha512-G7Ok5C6E/j4SGfyLCloXTrngQIQU3PWtXGst3yM7Bea9FRURf1S42ZHlZZtsNque2FN2PoUhfZXYLNWwEr4dLQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.2",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/string.prototype.trimstart": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/string.prototype.trimstart/-/string.prototype.trimstart-1.0.8.tgz",
      "integrity": "sha512-UXSH262CSZY1tfu3G3Secr6uGLCFVPMhIqHjlgCUtCCcgihYc/xKs9djMTMUOb2j1mVSeU8EU6NWc/iQKU6Gfg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/strip-bom": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/strip-bom/-/strip-bom-3.0.0.tgz",
      "integrity": "sha512-vavAMRXOgBVNF6nyEEmL3DBK19iRpDcoIwW+swQ+CbGiu7lju6t+JklA1MHweoWtadgt4ISVUsXLyDq34ddcwA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/strnum": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/strnum/-/strnum-2.1.2.tgz",
      "integrity": "sha512-l63NF9y/cLROq/yqKXSLtcMeeyOfnSQlfMSlzFt/K73oIaD8DGaQWd7Z34X9GPiKqP5rbSh84Hl4bOlLcjiSrQ==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/NaturalIntelligence"
        }
      ],
      "license": "MIT"
    },
    "node_modules/styled-jsx": {
      "version": "5.1.6",
      "resolved": "https://registry.npmjs.org/styled-jsx/-/styled-jsx-5.1.6.tgz",
      "integrity": "sha512-qSVyDTeMotdvQYoHWLNGwRFJHC+i+ZvdBRYosOFgC+Wg1vx4frN2/RG/NA7SYqqvKNLf39P2LSRA2pu6n0XYZA==",
      "license": "MIT",
      "dependencies": {
        "client-only": "0.0.1"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "peerDependencies": {
        "react": ">= 16.8.0 || 17.x.x || ^18.0.0-0 || ^19.0.0-0"
      },
      "peerDependenciesMeta": {
        "@babel/core": {
          "optional": true
        },
        "babel-plugin-macros": {
          "optional": true
        }
      }
    },
    "node_modules/supports-color": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-7.2.0.tgz",
      "integrity": "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/supports-preserve-symlinks-flag": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/supports-preserve-symlinks-flag/-/supports-preserve-symlinks-flag-1.0.0.tgz",
      "integrity": "sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/tailwindcss": {
      "version": "4.1.18",
      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-4.1.18.tgz",
      "integrity": "sha512-4+Z+0yiYyEtUVCScyfHCxOYP06L5Ne+JiHhY2IjR2KWMIWhJOYZKLSGZaP5HkZ8+bY0cxfzwDE5uOmzFXyIwxw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tapable": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/tapable/-/tapable-2.3.0.tgz",
      "integrity": "sha512-g9ljZiwki/LfxmQADO3dEY1CbpmXT5Hm2fJ+QaGKwSXUylMybePR7/67YW7jOrrvjEgL1Fmz5kzyAjWVWLlucg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/webpack"
      }
    },
    "node_modules/tinyexec": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/tinyexec/-/tinyexec-1.0.2.tgz",
      "integrity": "sha512-W/KYk+NFhkmsYpuHq5JykngiOCnxeVL8v8dFnqxSD8qEEdRfXk1SDM6JzNqcERbcGYj9tMrDQBYV9cjgnunFIg==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.15",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.15.tgz",
      "integrity": "sha512-j2Zq4NyQYG5XMST4cbs02Ak8iJUdxRM0XI5QyxXuZOzKOINmWurp3smXu3y5wDcJrptwpSjgXHzIQxR0omXljQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.3"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/tinyglobby/node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/tinyglobby/node_modules/picomatch": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.3.tgz",
      "integrity": "sha512-5gTmgEY/sqK6gFXLIsQNH19lWb4ebPDLA4SdLP7dsWkIXHWlG66oPuVvXSGFPppYZz8ZDZq0dYYrbHfBCVUb1Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/tmp": {
      "version": "0.2.5",
      "resolved": "https://registry.npmjs.org/tmp/-/tmp-0.2.5.tgz",
      "integrity": "sha512-voyz6MApa1rQGUxT3E+BK7/ROe8itEx7vD8/HEvt4xwXucvQ5G5oeEiHkmHZJuBO21RpOf+YYm9MOivj709jow==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=14.14"
      }
    },
    "node_modules/to-regex-range": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/to-regex-range/-/to-regex-range-5.0.1.tgz",
      "integrity": "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-number": "^7.0.0"
      },
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/tr46": {
      "version": "0.0.3",
      "resolved": "https://registry.npmjs.org/tr46/-/tr46-0.0.3.tgz",
      "integrity": "sha512-N3WMsuqV66lT30CrXNbEjx4GEwlow3v6rr4mCcv6prnfwhS01rkgyFdjPNBYd9br7LpXV1+Emh01fHnq2Gdgrw==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/ts-api-utils": {
      "version": "2.4.0",
      "resolved": "https://registry.npmjs.org/ts-api-utils/-/ts-api-utils-2.4.0.tgz",
      "integrity": "sha512-3TaVTaAv2gTiMB35i3FiGJaRfwb3Pyn/j3m/bfAvGe8FB7CF6u+LMYqYlDh7reQf7UNvoTvdfAqHGmPGOSsPmA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18.12"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4"
      }
    },
    "node_modules/ts-node": {
      "version": "10.9.2",
      "resolved": "https://registry.npmjs.org/ts-node/-/ts-node-10.9.2.tgz",
      "integrity": "sha512-f0FFpIdcHgn8zcPSbf1dRevwt047YMnaiJM3u2w2RewrB+fob/zePZcrOyQoLMMO7aBIddLcQIEK5dYjkLnGrQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@cspotcode/source-map-support": "^0.8.0",
        "@tsconfig/node10": "^1.0.7",
        "@tsconfig/node12": "^1.0.7",
        "@tsconfig/node14": "^1.0.0",
        "@tsconfig/node16": "^1.0.2",
        "acorn": "^8.4.1",
        "acorn-walk": "^8.1.1",
        "arg": "^4.1.0",
        "create-require": "^1.1.0",
        "diff": "^4.0.1",
        "make-error": "^1.1.1",
        "v8-compile-cache-lib": "^3.0.1",
        "yn": "3.1.1"
      },
      "bin": {
        "ts-node": "dist/bin.js",
        "ts-node-cwd": "dist/bin-cwd.js",
        "ts-node-esm": "dist/bin-esm.js",
        "ts-node-script": "dist/bin-script.js",
        "ts-node-transpile-only": "dist/bin-transpile.js",
        "ts-script": "dist/bin-script-deprecated.js"
      },
      "peerDependencies": {
        "@swc/core": ">=1.2.50",
        "@swc/wasm": ">=1.2.50",
        "@types/node": "*",
        "typescript": ">=2.7"
      },
      "peerDependenciesMeta": {
        "@swc/core": {
          "optional": true
        },
        "@swc/wasm": {
          "optional": true
        }
      }
    },
    "node_modules/tsconfig-paths": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/tsconfig-paths/-/tsconfig-paths-4.2.0.tgz",
      "integrity": "sha512-NoZ4roiN7LnbKn9QqE1amc9DJfzvZXxF4xDavcOWt1BPkdx+m+0gJuPM+S0vCe7zTJMYUP0R8pO2XMr+Y8oLIg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "json5": "^2.2.2",
        "minimist": "^1.2.6",
        "strip-bom": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "license": "0BSD"
    },
    "node_modules/tsx": {
      "version": "4.19.2",
      "resolved": "https://registry.npmjs.org/tsx/-/tsx-4.19.2.tgz",
      "integrity": "sha512-pOUl6Vo2LUq/bSa8S5q7b91cgNSjctn9ugq/+Mvow99qW6x/UZYwzxy/3NmqoT66eHYfCVvFvACC58UBPFf28g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "esbuild": "~0.23.0",
        "get-tsconfig": "^4.7.5"
      },
      "bin": {
        "tsx": "dist/cli.mjs"
      },
      "engines": {
        "node": ">=18.0.0"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      }
    },
    "node_modules/type-check": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz",
      "integrity": "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/typed-array-buffer": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/typed-array-buffer/-/typed-array-buffer-1.0.3.tgz",
      "integrity": "sha512-nAYYwfY3qnzX30IkA6AQZjVbtK6duGontcQm1WSG1MD94YLqK0515GNApXkoxKOWMusVssAHWLh9SeaoefYFGw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "is-typed-array": "^1.1.14"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/typed-array-byte-length": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/typed-array-byte-length/-/typed-array-byte-length-1.0.3.tgz",
      "integrity": "sha512-BaXgOuIxz8n8pIq3e7Atg/7s+DpiYrxn4vdot3w9KbnBhcRQq6o3xemQdIfynqSeXeDrF32x+WvfzmOjPiY9lg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "for-each": "^0.3.3",
        "gopd": "^1.2.0",
        "has-proto": "^1.2.0",
        "is-typed-array": "^1.1.14"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/typed-array-byte-offset": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/typed-array-byte-offset/-/typed-array-byte-offset-1.0.4.tgz",
      "integrity": "sha512-bTlAFB/FBYMcuX81gbL4OcpH5PmlFHqlCCpAl8AlEzMz5k53oNDvN8p1PNOWLEmI2x4orp3raOFB51tv9X+MFQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "available-typed-arrays": "^1.0.7",
        "call-bind": "^1.0.8",
        "for-each": "^0.3.3",
        "gopd": "^1.2.0",
        "has-proto": "^1.2.0",
        "is-typed-array": "^1.1.15",
        "reflect.getprototypeof": "^1.0.9"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/typed-array-length": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/typed-array-length/-/typed-array-length-1.0.7.tgz",
      "integrity": "sha512-3KS2b+kL7fsuk/eJZ7EQdnEmQoaho/r6KUef7hxvltNA5DR8NAUM+8wJMbJyZ4G9/7i3v5zPBIMN5aybAh2/Jg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "for-each": "^0.3.3",
        "gopd": "^1.0.1",
        "is-typed-array": "^1.1.13",
        "possible-typed-array-names": "^1.0.0",
        "reflect.getprototypeof": "^1.0.6"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/typescript": {
      "version": "5.9.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz",
      "integrity": "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==",
      "devOptional": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/typescript-eslint": {
      "version": "8.53.0",
      "resolved": "https://registry.npmjs.org/typescript-eslint/-/typescript-eslint-8.53.0.tgz",
      "integrity": "sha512-xHURCQNxZ1dsWn0sdOaOfCSQG0HKeqSj9OexIxrz6ypU6wHYOdX2I3D2b8s8wFSsSOYJb+6q283cLiLlkEsBYw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/eslint-plugin": "8.53.0",
        "@typescript-eslint/parser": "8.53.0",
        "@typescript-eslint/typescript-estree": "8.53.0",
        "@typescript-eslint/utils": "8.53.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0",
        "typescript": ">=4.8.4 <6.0.0"
      }
    },
    "node_modules/unbox-primitive": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/unbox-primitive/-/unbox-primitive-1.1.0.tgz",
      "integrity": "sha512-nWJ91DjeOkej/TA8pXQ3myruKpKEYgqvpw9lz4OPHj/NWFNluYrjbz9j01CJ8yKQd2g4jFoOkINCTW2I5LEEyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-bigints": "^1.0.2",
        "has-symbols": "^1.1.0",
        "which-boxed-primitive": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/undici-types": {
      "version": "6.21.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-6.21.0.tgz",
      "integrity": "sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/universalify": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/universalify/-/universalify-2.0.1.tgz",
      "integrity": "sha512-gptHNQghINnc/vTGIk0SOFGFNXw7JVrlRUtConJRlvaw6DuX0wO5Jeko9sWrMBhh+PsYAZ7oXAiOnf/UKogyiw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 10.0.0"
      }
    },
    "node_modules/unrs-resolver": {
      "version": "1.11.1",
      "resolved": "https://registry.npmjs.org/unrs-resolver/-/unrs-resolver-1.11.1.tgz",
      "integrity": "sha512-bSjt9pjaEBnNiGgc9rUiHGKv5l4/TGzDmYw3RhnkJGtLhbnnA/5qJj7x3dNDCRx/PJxu774LlH8lCOlB4hEfKg==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "dependencies": {
        "napi-postinstall": "^0.3.0"
      },
      "funding": {
        "url": "https://opencollective.com/unrs-resolver"
      },
      "optionalDependencies": {
        "@unrs/resolver-binding-android-arm-eabi": "1.11.1",
        "@unrs/resolver-binding-android-arm64": "1.11.1",
        "@unrs/resolver-binding-darwin-arm64": "1.11.1",
        "@unrs/resolver-binding-darwin-x64": "1.11.1",
        "@unrs/resolver-binding-freebsd-x64": "1.11.1",
        "@unrs/resolver-binding-linux-arm-gnueabihf": "1.11.1",
        "@unrs/resolver-binding-linux-arm-musleabihf": "1.11.1",
        "@unrs/resolver-binding-linux-arm64-gnu": "1.11.1",
        "@unrs/resolver-binding-linux-arm64-musl": "1.11.1",
        "@unrs/resolver-binding-linux-ppc64-gnu": "1.11.1",
        "@unrs/resolver-binding-linux-riscv64-gnu": "1.11.1",
        "@unrs/resolver-binding-linux-riscv64-musl": "1.11.1",
        "@unrs/resolver-binding-linux-s390x-gnu": "1.11.1",
        "@unrs/resolver-binding-linux-x64-gnu": "1.11.1",
        "@unrs/resolver-binding-linux-x64-musl": "1.11.1",
        "@unrs/resolver-binding-wasm32-wasi": "1.11.1",
        "@unrs/resolver-binding-win32-arm64-msvc": "1.11.1",
        "@unrs/resolver-binding-win32-ia32-msvc": "1.11.1",
        "@unrs/resolver-binding-win32-x64-msvc": "1.11.1"
      }
    },
    "node_modules/update-browserslist-db": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.2.3.tgz",
      "integrity": "sha512-Js0m9cx+qOgDxo0eMiFGEueWztz+d4+M3rGlmKPT+T4IS/jP4ylw3Nwpu6cpTTP8R1MAC1kF4VbdLt3ARf209w==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.1"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/uri-js": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/uri-js/-/uri-js-4.4.1.tgz",
      "integrity": "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "punycode": "^2.1.0"
      }
    },
    "node_modules/v8-compile-cache-lib": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/v8-compile-cache-lib/-/v8-compile-cache-lib-3.0.1.tgz",
      "integrity": "sha512-wa7YjyUGfNZngI/vtK0UHAN+lgDCxBPCylVXGp0zu59Fz5aiGtNXaq3DhIov063MorB+VfufLh3JlF2KdTK3xg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/webidl-conversions": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/webidl-conversions/-/webidl-conversions-3.0.1.tgz",
      "integrity": "sha512-2JAn3z8AR6rjK8Sm8orRC0h/bcl/DqL7tRPdGZ4I1CjdF+EaMLmYxBHyXuKL849eucPFhvBoxMsflfOb8kxaeQ==",
      "devOptional": true,
      "license": "BSD-2-Clause"
    },
    "node_modules/whatwg-url": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/whatwg-url/-/whatwg-url-5.0.0.tgz",
      "integrity": "sha512-saE57nupxk6v3HY35+jzBwYa0rKSy0XR8JSxZPwgLr7ys0IBzhGviA1/TUGJLmSVqs8pb9AnvICXEuOHLprYTw==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "tr46": "~0.0.3",
        "webidl-conversions": "^3.0.0"
      }
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/which-boxed-primitive": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/which-boxed-primitive/-/which-boxed-primitive-1.1.1.tgz",
      "integrity": "sha512-TbX3mj8n0odCBFVlY8AxkqcHASw3L60jIuF8jFP78az3C2YhmGvqbHBpAjTRH2/xqYunrJ9g1jSyjCjpoWzIAA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-bigint": "^1.1.0",
        "is-boolean-object": "^1.2.1",
        "is-number-object": "^1.1.1",
        "is-string": "^1.1.1",
        "is-symbol": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/which-builtin-type": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/which-builtin-type/-/which-builtin-type-1.2.1.tgz",
      "integrity": "sha512-6iBczoX+kDQ7a3+YJBnh3T+KZRxM/iYNPXicqk66/Qfm1b93iu+yOImkg0zHbj5LNOcNv1TEADiZ0xa34B4q6Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "function.prototype.name": "^1.1.6",
        "has-tostringtag": "^1.0.2",
        "is-async-function": "^2.0.0",
        "is-date-object": "^1.1.0",
        "is-finalizationregistry": "^1.1.0",
        "is-generator-function": "^1.0.10",
        "is-regex": "^1.2.1",
        "is-weakref": "^1.0.2",
        "isarray": "^2.0.5",
        "which-boxed-primitive": "^1.1.0",
        "which-collection": "^1.0.2",
        "which-typed-array": "^1.1.16"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/which-collection": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/which-collection/-/which-collection-1.0.2.tgz",
      "integrity": "sha512-K4jVyjnBdgvc86Y6BkaLZEN933SwYOuBFkdmBu9ZfkcAbdVbpITnDmjvZ/aQjRXQrv5EPkTnD1s39GiiqbngCw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-map": "^2.0.3",
        "is-set": "^2.0.3",
        "is-weakmap": "^2.0.2",
        "is-weakset": "^2.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/which-typed-array": {
      "version": "1.1.20",
      "resolved": "https://registry.npmjs.org/which-typed-array/-/which-typed-array-1.1.20.tgz",
      "integrity": "sha512-LYfpUkmqwl0h9A2HL09Mms427Q1RZWuOHsukfVcKRq9q95iQxdw0ix1JQrqbcDR9PH1QDwf5Qo8OZb5lksZ8Xg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "available-typed-arrays": "^1.0.7",
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "for-each": "^0.3.5",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/word-wrap": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/word-wrap/-/word-wrap-1.2.5.tgz",
      "integrity": "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/yallist": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-3.1.1.tgz",
      "integrity": "sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/yaml": {
      "version": "2.8.2",
      "resolved": "https://registry.npmjs.org/yaml/-/yaml-2.8.2.tgz",
      "integrity": "sha512-mplynKqc1C2hTVYxd0PU2xQAc22TI1vShAYGksCCfxbn/dFwnHTNi1bvYsBTkhdUNtGIf5xNOg938rrSSYvS9A==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "yaml": "bin.mjs"
      },
      "engines": {
        "node": ">= 14.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/eemeli"
      }
    },
    "node_modules/yauzl": {
      "version": "2.10.0",
      "resolved": "https://registry.npmjs.org/yauzl/-/yauzl-2.10.0.tgz",
      "integrity": "sha512-p4a9I6X6nu6IhoGmBqAcbJy1mlC4j27vEPZX9F4L4/vZT3Lyq1VkFHw/V/PUcB9Buo+DG3iHkT0x3Qya58zc3g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "buffer-crc32": "~0.2.3",
        "fd-slicer": "~1.1.0"
      }
    },
    "node_modules/yn": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/yn/-/yn-3.1.1.tgz",
      "integrity": "sha512-Ux4ygGWsu2c7isFWe8Yu1YluJmqVhxqK2cLXNQA5AcC3QfbGNpM7fu0Y8b/z16pXLnFxZYvWhd3fhBY9DLmC6Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/yocto-queue": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz",
      "integrity": "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/zod": {
      "version": "4.3.5",
      "resolved": "https://registry.npmjs.org/zod/-/zod-4.3.5.tgz",
      "integrity": "sha512-k7Nwx6vuWx1IJ9Bjuf4Zt1PEllcwe7cls3VNzm4CQ1/hgtFUK2bRNG3rvnpPUhFjmqJKAKtjV576KnUkHocg/g==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    },
    "node_modules/zod-validation-error": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/zod-validation-error/-/zod-validation-error-4.0.2.tgz",
      "integrity": "sha512-Q6/nZLe6jxuU80qb/4uJ4t5v2VEZ44lzQjPDhYJNztRQ4wyWc6VF3D3Kb/fAuPetZQnhS3hnajCf9CsWesghLQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18.0.0"
      },
      "peerDependencies": {
        "zod": "^3.25.0 || ^4.0.0"
      }
    }
  }
}
```

```ts
// package.json
{
  "name": "cherry",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22 <23"
  },
  "engineStrict": true,
  "scripts": {
    "predev": "npm run check:db-ready",
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "build:strict": "npm run check:guardrails && next build --webpack",
    "start": "next start",
    "ci:verify": "npm run check && npm run test && npm run build",
    "check:clean": "npm run ts:esm -- scripts/execution/run.mts check:clean",
    "check:db-ready": "npm run ts:esm -- scripts/execution/run-db.mts check:db-ready",
    "check:dev-login": "npm run ts:esm -- scripts/execution/run.mts check:dev-login",
    "check:aggregate": "npm run ts:esm -- scripts/execution/run.mts check:aggregate",
    "check:routes": "npm run ts:esm -- scripts/guardrails/run.mts check:routes",
    "check:engine-freeze": "npm run ts:esm -- scripts/guardrails/run.mts check:engine-freeze",
    "lint": "npm run lint:tailwind && npm run lint:eslint",
    "lint:eslint": "eslint . --max-warnings=0",
    "lint:scripts": "eslint scripts --max-warnings=0",
    "lint:tailwind": "npm run check:tailwind-conflicts",
    "ts:esm": "CHERRY_TSESM=1 tsx --tsconfig tsconfig.scripts.json",
    "typecheck": "tsc -b tsconfig.typecheck.json --pretty false",
    "typecheck:scripts": "tsc -b tsconfig.scripts.typecheck.json --pretty false",
    "check:server-entropy": "npm run ts:esm -- scripts/guardrails/run.mts check:server-entropy",
    "check:ordering": "npm run ts:esm -- scripts/guardrails/run.mts check:ordering",
    "check:identity": "npm run ts:esm -- scripts/guardrails/run.mts check:identity",
    "check:config": "npm run ts:esm -- scripts/guardrails/run.mts check:config",
    "check:side-effects": "npm run ts:esm -- scripts/guardrails/run.mts check:side-effects",
    "check:side-effects:diff": "npm run ts:esm -- scripts/guardrails/run.mts check:side-effects:diff",
    "check:config-init": "npm run ts:esm -- scripts/guardrails/run.mts check:config-init",
    "check:determinism": "npm run ts:esm -- scripts/guardrails/run.mts check:determinism",
    "check:script-semantics": "npm run ts:esm -- scripts/guardrails/run.mts check:script-semantics",
    "check:script-json-parse": "npm run ts:esm -- scripts/guardrails/run.mts check:script-json-parse",
    "check:npm-arg-forwarding": "npm run ts:esm -- scripts/guardrails/run.mts check:npm-arg-forwarding",
    "check:lockfile-sync": "npm run ts:esm -- scripts/guardrails/run.mts check:lockfile-sync",
    "check:function-size-budget": "npm run ts:esm -- scripts/guardrails/run.mts check:function-size-budget",
    "check:no-vendor-shims": "npm run ts:esm -- scripts/guardrails/run.mts check:no-vendor-shims",
    "check:loader-contract": "npm run ts:esm -- scripts/guardrails/run.mts check:loader-contract",
    "check:esm-loader-totality": "npm run ts:esm -- scripts/guardrails/run.mts check:esm-loader-totality",
    "check:prisma-mock-loader-totality": "npm run ts:esm -- scripts/guardrails/run.mts check:prisma-mock-loader-totality",
    "check:script-runner-contract": "npm run ts:esm -- scripts/guardrails/run.mts check:script-runner-contract",
    "check:script-runtime-boundary": "npm run ts:esm -- scripts/guardrails/run.mts check:script-runtime-boundary",
    "check:no-script-alias-imports": "npm run ts:esm -- scripts/guardrails/run.mts check:no-script-alias-imports",
    "check:no-ts-extension-imports": "npm run ts:esm -- scripts/guardrails/run.mts check:no-ts-extension-imports",
    "check:esm-imports": "npm run ts:esm -- scripts/guardrails/run.mts check:esm-imports",
    "check:type-only-imports": "npm run ts:esm -- scripts/guardrails/run.mts check:type-only-imports",
    "check:guardrail-no-runtime-io": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrail-no-runtime-io",
    "check:db-truth-boundary": "npm run ts:esm -- scripts/guardrails/run.mts check:db-truth-boundary",
    "check:db-runner-exclusivity": "npm run ts:esm -- scripts/guardrails/run.mts check:db-runner-exclusivity",
    "check:db-constraint-coverage": "npm run ts:esm -- scripts/guardrails/run.mts check:db-constraint-coverage",
    "check:db-constraint-naming": "npm run ts:esm -- scripts/guardrails/run.mts check:db-constraint-naming",
    "check:db-semantic-orm-agnostic": "npm run ts:esm -- scripts/guardrails/run.mts check:db-semantic-orm-agnostic",
    "check:db-semantic-suite-minimum": "npm run ts:esm -- scripts/guardrails/run.mts check:db-semantic-suite-minimum",
    "check:db-ledger-entrypoints": "npm run ts:esm -- scripts/guardrails/run.mts check:db-ledger-entrypoints",
    "check:db-accounting-replay": "npm run ts:esm -- scripts/guardrails/run.mts check:db-accounting-replay",
    "check:accounting-invariants": "npm run ts:esm -- scripts/guardrails/run.mts check:accounting-invariants",
    "check:accounting-proof-coverage": "npm run ts:esm -- scripts/guardrails/run.mts check:accounting-proof-coverage",
    "check:replay-equals-materialized": "npm run ts:esm -- scripts/guardrails/run.mts check:replay-equals-materialized",
    "check:no-mutation": "npm run ts:esm -- scripts/guardrails/run.mts check:no-mutation",
    "check:implicit-boolean": "npm run ts:esm -- scripts/guardrails/run.mts check:implicit-boolean",
    "check:branded-literal": "npm run ts:esm -- scripts/guardrails/run.mts check:branded-literal",
    "check:guardrail-self": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrail-self",
    "check:guardrail-time": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrail-time",
    "check:guardrail-registry": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrail-registry",
    "check:guardrail-name-path-bijection": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrail-name-path-bijection",
    "check:guardrail-doc-sync": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrail-doc-sync",
    "check:guardrail-execution": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrail-execution",
    "check:guardrail-execution-parity": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrail-execution-parity",
    "check:guardrail-helpers-exclusive": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrail-helpers-exclusive",
    "check:guardrail-subprocess-totality": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrail-subprocess-totality",
    "check:ci-must-run-check": "npm run ts:esm -- scripts/guardrails/run.mts check:ci-must-run-check",
    "check:ci-guardrail-coverage": "npm run ts:esm -- scripts/guardrails/run.mts check:ci-guardrail-coverage",
    "check:execution-registry-completeness": "npm run ts:esm -- scripts/guardrails/run.mts check:execution-registry-completeness",
    "check:no-orphan-check-files": "npm run ts:esm -- scripts/guardrails/run.mts check:no-orphan-check-files",
    "check:no-orphan-scripts": "npm run ts:esm -- scripts/guardrails/run.mts check:no-orphan-scripts",
    "check:engine-prisma": "npm run ts:esm -- scripts/guardrails/run.mts check:engine-prisma",
    "check:engine-date": "npm run ts:esm -- scripts/guardrails/run.mts check:engine-date",
    "check:engine-optimality": "npm run ts:esm -- scripts/guardrails/run.mts check:engine-optimality",
    "check:engine-optimality-version": "npm run ts:esm -- scripts/guardrails/run.mts check:engine-optimality-version",
    "check:catch-unknown": "npm run ts:esm -- scripts/guardrails/run.mts check:catch-unknown",
    "check:guardrails-core": "npm run ts:esm -- scripts/guardrails/run.mts check:guardrails-core",
    "check:repo-guardrails": "npm run ts:esm -- scripts/guardrails/run.mts check:repo-guardrails",
    "check:environment-import-integrity": "npm run ts:esm -- scripts/guardrails/run.mts check:environment-import-integrity",
    "check:user-pages-runtime": "npm run ts:esm -- scripts/guardrails/run.mts check:user-pages-runtime",
    "check:config-lock": "npm run ts:esm -- scripts/guardrails/run.mts check:config-lock",
    "check:config-snapshot": "npm run ts:esm -- scripts/guardrails/run.mts check:config-snapshot",
    "check:ts-coverage": "npm run ts:esm -- scripts/guardrails/run.mts check:ts-coverage",
    "check:check-contract": "npm run ts:esm -- scripts/guardrails/run.mts check:check-contract",
    "check:env": "npm run check:db:required && npm run check:migrations:required",
    "check:node": "npm run lint:scripts && npm run typecheck:scripts && npm run check:run-tests:node",
    "check:next": "npm run lint && npm run typecheck && npm run check:run-tests:next",
    "check": "npm run check:guardrails && npm run check:node && npm run check:next",
    "check:guardrails": "npm run ts:esm -- scripts/guardrails/run.mts --all",
    "check:dev-ui-parity": "npm run ts:esm -- scripts/guardrails/run.mts check:dev-ui-parity",
    "check:shell-boundaries": "npm run ts:esm -- scripts/guardrails/run.mts check:shell-boundaries",
    "check:route-collisions": "npm run ts:esm -- scripts/guardrails/run.mts check:route-collisions",
    "check:run-tests": "npm run ts:esm -- scripts/execution/run.mts check:run-tests",
    "check:run-tests:node": "npm run ts:esm -- scripts/execution/run.mts check:run-tests:node",
    "check:run-tests:next": "npm run ts:esm -- scripts/execution/run.mts check:run-tests:next",
    "check:tests:node": "npm run ts:esm -- scripts/execution/run.mts check:tests:node",
    "check:tests:next": "npm run ts:esm -- scripts/execution/run.mts check:tests:next",
    "check:tests": "npm run check:tests:node && npm run check:tests:next",
    "check:run-db-tests": "npm run ts:esm -- scripts/execution/run-db.mts check:run-db-tests",
    "check:tailwind-conflicts": "npm run ts:esm -- scripts/execution/run.mts check:tailwind-conflicts",
    "ingest:mcc": "npm run ts:esm -- scripts/execution/run.mts ingest:mcc",
    "ingest:moustafa-bank": "npm run ts:esm -- scripts/execution/run.mts ingest:moustafa-bank",
    "dev:ingest:moustafa-bank": "npm run ingest:moustafa-bank",
    "audit:evaluator:moustafa": "npm run ts:esm -- scripts/execution/run.mts audit:evaluator:moustafa",
    "dev:evaluator:moustafa": "npm run audit:evaluator:moustafa",
    "seed:demo": "npm run backfill:seed-demo",
    "audit:integrity": "npm run ts:esm -- scripts/execution/run.mts audit:integrity",
    "backfill:bucket-last-reset-at": "npm run ts:esm -- scripts/execution/run.mts backfill:bucket-last-reset-at",
    "backfill:category-preference-enum": "npm run ts:esm -- scripts/execution/run.mts backfill:category-preference-enum",
    "backfill:seed-demo": "npm run ts:esm -- scripts/execution/run.mts backfill:seed-demo",
    "cleanup:kill-alias-imports": "npm run ts:esm -- scripts/execution/run.mts cleanup:kill-alias-imports",
    "cleanup:vine-sessions": "npm run ts:esm -- scripts/execution/run.mts cleanup:vine-sessions",
    "check:prisma-assumptions": "npm run ts:esm -- scripts/guardrails/run.mts check:prisma-assumptions",
    "check:db:optional": "npm run ts:esm -- scripts/execution/run-db.mts check:db:optional",
    "check:db:required": "npm run ts:esm -- scripts/execution/run-db.mts check:db:required",
    "check:db": "npm run check:db:optional",
    "check:migrations:required": "npm run check:db-ready",
    "check:migrations": "npm run ts:esm -- scripts/guardrails/run.mts check:migrations",
    "report:authority": "npm run ts:esm -- scripts/execution/run.mts report:authority",
    "report:bucket-balance": "npm run ts:esm -- scripts/execution/run.mts report:bucket-balance",
    "check:authority-lint": "npm run ts:esm -- scripts/guardrails/run.mts check:authority-lint",
    "check:authority-invariants": "npm run ts:esm -- scripts/guardrails/run.mts check:authority-invariants",
    "postinstall": "patch-package && prisma generate --schema=prisma/schema.prisma",
    "test": "npm run check:run-tests",
    "test:db": "npm run check:run-db-tests",
    "test:strict": "npm run check:guardrails && npm run check:run-tests"
  },
  "dependencies": {
    "@auth/prisma-adapter": "2.11.1",
    "@prisma/client": "^6.19.0",
    "@radix-ui/react-slot": "^1.2.4",
    "class-variance-authority": "^0.7.1",
    "csv-parse": "^6.1.0",
    "next": "^16.0.8",
    "next-auth": "5.0.0-beta.30",
    "nodemailer": "^7.0.10",
    "passkit-generator": "^3.5.5",
    "pdf-parse": "^2.4.5",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "zod": "^4.1.13"
  },
  "optionalDependencies": {
    "lightningcss": "^1.25.0"
  },
  "overrides": {
    "@auth/core": "0.41.1"
  },
  "devDependencies": {
    "@simplewebauthn/server": "^9.0.3",
    "@simplewebauthn/types": "^9.0.1",
    "@tailwindcss/language-server": "^0.14.29",
    "@tailwindcss/postcss": "^4",
    "@types/cookie": "^0.6.0",
    "@types/node": "^22",
    "@types/nodemailer": "^7.0.4",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@vscode/ripgrep": "1.17.0",
    "babel-plugin-react-compiler": "1.0.0",
    "baseline-browser-mapping": "^2.8.32",
    "eslint": "^9",
    "eslint-config-next": "16.0.3",
    "eslint-plugin-zod": "^1.4.0",
    "fast-glob": "^3.3.3",
    "patch-package": "^8.0.1",
    "postinstall-postinstall": "^2.1.0",
    "prisma": "^6.19.0",
    "tailwindcss": "^4",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "tsx": "4.19.2",
    "typescript": "^5"
  }
}
```

```ts
// tests/fixtures/guardrails/check-contract/bad-ci-verify/package.json
{
  "name": "check-contract-bad-ci-verify",
  "private": true,
  "scripts": {
    "check": "npm run check:guardrails && npm run lint",
    "test": "npm run check:run-tests",
    "build": "next build",
    "ci:verify": "npm run test && npm run check && npm run build",
    "test:strict": "npm run check:guardrails && npm run check:run-tests",
    "build:strict": "npm run check:guardrails && next build"
  }
}
```

```ts
// tests/fixtures/guardrails/check-contract/bad-guardrails-in-test/package.json
{
  "name": "check-contract-bad-guardrails-in-test",
  "private": true,
  "scripts": {
    "check": "npm run check:guardrails && npm run lint",
    "test": "npm run check:guardrails && npm run check:run-tests",
    "build": "next build",
    "ci:verify": "npm run check && npm run test && npm run build",
    "test:strict": "npm run check:guardrails && npm run check:run-tests",
    "build:strict": "npm run check:guardrails && next build"
  }
}
```

```ts
// tests/fixtures/guardrails/check-contract/ok/package.json
{
  "name": "check-contract-ok",
  "private": true,
  "scripts": {
    "check": "npm run check:guardrails && npm run lint",
    "test": "npm run check:run-tests",
    "build": "next build",
    "ci:verify": "npm run check && npm run test && npm run build",
    "test:strict": "npm run check:guardrails && npm run check:run-tests",
    "build:strict": "npm run check:guardrails && next build"
  }
}
```

```ts
// tests/fixtures/guardrails/execution-registry-missing-file/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "dev:missing": "npm run ts:esm -- scripts/execution/run.mts dev:missing",
    "ts:esm": "CHERRY_TSESM=1 tsx --tsconfig tsconfig.scripts.json"
  }
}
```

```ts
// tests/fixtures/guardrails/guardrail-exec-bypass-docs/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "check:guardrails": "echo ok"
  }
}
```

```ts
// tests/fixtures/guardrails/guardrail-exec-bypass-nested/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "check:guardrails": "npm run foo",
    "foo": "npm run bar",
    "bar": "node scripts/check-side-effects.mts"
  }
}
```

```ts
// tests/fixtures/guardrails/guardrail-exec-bypass-npx-tsx/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "check:guardrails": "npm run check:side-effects",
    "check:side-effects": "npx tsx scripts/check-side-effects.mts"
  }
}
```

```ts
// tests/fixtures/guardrails/guardrail-exec-bypass-workflow/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "check:guardrails": "echo ok"
  }
}
```

```ts
// tests/fixtures/guardrails/guardrail-exec-bypass/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "check:guardrails": "npm run check:side-effects",
    "check:side-effects": "node scripts/check-side-effects.mts"
  }
}
```

```ts
// tests/fixtures/guardrails/npm-arg-forwarding/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "lint": "npm run lint:eslint --max-warnings=0",
    "lint:eslint": "eslint ."
  }
}
```

```ts
// tests/fixtures/guardrails/orphan-exec-script/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "dev:rogue": "node scripts/rogue.mts"
  }
}
```

```ts
// tests/fixtures/guardrails/repo/esm-loader-bypass/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "ts:esm": "CHERRY_TSESM=1 tsx --tsconfig tsconfig.scripts.json",
    "check:side-effects": "node scripts/check-side-effects.mts"
  }
}
```

```ts
// tests/fixtures/guardrails/repo/esm-loader-inline/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "ts:esm": "CHERRY_TSESM=1 tsx --tsconfig tsconfig.scripts.json",
    "check:side-effects": "tsx --tsconfig tsconfig.scripts.json scripts/check-side-effects.mts"
  }
}
```

```ts
// tests/fixtures/guardrails/repo/esm-loader-missing/package.json
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "check:side-effects": "npm run ts:esm -- scripts/check-side-effects.mts"
  }
}
```

```ts
// tests/fixtures/guardrails/script-runner-contract/bad-direct-runner/package.json
{
  "name": "script-runner-contract-bad",
  "private": true,
  "scripts": {
    "ts:esm": "CHERRY_TSESM=1 npx tsx --tsconfig tsconfig.scripts.json",
    "check:clean": "node scripts/execution/run.mjs check:clean"
  }
}
```

```ts
// tests/fixtures/guardrails/script-runner-contract/ok/package.json
{
  "name": "script-runner-contract-ok",
  "private": true,
  "scripts": {
    "ts:esm": "CHERRY_TSESM=1 npx tsx --tsconfig tsconfig.scripts.json",
    "check:clean": "npm run ts:esm -- scripts/execution/run.mts check:clean",
    "lint": "eslint ."
  }
}
```

```ts
// tests/fixtures/guardrails/script-runner-contract/package.json
{
  "name": "script-runner-contract-fixture",
  "private": true,
  "type": "module",
  "scripts": {
    "ts:esm": "CHERRY_TSESM=1 npx tsx --tsconfig tsconfig.scripts.json",
    "check:bad": "node scripts/check-bad.mts"
  }
}
```

```ts
// tsconfig.app.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": [
    "app",
    "components",
    "lib"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "scripts/**",
    "prisma/scripts/**",
    "tests/fixtures/**"
  ]
}
```

```ts
// tsconfig.app.typecheck.json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "composite": true,
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": ".tmp/typecheck/app",
    "rootDir": "."
  },
  "references": [
    { "path": "./tsconfig.core.typecheck.json" }
  ],
  "include": [
    "app/**/*.ts",
    "app/**/*.tsx",
    "components/**/*.ts",
    "components/**/*.tsx",
    "lib/**/*.ts",
    "lib/**/*.tsx",
    "tests/**/*.ts",
    "tests/**/*.tsx",
    "types/compat/**/*.d.ts",
    "types/compat/**/*.d.cts",
    "types/jsx-global.d.ts",
    "data/**/*.ts",
    "data/**/*.json",
    "proxy.ts",
    "next-env.d.ts",
    "next.config.ts",
    "tailwind.config.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "scripts/**",
    "prisma/scripts/**",
    "tests/fixtures/**",
    "tests/engine/optimality/**",
    "tests/node/**",
    "tests/guardrails/**",
    "lib/engine/optimality/**"
  ]
}
```

```ts
// tsconfig.base.json
// tsconfig.base.json
{
  "compilerOptions": {
    // --- Language correctness ---
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,

    // --- Runtime / emit model ---
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "verbatimModuleSyntax": true,

    // --- Interop (NON-NEGOTIABLE) ---
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "downlevelIteration": true,
    "resolveJsonModule": true,

    // --- Hygiene ---
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false
  }
}
```

```ts
// tsconfig.core.typecheck.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": ".tmp/typecheck/core",
    "rootDir": "."
  },
  "include": [
    "types/core.ts"
  ]
}
```

```ts
// tsconfig.engine-optimality.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": ".tmp/typecheck/engine-optimality",
    "rootDir": ".",
    "types": ["node"]
  },
  "references": [
    { "path": "./tsconfig.app.typecheck.json" }
  ],
  "include": [
    "lib/engine/optimality/**/*.ts",
    "tests/engine/optimality/**/*.ts",
    "tests/node/engine/optimality/**/*.ts"
  ]
}
```

```ts
// tsconfig.eslint.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": [
    "app",
    "components",
    "lib",
    "scripts",
    "tests",
    "types",
    "prisma"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "dist",
    "build",
    "coverage",
    "tests/fixtures"
  ]
}
```

```ts
// tsconfig.json
// tsconfig.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": [
    "app",
    "components",
    "lib",
    "scripts",
    "tests",
    "types",
    "prisma"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "tests/fixtures/**"
  ]
}
```

```ts
// tsconfig.scripts.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "verbatimModuleSyntax": true,
    "types": ["node"],
    "noEmit": true
  },
  "include": [
    "scripts/**/*",
    "prisma/scripts/**/*",
    "tests/node/**/*",
    "tests/guardrails/**/*",
    "lib/engine/optimality/**/*"
  ]
}
```

```ts
// tsconfig.scripts.typecheck.json
{
  "extends": "./tsconfig.scripts.json",
  "compilerOptions": {
    "composite": true,
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": ".tmp/typecheck/scripts",
    "rootDir": ".",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "allowImportingTsExtensions": false
  },
  "references": [
    { "path": "./tsconfig.core.typecheck.json" },
    { "path": "./tsconfig.app.typecheck.json" },
    { "path": "./tsconfig.engine-optimality.json" }
  ],
  "include": [
    "scripts/**/*.ts",
    "scripts/**/*.mts",
    "scripts/**/*.cts",
    "prisma/scripts/**/*.ts",
    "tests/node/**/*",
    "tests/guardrails/**/*"
  ],
  "exclude": [
    "tests/node/engine/optimality/**"
  ]
}
```

```ts
// tsconfig.typecheck.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.core.typecheck.json" },
    { "path": "./tsconfig.app.typecheck.json" },
    { "path": "./tsconfig.scripts.typecheck.json" }
  ]
}
```

```ts
// prisma/scripts/tsconfig.json
{
  "extends": "../../tsconfig.scripts.json",
  "include": ["./**/*.ts"]
}
```

```ts
// scripts/tsconfig.json
{
  "extends": "../tsconfig.scripts.json",
  "include": ["./**/*.ts", "./**/*.mts", "./**/*.cts"]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/ok/tsconfig.app.typecheck.json
{
  "compilerOptions": {
    "composite": true,
    "noEmit": true
  },
  "references": [
    { "path": "./tsconfig.core.typecheck.json" }
  ],
  "include": [
    "app/**/*.ts"
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/ok/tsconfig.core.typecheck.json
{
  "compilerOptions": {
    "composite": true,
    "noEmit": true
  },
  "include": [
    "types/**/*.d.ts"
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/ok/tsconfig.scripts.typecheck.json
{
  "compilerOptions": {
    "composite": true,
    "noEmit": true
  },
  "references": [
    { "path": "./tsconfig.core.typecheck.json" }
  ],
  "include": [
    "scripts/**/*.mts"
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/ok/tsconfig.engine-optimality.json
{
  "extends": "../../../../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "emitDeclarationOnly": true
  },
  "include": [
    "lib/engine/optimality/**/*.ts",
    "tests/engine/optimality/**/*.ts",
    "tests/node/engine/optimality/**/*.ts"
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/ok/tsconfig.typecheck.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.core.typecheck.json" },
    { "path": "./tsconfig.app.typecheck.json" },
    { "path": "./tsconfig.scripts.typecheck.json" }
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/orphan/tsconfig.app.typecheck.json
{
  "compilerOptions": {
    "composite": true,
    "noEmit": true
  },
  "references": [
    { "path": "./tsconfig.core.typecheck.json" }
  ],
  "include": [
    "app/**/*.ts"
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/orphan/tsconfig.core.typecheck.json
{
  "compilerOptions": {
    "composite": true,
    "noEmit": true
  },
  "include": [
    "types/**/*.d.ts"
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/orphan/tsconfig.scripts.typecheck.json
{
  "compilerOptions": {
    "composite": true,
    "noEmit": true
  },
  "references": [
    { "path": "./tsconfig.core.typecheck.json" }
  ],
  "include": [
    "scripts/**/*.mts"
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/orphan/tsconfig.typecheck.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.core.typecheck.json" },
    { "path": "./tsconfig.app.typecheck.json" },
    { "path": "./tsconfig.scripts.typecheck.json" }
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/overlap/tsconfig.app.typecheck.json
{
  "compilerOptions": {
    "composite": true,
    "noEmit": true
  },
  "references": [
    { "path": "./tsconfig.core.typecheck.json" }
  ],
  "include": [
    "app/**/*.ts",
    "scripts/**/*.ts"
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/overlap/tsconfig.core.typecheck.json
{
  "compilerOptions": {
    "composite": true,
    "noEmit": true
  },
  "include": [
    "types/**/*.d.ts"
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/overlap/tsconfig.scripts.typecheck.json
{
  "compilerOptions": {
    "composite": true,
    "noEmit": true
  },
  "references": [
    { "path": "./tsconfig.core.typecheck.json" }
  ],
  "include": [
    "scripts/**/*.ts"
  ]
}
```

```ts
// tests/fixtures/guardrails/ts-coverage/overlap/tsconfig.typecheck.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.core.typecheck.json" },
    { "path": "./tsconfig.app.typecheck.json" },
    { "path": "./tsconfig.scripts.typecheck.json" }
  ]
}
```

```ts
// tests/fixtures/guardrails/no-vendor-shims/allowlisted/tsconfig.base.json
{
  "compilerOptions": {
    "paths": {
      "fixture/shim": ["types/vendor/allowlisted-shim.d.ts"]
    }
  }
}
```

```ts
// eslint.config.mjs
import { createRequire } from 'node:module';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import zodPlugin from 'eslint-plugin-zod';
const requireJson = createRequire(import.meta.url);
const serverEntropyAllowlist = requireJson('./scripts/guardrails/server-entropy.allowlist.json');

const serverEntropyAllowlistFiles = (serverEntropyAllowlist.files ?? []);
const libRestrictedSyntaxRules = [
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: '❌ new Date() is forbidden in lib/. Inject time explicitly via { now }.'
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: '❌ Date.now() is forbidden in lib/. Inject time explicitly via { nowMs }.'
  },
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: '❌ Math.random() is forbidden in lib/. Inject entropy explicitly.',
  },
  {
    selector:
      "CallExpression[callee.object.name='crypto'][callee.property.name=/^(randomUUID|getRandomValues|randomBytes)$/]",
    message: '❌ crypto randomness is forbidden in lib/. Inject entropy explicitly.',
  },
  {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message: '❌ process.env is forbidden in lib/. Inject configuration explicitly.',
  },
  {
    selector: "CallExpression[callee.property.name='sort'][arguments.length=0]",
    message: '❌ Array.sort() without comparator is forbidden; provide a total, deterministic comparator.',
  },
  {
    selector:
      "CallExpression[callee.property.name='sort'][arguments.length=1] CallExpression[arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='BinaryExpression'][arguments.0.body.operator=/^[<>]=?$/]",
    message: '❌ Comparator returning boolean is forbidden; return numeric ordering with equality handling.',
  },
];

const engineSideEffectRules = [
  {
    selector: "CallExpression[callee.object.name='console']",
    message: '❌ console usage is forbidden in engine core; inject a logger.',
  },
  {
    selector: "CallExpression[callee.name='fetch']",
    message: '❌ fetch() is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "NewExpression[callee.name='XMLHttpRequest']",
    message: '❌ XMLHttpRequest is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "CallExpression[callee.name='axios']",
    message: '❌ axios is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "CallExpression[callee.object.name='axios']",
    message: '❌ axios is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "ImportDeclaration[source.value='axios']",
    message: '❌ axios import is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "ImportDeclaration[source.value='@/lib/prisma']",
    message: '❌ prisma import is forbidden in engine core; use adapters.',
  },
  {
    selector: "ImportDeclaration[source.value='@prisma/client']",
    message: '❌ prisma import is forbidden in engine core; use adapters.',
  },
  {
    selector: "ImportDeclaration[source.value=/^(node:)?fs$/]",
    message: '❌ fs import is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "ImportDeclaration[source.value=/^(node:)?child_process$/]",
    message: '❌ child_process import is forbidden in engine core.',
  },
];

const coreSilentDefaultRules = [
  {
    selector: 'LogicalExpression[operator="??"]',
    message: '❌ Nullish coalescing is forbidden in core logic; handle missing values explicitly.',
  },
  {
    selector: 'AssignmentExpression > LogicalExpression[operator="||"]',
    message: '❌ Silent defaults via || are forbidden in core logic; branch explicitly.',
  },
  {
    selector: 'VariableDeclarator > LogicalExpression[operator="||"]',
    message: '❌ Silent defaults via || are forbidden in core logic; branch explicitly.',
  },
  {
    selector: 'ReturnStatement > LogicalExpression[operator="||"]',
    message: '❌ Silent defaults via || are forbidden in core logic; branch explicitly.',
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.tmp/**',
    '.next/**',
    'out/**',
    'build/**',
    'tests/fixtures/**',
    'next-env.d.ts',
    'next.config.ts',
    'tailwind.config.ts',
    'proxy.ts',
    'eslint.config.mjs',
    'postcss.config.mjs',
  ]),
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    plugins: { zod: zodPlugin },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Zod schema hygiene
      'zod/prefer-enum': 'error',
      'zod/require-strict': 'error',
      // Promise safety
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      // Unsafe any/access
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: true,
          allowNullableBoolean: true,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="JSON"][callee.property.name="parse"]',
          message: 'Prefer schema-validated parsing (Zod) instead of raw JSON.parse.',
        },
        {
          selector: 'CatchClause[param.typeAnnotation=null]',
          message: 'All catch params must be typed as unknown and normalized.',
        },
      ],
      // Exhaustive switches
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // Cleanliness
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: ['scripts/**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['app/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name="json"][callee.object.name=/^(request|req)$/]',
          message: 'Use parseJsonBody + Zod schema instead of calling request.json() directly.',
        },
      ],
    },
  },
  {
    files: ['lib/**/*.ts', 'lib/**/*.tsx'],
    ignores: serverEntropyAllowlistFiles.filter((f) => f.startsWith('lib/')),
    rules: {
      'no-restricted-syntax': ['error', ...libRestrictedSyntaxRules],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: '❌ process.env is forbidden in lib/. Inject configuration explicitly.',
        },
      ],
    },
  },
  {
    files: ['lib/adapters/runtime/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='sort'][arguments.length=0]",
          message:
            '❌ Array.sort() without comparator is forbidden; provide a total, deterministic comparator.',
        },
        {
          selector:
            "CallExpression[callee.property.name='sort'][arguments.length=1] CallExpression[arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='BinaryExpression'][arguments.0.body.operator=/^[<>]=?$/]",
          message:
            '❌ Comparator returning boolean is forbidden; return numeric ordering with equality handling.',
        },
      ],
      'no-restricted-properties': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    files: [
      'lib/buckets/**/*.{ts,tsx}',
      'lib/verification/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...libRestrictedSyntaxRules,
        ...coreSilentDefaultRules,
      ],
    },
  },
  {
    files: ['lib/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...libRestrictedSyntaxRules,
        ...coreSilentDefaultRules,
        ...engineSideEffectRules,
      ],
    },
  },
  {
    files: ['app/**/*.ts', 'app/**/*.tsx'],
    ignores: [
      'app/api/**/*',
      'app/**/client.tsx',
      'app/**/client.ts',
      'app/**/*Client.tsx',
      'app/**/*Client.ts',
      'app/**/actions.ts',
      ...serverEntropyAllowlistFiles.filter((f) => f.startsWith('app/')),
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            '❌ new Date() forbidden in server components. Capture once per request and thread.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: '❌ Date.now() forbidden in server components.',
        },
        {
          selector: "CallExpression[callee.property.name='sort'][arguments.length=0]",
          message: '❌ Array.sort() without comparator is forbidden; provide a total, deterministic comparator.',
        },
        {
          selector:
            "CallExpression[callee.property.name='sort'][arguments.length=1] CallExpression[arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='BinaryExpression'][arguments.0.body.operator=/^[<>]=?$/]",
          message: '❌ Comparator returning boolean is forbidden; return numeric ordering with equality handling.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: '❌ Math.random() forbidden in server components.',
        },
        {
          selector:
            "CallExpression[callee.object.name='crypto'][callee.property.name=/^(randomUUID|getRandomValues|randomBytes)$/]",
          message: '❌ crypto randomness forbidden in server components.',
        },
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: '❌ process.env forbidden in server components; inject via props.',
        },
        {
          selector: "CallExpression[callee.name='headers']",
          message: '❌ headers() forbidden in server components; pass values from boundary.',
        },
        {
          selector: "CallExpression[callee.name='cookies']",
          message: '❌ cookies() forbidden in server components; pass values from boundary.',
        },
        {
          selector: "CallExpression[callee.name='draftMode']",
          message: '❌ draftMode() forbidden in server components; pass values from boundary.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: '❌ process.env forbidden in server components; inject via props.',
        },
      ],
    },
  },
  {
    files: ['app/**/page.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name=/^on.*/][value.expression.type="ArrowFunctionExpression"]',
          message:
            'Server Components (page.tsx) must not define inline event handlers. Move interactivity into a client component.',
        },
        {
          selector:
            'JSXAttribute[name.name=/^on.*/][value.expression.type="Identifier"]',
          message:
            'Server Components (page.tsx) must not pass handler props. Move interactivity into a client component.',
        },
      ],
    },
  },
  {
    files: ['app/scan/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="fetch"]',
          message:
            'Use lib/client/api.callApi + useApiAction instead of raw fetch in React components.',
        },
        {
          selector: 'JSXElement JSXText[value=/Scan failed/i]',
          message: 'Error messages must be rendered from error state, not hard-coded.',
        },
      ],
    },
  },
  {
    files: [
      'tests/api-rewards.validation.test.js',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
```

```ts
// next.config.ts
import { createRequire } from 'node:module';
import type { NextConfig } from 'next';

const require = createRequire(import.meta.url);
const { assertPublicConfig } = require('./lib/config/public.ts') as typeof import('./lib/config/public');
const { assertRuntimeConfig } = require('./lib/config/runtime.ts') as typeof import('./lib/config/runtime');
const { assertServerConfig } = require('./lib/config/server.ts') as typeof import('./lib/config/server');
const { setPublicConfig, setRuntimeConfig, setServerConfig, lockServerConfig } = require(
  './lib/config/store.ts'
) as typeof import('./lib/config/store');

type InitOptions = {
  lockServerConfig?: boolean;
  allowServerConfigOverwrite?: boolean;
};

let configInitialized = false;

function coerceOptionalString(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return 'http://localhost:3000';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function coerceAppBaseUrl(env: NodeJS.ProcessEnv): string {
  const fallback = 'http://localhost:3000';
  const appBaseUrl = env['APP_BASE_URL'];
  const siteUrl = env['NEXT_PUBLIC_SITE_URL'];
  const rawVercelUrl = env['NEXT_PUBLIC_VERCEL_URL'];
  const vercelUrl =
    typeof rawVercelUrl === 'string' && rawVercelUrl.trim() !== ''
      ? rawVercelUrl.startsWith('http')
        ? rawVercelUrl
        : `https://${rawVercelUrl}`
      : null;
  const nextAuthUrl = env['NEXTAUTH_URL'];
  const publicBaseUrl = env['NEXT_PUBLIC_BASE_URL'];

  const baseUrlCandidates = [appBaseUrl, siteUrl, vercelUrl, nextAuthUrl, publicBaseUrl];

  for (const candidate of baseUrlCandidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed !== '') {
        return normalizeBaseUrl(trimmed);
      }
    }
  }

  return fallback;
}

function parseEnvironment(env: NodeJS.ProcessEnv): 'development' | 'test' | 'production' {
  const rawEnv = (env['NODE_ENV'] ?? 'development').toLowerCase();
  if (rawEnv === 'production' || rawEnv === 'prod') return 'production';
  if (rawEnv === 'test') return 'test';
  return 'development';
}

function parseEngineVersion(env: NodeJS.ProcessEnv): string | null {
  return env['VERCEL_GIT_COMMIT_SHA'] ?? env['COMMIT_SHA'] ?? env['NEXT_PUBLIC_SITE_VERSION'] ?? null;
}

function parseDevToolsFlag(env: NodeJS.ProcessEnv, environment: 'development' | 'test' | 'production'): boolean {
  if (env['ENABLE_DEV_TOOLS'] === 'true') return true;
  if (env['ENABLE_DEV_TOOLS'] === 'false') return false;
  return environment !== 'production';
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
}

function parseWalletConfig(env: NodeJS.ProcessEnv) {
  const enabled = env['CHERRY_WALLET_PASS_ENABLED'] === 'true';
  return {
    enabled,
    teamId: coerceOptionalString(env['APPLE_WALLET_TEAM_ID']),
    passTypeId: coerceOptionalString(env['APPLE_WALLET_PASS_TYPE_ID']),
    orgName: coerceOptionalString(env['APPLE_WALLET_ORG_NAME']),
    passDescription: coerceOptionalString(env['APPLE_WALLET_PASS_DESCRIPTION']),
    certPassword: coerceOptionalString(env['APPLE_WALLET_CERT_PASSWORD']),
    certPath: coerceOptionalString(env['APPLE_WALLET_CERT_PATH']),
    wwdrCertPath: coerceOptionalString(env['APPLE_WALLET_WWDR_CERT_PATH']),
  };
}

function parseVineSignatureMode(env: NodeJS.ProcessEnv): 'off' | 'warn' | 'enforce' {
  const raw = (env['CHERRY_VINE_SIGNATURE_MODE'] ?? 'off').toLowerCase();
  if (raw === 'warn' || raw === 'enforce') return raw;
  return 'off';
}

function parseBankIngest(env: NodeJS.ProcessEnv) {
  const userId = env['BANK_INGEST_USER_ID'];
  const userEmail = env['BANK_INGEST_USER_EMAIL'];
  return {
    userId: typeof userId === 'string' && userId.trim() !== '' ? userId : null,
    userEmail: typeof userEmail === 'string' && userEmail.trim() !== '' ? userEmail : null,
  };
}

function buildPublicConfig(env: NodeJS.ProcessEnv) {
  return assertPublicConfig({
    appBaseUrl: coerceAppBaseUrl(env),
  });
}

function buildRuntimeConfig(env: NodeJS.ProcessEnv) {
  return assertRuntimeConfig({
    enableLogs: (env['NODE_ENV'] ?? '').toLowerCase() !== 'production',
  });
}

function buildServerConfig(env: NodeJS.ProcessEnv) {
  const environment = parseEnvironment(env);
  const databaseUrl = env['DATABASE_URL'] ?? 'file:./dev.db';

  return assertServerConfig({
    appBaseUrl: coerceAppBaseUrl(env),
    databaseUrl,
    environment,
    enableDevTools: parseDevToolsFlag(env, environment),
    engineVersion: parseEngineVersion(env),
    wallet: parseWalletConfig(env),
    vineSignatureMode: parseVineSignatureMode(env),
    offlineEvaluatorEnabled: parseBooleanEnv(env['CHERRY_OFFLINE_EVALUATOR_ENABLED'], true),
    bankIngest: parseBankIngest(env),
  });
}

function resolveLockingOptions(env: NodeJS.ProcessEnv, options?: InitOptions): Required<InitOptions> {
  const normalizedEnv = (env['NODE_ENV'] ?? 'development').toLowerCase();
  const isTest = normalizedEnv === 'test';
  return {
    lockServerConfig: options?.lockServerConfig ?? !isTest,
    allowServerConfigOverwrite: options?.allowServerConfigOverwrite ?? isTest,
  };
}

function initConfigFromEnv(env: NodeJS.ProcessEnv, options?: InitOptions) {
  if (configInitialized) {
    throw new Error(
      'Config already initialized. initConfigFromEnv must be called exactly once per process.'
    );
  }
  configInitialized = true;

  const locking = resolveLockingOptions(env, options);
  setServerConfig(buildServerConfig(env), {
    lock: false,
    allowOverwrite: locking.allowServerConfigOverwrite,
  });
  if (locking.lockServerConfig) {
    lockServerConfig();
  }
  setPublicConfig(buildPublicConfig(env));
  setRuntimeConfig(buildRuntimeConfig(env));
}

initConfigFromEnv(process.env);

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    extensionAlias: {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    },
  },
  // Avoid tracing ephemeral Next files that might not exist in non-export builds.
  outputFileTracingExcludes: {
    '*': [
      '.next/cache/**',
      '.next/export-detail.json',
      '.next/lock',
      '.next/server/proxy.js',
      '.git/**',
      'docs/**',
      'scripts/**',
      'tests/**',
      'types/**',
      'node_modules/eslint/**',
      'node_modules/typescript/**',
      'node_modules/@typescript-eslint/**',
      'node_modules/jiti/**',
    ],
  },
};

export default nextConfig;
```

```ts
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {},
  plugins: [],
};

export default config;
```

<!-- .github/copilot-instructions.md -->
Status: Active
Last updated: 2026-01-18

# Cherry • AI Agent Playbook

Read this alongside `AGENTS.md`, `docs/legal-constraints.md`, `docs/cherry-vision.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, and `docs/api.md`. Never frame Cherry as a payment card/terminal; `/api/scan` is advisory with telemetry; `/api/wallet/cherry-pass` returns 501 until certs and the feature flag exist.

## Current behavior (enforced / in code)
- Engine decisions run through `safeSolveDecisionForUser` / `safeSolveDecisionForWorld` with deterministic inputs and explicit `nowMs`.
- `/api/scan` logs `DecisionEvent` telemetry but does not create sessions or ledger entries.
- Zod schemas live in `lib/schemas/*` and are parsed via `parseJsonBody` from `lib/validation.ts`.
- Prisma is instantiated only in `lib/prisma.ts` and consumed via runtime adapters.

## Runtime & Layout
- Next.js 16 App Router + React 19 (React Compiler). Default to server components; place interactive hooks in `app/<route>/client.tsx` gated with `'use client'`.
- Tailwind v4 tokens live in `app/globals.css`. Prefer semantic CSS vars and canonical utilities.
- `app/layout.tsx` is the shell: Geist fonts, `AuthProvider`, `SidebarNav`, `UserMenu`.

## Auth & Session Flow
- NextAuth config: `app/api/auth/[...nextauth]/route.ts` (PrismaAdapter + Email/Google + dev credentials). Session callback stamps `session.user.id`.
- Server handlers must import `withUser` from `lib/with-user.ts` to enforce auth and surface `userId`. Never read cookies directly.
- Client code uses `useSession()` and reacts to `401` by calling `signIn()`.

## Data & Money Rules (see `docs/legal-constraints.md`)
- Prisma models: `prisma/schema.prisma` (Bucket/Card/RewardRule/RecommendationSession/CherryPointLedger/etc.). Run `npx prisma migrate dev --name <tag>` then `npx prisma generate` after schema edits.
- Monetary values are integer cents. Convert from dollars before hitting APIs; render via `formatCents` helpers.
- Buckets: `spentCents` is incremented once on session confirm after `ensureBucketFresh`; `currentAmount` is legacy and unused post-create.
- Bucket balances must be derived via canonical runtime helpers; do not recompute remaining amounts ad-hoc.
- `currentAmount` is legacy-only and must not be treated as authoritative input.
- Bucket mutation must occur only after freshness is ensured.
- Always import Prisma from `@/lib/prisma`; never create ad-hoc clients.

## Simulation Engine & APIs
- Engine: `lib/engine.ts` is canonical (MCC-aware); invariants in `lib/engine-invariants.ts`. Do not fork logic in routes.
- All decision-making surfaces must route through `safeSolveDecisionForUser` / `safeSolveDecisionForWorld`; no route may implement decision logic inline.
- Validation: All engine-touching APIs (`/api/simulate`, `/api/scan`, `/api/sessions`, `/api/vine/order`) must use Zod schemas in `lib/schemas/*` plus `parseJsonBody`.
- Core APIs:
  - `/api/simulate` — one-off simulation: returns verdict + card/bucket suggestion, records a `SimulatedTransaction`, does **not** mutate buckets.
  - `/api/scan` — advisory “scan before pay”: runs the engine, MCC-aware, allows zero-amount snapshots; logs `DecisionEvent` telemetry but does not create sessions/ledger rows.
  - `/api/sessions` — creates a `RecommendationSession` (source `APP_SCAN`) with orderToken/expiry and offered points.
  - `/api/sessions/[id]/confirm` — blocks expired/duplicate claims, freshens bucket, increments `spentCents` once, writes PENDING ledger rows, flags anomalies (amount/time/card).
  - `/api/sessions/[id]/verify` — simulated verification: flips ledger rows to POSTED/REVOKED, updates anomalies.
  - `/api/vine/order` — Vine ingest (dev-only): accepts terminal events or `OrderContext`, enforces freshness window, runs engine, creates session with orderToken, returns decision.
  - `/api/wallet/cherry-pass` — gated by `CHERRY_WALLET_PASS_ENABLED` + Apple env; returns 501 JSON when disabled; generates `storeCard` pass when fully configured.

## Seed, MCC ingest, and Admin flows
- MCC ingest: `npm run ingest:mcc [path]` → `scripts/ingest-mcc.mts`.
- Demo seeding: `npm run seed:demo` → `scripts/seed-demo.mts` (also via `/api/seed-demo`).
- Admin tools (local-only): `/admin` links to `/api/admin/clear-user`, `/api/admin/clear-sessions`, `/api/admin/clear-ledger`, `/api/admin/health`, `/api/health`.
- Integrity: `scripts/audit-integrity.mts` flags session/ledger anomalies.

## UI Conventions
- Server components fetching data should use `{ cache: 'no-store' }` and await async `params`.
- Client forms: uppercase categories, confirm destructive actions, convert dollars to cents, call `router.refresh()`.
- Vine simulator: clearly mark “simulated Vine device” vs “manual scan”; hide confirm flows when verdict is `INSUFFICIENT_DATA`.

## Product & Hardware Context
- `docs/cherry-vision.md` + `docs/legal-constraints.md`: Cherry is a spending copilot, not a card/terminal.
- `docs/cherry-vine.md`: Vine is a context beacon (merchant + amount), never a payment device.
- Recommendation sessions + verification glue Cherry Pass, Vine, and any future bank/receipt integrations—reuse them rather than inventing new reward trackers.
RecommendationSession + CherryPointLedger form the single spine for all reward and verification flows; do not introduce parallel tracking systems.

## Future/Target behavior (explicitly speculative)
- Add new API surfaces only after updating `docs/api.md` and relevant guardrails.

## Related docs
- `AGENTS.md`
- `docs/api.md`
- `docs/ci-and-guardrails.md`

<!-- .github/pull_request_template.md -->
Status: Active
Last updated: 2026-01-02

# Pull Request Checklist

## Current behavior
- Use this template for all PRs to ensure CI and guardrails are respected.

## Summary

- 

## Testing

- [ ] Not run (explain why)
- [ ] `npm run check`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run ci:verify`

## Engine Impact

- [ ] This PR does **not** modify engine behavior (no changes under lib/engine, lib/vine, engine APIs, or engine-adjacent files).
- [ ] This PR **does** modify engine behavior and is allowed because:
  - Reason:
  - Linked justification in `docs/engine-roadmap.md`:

During an active engine freeze, engine-changing PRs are prohibited unless explicitly whitelisted in `docs/engine-roadmap.md`. CI enforces this via `check:engine-freeze`.

## Future/Target behavior
- If CI entrypoints change, update this checklist to match.

## Related docs
- `CONTRIBUTING.md`
- `docs/ci-and-guardrails.md`
- `docs/engine-roadmap.md`

```ts
# .github/workflows/ci.yml
name: ci

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    env:
      NODE_OPTIONS: "--conditions=development"
      PATH: "/usr/bin:/bin:/usr/local/bin"
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install toolchain
        run: |
          sudo apt-get update
          sudo apt-get install -y ripgrep

      - name: Install dependencies
        run: npm ci

      - name: Guardrails
        run: npm run check:guardrails

      - name: Node runtime tests
        run: npm run check:tests:node

      - name: Next runtime tests
        run: npm run check:tests:next

      - name: Verify CI truth
        run: npm run ci:verify
```

```ts
# .github/workflows/env-checks.yml
name: env-checks

on:
  workflow_dispatch:
  push:
    branches:
      - main
  pull_request:

jobs:
  env-checks:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: cherry_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U postgres -d cherry_test"
          --health-interval=5s
          --health-timeout=5s
          --health-retries=20
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/cherry_test?schema=public
      NODE_OPTIONS: "--conditions=development"
      PATH: "/usr/bin:/bin:/usr/local/bin"
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install toolchain
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client ripgrep

      - name: Install dependencies
        run: npm ci

      - name: Apply Prisma migrations
        run: |
          npx prisma generate --schema=prisma/schema.prisma
          npx prisma migrate deploy --schema=prisma/schema.prisma

      - name: Verify Prisma migration status
        run: npx prisma migrate status --schema=prisma/schema.prisma

      - name: Verify env checks
        run: npm run check:env

      - name: Run DB smoke tests
        run: npm run test:db
```

```ts
# .gitignore
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem
cookies.txt

# editor settings
.vscode/*
!.vscode/settings.json

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

/app/generated/prisma

# Apple Wallet certs and passes (local only)
certs/
*.p12
*.pem
*.pkpass

# Local temp + Node compile cache
.tmp/
problems.md
.env*.local
```

```ts
// scripts/execution/registry.mts
export const EXECUTION_RUNNER = 'scripts/execution/run.mts' as const;
export const EXECUTION_DB_RUNNER = 'scripts/execution/run-db.mts' as const;

export const EXECUTION = {
  'check:aggregate': 'scripts/guardrails-aggregate.mts',
  'check:clean': 'scripts/assert-clean-tree.mts',
  'check:db-ready': 'scripts/db-ready.mts',
  'check:dev-login': 'scripts/dev-login.mts',
  'check:db:optional': 'scripts/db-check-optional.mts',
  'check:db:required': 'scripts/db-check-required.mts',
  'check:run-db-tests': 'scripts/run-db-tests.mts',
  'check:run-tests': 'scripts/run-tests.mts',
  'check:run-tests:node':
    'scripts/run-tests-node.mts',
  'check:run-tests:next': 'scripts/run-tests-next.mts',
  'check:tests:node':
    'scripts/run-tests-node.mts',
  'check:tests:next': 'scripts/run-tests-next.mts',
  'check:tailwind-conflicts': 'scripts/tailwind-conflicts.mts',
  'ingest:moustafa-bank': 'scripts/ingest-moustafa-bank-csv.mts',
  'audit:evaluator:moustafa': 'scripts/run-offline-evaluator-moustafa.mts',
  'backfill:seed-demo': 'scripts/seed-demo.mts',
  'ingest:mcc': 'scripts/ingest-mcc.mts',
  'audit:integrity': 'scripts/audit-integrity.mts',
  'backfill:bucket-last-reset-at': 'scripts/backfill_bucket_last_reset_at.mts',
  'backfill:category-preference-enum': 'scripts/backfill_category_preference_enum.mts',
  'cleanup:vine-sessions': 'scripts/cleanup_expired_vine_sessions.mts',
  'cleanup:kill-alias-imports': 'scripts/codemod-kill-alias-imports.mts',
  'report:authority': 'scripts/authority-coverage.mts',
  'report:bucket-balance': 'scripts/debug-bucket-balance.mts',
} as const;

export type ExecutionName = keyof typeof EXECUTION;
export type ExecutionPath = (typeof EXECUTION)[ExecutionName];
export const EXECUTION_NAMES = Object.keys(EXECUTION) as ExecutionName[];
export const EXECUTION_DB_NAMES = [
  'check:db-ready',
  'check:db:optional',
  'check:db:required',
  'check:run-db-tests',
] as const;
export type ExecutionDbName = (typeof EXECUTION_DB_NAMES)[number];
```

```ts
// scripts/guardrails/migration-safety.baseline.json
[
  "20251124173641_init",
  "20251125013000_mcc_tags",
  "20251125020000_nextauth",
  "20251125203749_add_user_image_email_verified",
  "20251125235322_add_engine_fields_to_simulation_transaction",
  "20251126000841_add_simulation_sessions",
  "20251127201803_add_recommendation_sessions",
  "20251127201825_add_cherry_points_ledger",
  "20251127201838_normalize_buckets",
  "20251127230000_session_claim_verify_states",
  "20251128010000_add_category_preference_and_verdicts",
  "20251128013000_update_coverage_mode_naming",
  "20251128023000_add_insufficient_data_overall_verdict",
  "20251128040000_add_anomaly_and_verification_fields",
  "20251128183158_unified_activity_base",
  "20251129010000_session_source_and_ledger_default",
  "20251130120000_bucket_last_reset",
  "20251130160314_bucket_last_reset",
  "20251130235539_bucket_spend_reversal",
  "20251201000505_category_preference_add_enum_shadow",
  "20251201000555_category_preference_enum_final",
  "20251201002115_vine_device_registry",
  "20251202175141_engine_objective_preferences",
  "20251202230000_bank_csv_dev_ingest",
  "20251203010000_offline_evaluator_historical",
  "20251203020000_bank_posted_at_canonical",
  "20251203024000_bank_tx_user_external_unique",
  "20251204032221_add_income_regimes_and_classification",
  "20251206090000_autopilot_commit_v2",
  "20251214061205_recsession_engine_decision_id_idempotency_key",
  "20251214064330_recsession_idempotency_selector_name",
  "20251217032946_add_daily_state",
  "20251217040439_add_alert_event",
  "20251217044322_add_decision_event_ledger",
  "20251217045643_decision_event_severity",
  "20251217051604_decision_event_payload",
  "20251225070316_add_idempotency_key",
  "20251225084237_add_per_user_idempotency"
]
```

```ts
// scripts/guardrails/registry.mts
export const GUARDRAIL_ENTRYPOINT = 'check:guardrails' as const;

const SCRIPT_ROOT = 'scripts' as const;
const CHECK_PREFIX = 'check-' as const;
const CHECK_PATH_BASE = `${SCRIPT_ROOT}/${CHECK_PREFIX}` as const;
const CATCH_UNKNOWN_PATH = `${CHECK_PATH_BASE}catch-unknown.mts` as const;
const ESM_LOADER_TOTALITY_PATH = `${CHECK_PATH_BASE}esm-loader-totality.mts` as const;
const NO_SCRIPT_ALIAS_IMPORTS_PATH = `${CHECK_PATH_BASE}no-script-alias-imports.mts` as const;
const NO_TS_EXTENSION_IMPORTS_PATH = `${CHECK_PATH_BASE}no-ts-extension-imports.mts` as const;
const ESM_IMPORTS_PATH = `${CHECK_PATH_BASE}esm-imports.mts` as const;
const TYPE_ONLY_IMPORTS_PATH = `${CHECK_PATH_BASE}type-only-imports.mts` as const;
const PRISMA_MOCK_LOADER_TOTALITY_PATH = `${CHECK_PATH_BASE}prisma-mock-loader-totality.mts` as const;
const SCRIPT_RUNNER_CONTRACT_PATH = `${CHECK_PATH_BASE}script-runner-contract.mts` as const;
const SCRIPT_RUNTIME_BOUNDARY_PATH = `${CHECK_PATH_BASE}script-runtime-boundary.mts` as const;
const TS_COVERAGE_PATH = `${CHECK_PATH_BASE}ts-coverage.mts` as const;
const CHECK_CONTRACT_PATH = `${CHECK_PATH_BASE}check-contract.mts` as const;
const LOCKFILE_SYNC_PATH = `${CHECK_PATH_BASE}lockfile-sync.mts` as const;
const FUNCTION_SIZE_BUDGET_PATH = `${CHECK_PATH_BASE}function-size-budget.mts` as const;
const NO_VENDOR_SHIMS_PATH = `${CHECK_PATH_BASE}no-vendor-shims.mts` as const;
const GUARDRAIL_NO_RUNTIME_IO_PATH = `${CHECK_PATH_BASE}guardrail-no-runtime-io.mts` as const;
const GUARDRAIL_HELPERS_EXCLUSIVE_PATH = `${CHECK_PATH_BASE}guardrail-helpers-exclusive.mts` as const;
const GUARDRAIL_SUBPROCESS_TOTALITY_PATH =
  `${CHECK_PATH_BASE}guardrail-subprocess-totality.mts` as const;
const DB_TRUTH_BOUNDARY_PATH = `${CHECK_PATH_BASE}db-truth-boundary.mts` as const;
const DB_RUNNER_EXCLUSIVITY_PATH = `${CHECK_PATH_BASE}db-runner-exclusivity.mts` as const;
const DB_CONSTRAINT_COVERAGE_PATH = `${CHECK_PATH_BASE}db-constraint-coverage.mts` as const;
const DB_CONSTRAINT_NAMING_PATH = `${CHECK_PATH_BASE}db-constraint-naming.mts` as const;
const DB_SEMANTIC_ORM_AGNOSTIC_PATH = `${CHECK_PATH_BASE}db-semantic-orm-agnostic.mts` as const;
const DB_SEMANTIC_SUITE_MINIMUM_PATH = `${CHECK_PATH_BASE}db-semantic-suite-minimum.mts` as const;
const DB_LEDGER_ENTRYPOINTS_PATH = `${CHECK_PATH_BASE}db-ledger-entrypoints.mts` as const;
const DB_ACCOUNTING_REPLAY_PATH = `${CHECK_PATH_BASE}db-accounting-replay.mts` as const;
const ACCOUNTING_INVARIANTS_PATH = `${CHECK_PATH_BASE}accounting-invariants.mts` as const;
const ACCOUNTING_PROOF_COVERAGE_PATH = `${CHECK_PATH_BASE}accounting-proof-coverage.mts` as const;
const REPLAY_EQUALS_MATERIALIZED_PATH =
  `${CHECK_PATH_BASE}replay-equals-materialized.mts` as const;
const NO_MUTATION_PATH = `${CHECK_PATH_BASE}no-mutation.mts` as const;
const CONFIG_SNAPSHOT_PATH = `${CHECK_PATH_BASE}config-snapshot.mts` as const;
const ENGINE_OPTIMALITY_PATH = `${CHECK_PATH_BASE}engine-optimality.mts` as const;
const ENGINE_OPTIMALITY_VERSION_PATH = `${CHECK_PATH_BASE}engine-optimality-version.mts` as const;
const ENVIRONMENT_IMPORT_INTEGRITY_PATH =
  `${CHECK_PATH_BASE}environment-import-integrity.mts` as const;
const GUARDRAIL_EXECUTION_PARITY_PATH =
  `${CHECK_PATH_BASE}guardrail-execution-parity.mts` as const;

/**
 * TODO (non-optional):
 * - Disallow inline template literals in GUARDRAILS values
 * - Require all paths to be named constants
 * - Enforce alphabetical key order
 * - Generate docs + CI checks from this file
 */
/**
 * Naming invariant:
 * - npm script: check:<name>
 * - file path: scripts/check-<name>.mts
 * - registry key must equal npm script name
 */
export const GUARDRAILS = Object.freeze({
  'check:ts-coverage': TS_COVERAGE_PATH,
  'check:check-contract': CHECK_CONTRACT_PATH,
  'check:side-effects': `${CHECK_PATH_BASE}side-effects.mts`,
  'check:side-effects:diff': `${CHECK_PATH_BASE}side-effects-diff.mts`,
  'check:script-semantics': `${CHECK_PATH_BASE}script-semantics.mts`,
  'check:script-json-parse': `${CHECK_PATH_BASE}script-json-parse.mts`,
  'check:npm-arg-forwarding': `${CHECK_PATH_BASE}npm-arg-forwarding.mts`,
  'check:lockfile-sync': LOCKFILE_SYNC_PATH,
  'check:function-size-budget': FUNCTION_SIZE_BUDGET_PATH,
  'check:no-vendor-shims': NO_VENDOR_SHIMS_PATH,
  'check:loader-contract': `${CHECK_PATH_BASE}loader-contract.mts`,
  'check:esm-loader-totality': ESM_LOADER_TOTALITY_PATH,
  'check:prisma-mock-loader-totality': PRISMA_MOCK_LOADER_TOTALITY_PATH,
  'check:script-runner-contract': SCRIPT_RUNNER_CONTRACT_PATH,
  'check:script-runtime-boundary': SCRIPT_RUNTIME_BOUNDARY_PATH,
  'check:no-script-alias-imports': NO_SCRIPT_ALIAS_IMPORTS_PATH,
  'check:no-ts-extension-imports': NO_TS_EXTENSION_IMPORTS_PATH,
  'check:esm-imports': ESM_IMPORTS_PATH,
  'check:type-only-imports': TYPE_ONLY_IMPORTS_PATH,
  'check:guardrail-no-runtime-io': GUARDRAIL_NO_RUNTIME_IO_PATH,
  'check:implicit-boolean': `${CHECK_PATH_BASE}implicit-boolean.mts`,
  'check:branded-literal': `${CHECK_PATH_BASE}branded-literal.mts`,
  'check:guardrail-self': `${CHECK_PATH_BASE}guardrail-self.mts`,
  'check:guardrail-time': `${CHECK_PATH_BASE}guardrail-time.mts`,
  'check:guardrail-registry': `${CHECK_PATH_BASE}guardrail-registry.mts`,
  'check:guardrail-name-path-bijection': `${CHECK_PATH_BASE}guardrail-name-path-bijection.mts`,
  'check:guardrail-doc-sync': `${CHECK_PATH_BASE}guardrail-doc-sync.mts`,
  'check:guardrail-execution': `${CHECK_PATH_BASE}guardrail-execution.mts`,
  'check:guardrail-execution-parity': GUARDRAIL_EXECUTION_PARITY_PATH,
  'check:guardrail-helpers-exclusive': GUARDRAIL_HELPERS_EXCLUSIVE_PATH,
  'check:guardrail-subprocess-totality': GUARDRAIL_SUBPROCESS_TOTALITY_PATH,
  'check:ci-must-run-check': `${CHECK_PATH_BASE}ci-must-run-check.mts`,
  'check:ci-guardrail-coverage': `${CHECK_PATH_BASE}ci-guardrail-coverage.mts`,
  'check:execution-registry-completeness': `${CHECK_PATH_BASE}execution-registry-completeness.mts`,
  'check:no-orphan-check-files': `${CHECK_PATH_BASE}no-orphan-check-files.mts`,
  'check:no-orphan-scripts': `${CHECK_PATH_BASE}no-orphan-scripts.mts`,
  'check:server-entropy': `${CHECK_PATH_BASE}server-entropy.mts`,
  'check:ordering': `${CHECK_PATH_BASE}ordering.mts`,
  'check:identity': `${CHECK_PATH_BASE}identity.mts`,
  'check:config': `${CHECK_PATH_BASE}config.mts`,
  'check:config-init': `${CHECK_PATH_BASE}config-init.mts`,
  'check:config-lock': `${CHECK_PATH_BASE}config-lock.mts`,
  'check:config-snapshot': CONFIG_SNAPSHOT_PATH,
  'check:determinism': `${CHECK_PATH_BASE}determinism.mts`,
  'check:engine-prisma': `${CHECK_PATH_BASE}engine-prisma.mts`,
  'check:engine-date': `${CHECK_PATH_BASE}engine-date.mts`,
  'check:engine-optimality': ENGINE_OPTIMALITY_PATH,
  'check:engine-optimality-version': ENGINE_OPTIMALITY_VERSION_PATH,
  'check:authority-lint': `${CHECK_PATH_BASE}authority-lint.mts`,
  'check:authority-invariants': `${CHECK_PATH_BASE}authority-invariants.mts`,
  'check:prisma-assumptions': `${CHECK_PATH_BASE}prisma-assumptions.mts`,
  'check:dev-ui-parity': `${CHECK_PATH_BASE}dev-ui-parity.mts`,
  'check:shell-boundaries': `${CHECK_PATH_BASE}shell-boundaries.mts`,
  'check:environment-import-integrity': ENVIRONMENT_IMPORT_INTEGRITY_PATH,
  'check:route-collisions': `${CHECK_PATH_BASE}route-collisions.mts`,
  'check:user-pages-runtime': `${CHECK_PATH_BASE}user-pages-runtime.mts`,
  'check:catch-unknown': CATCH_UNKNOWN_PATH,
  'check:guardrails-core': `${CHECK_PATH_BASE}guardrails-core.mts`,
  'check:repo-guardrails': `${CHECK_PATH_BASE}repo-guardrails.mts`,
  'check:routes': `${CHECK_PATH_BASE}routes.mts`,
  'check:engine-freeze': `${CHECK_PATH_BASE}engine-freeze.mts`,
  'check:migrations': `${CHECK_PATH_BASE}migrations.mts`,
  'check:db-truth-boundary': DB_TRUTH_BOUNDARY_PATH,
  'check:db-runner-exclusivity': DB_RUNNER_EXCLUSIVITY_PATH,
  'check:db-constraint-coverage': DB_CONSTRAINT_COVERAGE_PATH,
  'check:db-constraint-naming': DB_CONSTRAINT_NAMING_PATH,
  'check:db-semantic-orm-agnostic': DB_SEMANTIC_ORM_AGNOSTIC_PATH,
  'check:db-semantic-suite-minimum': DB_SEMANTIC_SUITE_MINIMUM_PATH,
  'check:db-ledger-entrypoints': DB_LEDGER_ENTRYPOINTS_PATH,
  'check:db-accounting-replay': DB_ACCOUNTING_REPLAY_PATH,
  'check:accounting-invariants': ACCOUNTING_INVARIANTS_PATH,
  'check:accounting-proof-coverage': ACCOUNTING_PROOF_COVERAGE_PATH,
  'check:replay-equals-materialized': REPLAY_EQUALS_MATERIALIZED_PATH,
  'check:no-mutation': NO_MUTATION_PATH,
} as const);

export type GuardrailName = keyof typeof GUARDRAILS;
export type GuardrailPath = (typeof GUARDRAILS)[GuardrailName];
export function guardrailNameToPath(name: GuardrailName): GuardrailPath {
  return GUARDRAILS[name];
}
export const GUARDRAIL_NAMES = Object.freeze(Object.keys(GUARDRAILS) as GuardrailName[]);
```

```ts
// scripts/guardrails/server-entropy.allowlist.json
{
  "files": [
    "app/(user)/_lib/api.ts"
  ]
}
```

```ts
// scripts/vendor-shims.allowlist.json
{
  "patches/@auth+core+0.41.1.patch": {
    "reason": "Upstream @auth/core nodemailer.d.ts strictFunctionTypes mismatch; patch provider param type",
    "upstream": "@auth/core@0.41.1",
    "audit": "2026-01-27",
    "removeWhen": "Remove once upstream fixes nodemailer.d.ts and Cherry upgrades"
  },
  "patches/next-auth+5.0.0-beta.30.patch": {
    "reason": "Upstream next-auth react.d.ts imports missing SignInAuthorizationParams; define it in client.d.ts",
    "upstream": "next-auth@5.0.0-beta.30",
    "audit": "2026-01-27",
    "removeWhen": "Remove once next-auth exports SignInAuthorizationParams in lib/client.d.ts"
  }
}
```

```ts
// scripts/side-effects.allowlist.json
{
  "lib/activity/feed.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/admin/getLedgerStats.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/admin/getSessionStats.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/alerts/processDailyStateAlert.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/auth.ts": {
    "effects": [
      "next_redirect"
    ],
    "source": "legacy",
    "tier": "boundary-time"
  },
  "lib/autopilot/engineDecisionId.ts": {
    "effects": [
      "crypto",
      "prisma",
      "time"
    ],
    "source": "legacy",
    "tier": "legacy-combo",
    "expiresBy": "2026-03-01"
  },
  "lib/autopilot/service.ts": {
    "effects": [
      "prisma",
      "time"
    ],
    "source": "legacy",
    "tier": "legacy-combo",
    "expiresBy": "2026-03-01"
  },
  "lib/bank/csv-dev-provider.ts": {
    "effects": [
      "fs",
      "time"
    ],
    "source": "legacy",
    "tier": "boundary-time"
  },
  "lib/bank/ingest.ts": {
    "effects": [
      "prisma",
      "time"
    ],
    "source": "legacy",
    "tier": "legacy-combo",
    "expiresBy": "2026-03-01"
  },
  "lib/bank/user-link.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/buckets/ensure-fresh.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/buckets/periods.ts": {
    "effects": [
      "time"
    ],
    "source": "legacy",
    "tier": "boundary-time"
  },
  "lib/buckets/regimes.ts": {
    "effects": [
      "prisma",
      "time"
    ],
    "source": "legacy",
    "tier": "legacy-combo",
    "expiresBy": "2026-03-01"
  },
  "lib/daily-state/runDailyForUser.ts": {
    "effects": [
      "prisma",
      "time"
    ],
    "source": "legacy",
    "tier": "legacy-combo",
    "expiresBy": "2026-03-01"
  },
  "lib/dashboard.ts": {
    "effects": [
      "prisma",
      "time"
    ],
    "source": "legacy",
    "tier": "legacy-combo",
    "expiresBy": "2026-03-01"
  },
  "lib/demo-seeder.ts": {
    "effects": [
      "prisma",
      "time"
    ],
    "source": "legacy",
    "tier": "legacy-combo",
    "expiresBy": "2026-03-01"
  },
  "lib/dev/dev-user.ts": {
    "effects": [
      "console",
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/evaluator/prisma-safe.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/evaluator/regime-buckets.ts": {
    "effects": [
      "time"
    ],
    "source": "legacy",
    "tier": "boundary-time"
  },
  "lib/evaluator/stats.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/history.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/income/classifier.ts": {
    "effects": [
      "console",
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/income/monthly.ts": {
    "effects": [
      "prisma",
      "time"
    ],
    "source": "legacy",
    "tier": "legacy-combo",
    "expiresBy": "2026-03-01"
  },
  "lib/ingest/bank-transactions.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/logger.ts": {
    "effects": [
      "console"
    ],
    "source": "legacy",
    "tier": "boundary-time"
  },
  "lib/logging.ts": {
    "effects": [
      "console"
    ],
    "source": "legacy",
    "tier": "boundary-time"
  },
  "lib/points.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/prisma.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/scan-helpers.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/schemas/bank-ingest.ts": {
    "effects": [
      "time"
    ],
    "source": "legacy",
    "tier": "boundary-time"
  },
  "lib/sessions/confirm-service.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/sessions/summaries.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/simulation.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/unified-activity.ts": {
    "effects": [
      "prisma",
      "time"
    ],
    "source": "legacy",
    "tier": "legacy-combo",
    "expiresBy": "2026-03-01"
  },
  "lib/user-context.ts": {
    "effects": [
      "crypto",
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/verification/verify-session.ts": {
    "effects": [
      "prisma"
    ],
    "source": "legacy",
    "tier": "persistence-only"
  },
  "lib/vine/run-recommendation.ts": {
    "effects": [
      "prisma",
      "time"
    ],
    "source": "legacy",
    "tier": "legacy-combo",
    "expiresBy": "2026-03-01"
  },
  "lib/vine/security.ts": {
    "effects": [
      "console",
      "crypto"
    ],
    "source": "legacy",
    "tier": "boundary-time"
  },
  "lib/wallet/cherryPass.ts": {
    "effects": [
      "fs",
      "path"
    ],
    "source": "legacy",
    "tier": "boundary-time"
  }
}
```

```ts
// tests/fixtures/guardrails/migrations/safe-migration-with-justification/scripts/guardrails/migration-safety.baseline.json
[]
```

```ts
// tests/fixtures/guardrails/migrations/safe-migration-with-test/scripts/guardrails/migration-safety.baseline.json
[]
```

```ts
// tests/fixtures/guardrails/migrations/unsafe-migration/scripts/guardrails/migration-safety.baseline.json
[]
```

```ts
# prisma/migrations/migration_lock.toml
# Please do not edit this file manually
# It should be added in your version-control system (e.g., Git)
provider = "postgresql"
```

```ts
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum BucketPeriod {
  WEEKLY
  MONTHLY
}

enum TransactionStatus {
  APPROVED
  DECLINED
}

enum RecommendationVerdict {
  HEALTHY
  BORDERLINE
  BREAKS_BUDGET
  DECLINED
}

enum RecommendationStatus {
  RECOMMENDED
  CLAIMED
  VERIFIED
  REJECTED
  EXPIRED
}

enum RecommendationSource {
  APP_SCAN
  VINE_SIM
  VINE_DEVICE
  AUTOPILOT
}

enum CherryPointLedgerStatus {
  PENDING
  POSTED
  REVOKED
}

enum CategoryBudgetMode {
  BUDGETED
  UNBUDGETED
}

enum BudgetVerdict {
  HEALTHY
  BORDERLINE
  BREAKS_BUDGET
  UNCONFIGURED
  UNBOUNDED
}

enum CardVerdict {
  OPTIMAL
  SUBOPTIMAL
  NO_CARD_DATA
}

enum OverallVerdict {
  GREEN
  YELLOW
  RED
  UNKNOWN
  INSUFFICIENT_DATA
}

enum CategoryCoverageModeDb {
  BUDGETED
  UNBUDGETED_INTENTIONAL
  UNCONFIGURED
}

enum SessionAnomalyCode {
  NONE
  AMOUNT_MISMATCH
  TIME_WINDOW_VIOLATION
  CARD_MISMATCH
  MULTIPLE_CLAIMS
  VERIFICATION_CONFLICT
  ENGINE_INCONSISTENCY
}

enum LedgerAnomalyCode {
  NONE
  SESSION_ANOMALOUS
  BALANCE_MISMATCH
  DUPLICATE_POSTING
}

enum VerificationStatus {
  UNVERIFIED
  PENDING
  VERIFIED
  FAILED
  EXPIRED_UNVERIFIED
}

/// Unified spend/reward category enum
enum RewardCategory {
  DINING
  GROCERIES
  GAS
  TRAVEL
  AIR_TRAVEL
  HOTEL
  CAR_RENTAL
  ONLINE_SHOPPING
  ENTERTAINMENT
  HEALTH
  UTILITIES
  GENERAL_MERCHANDISE
  OTHER
}

// Internal MCC tagging enums (not exposed to user-facing APIs)
enum MerchantVertical {
  LODGING
  TRANSPORT
  RETAIL
  FOOD_DRINK
  DIGITAL_SERVICES
  HEALTHCARE
  PROFESSIONAL
  FINANCIAL
  GOVERNMENT
  NONPROFIT
  ENTERTAINMENT
  EDUCATION
  MISC
}

enum MerchantChannel {
  ONLINE
  OFFLINE
  MIXED
}

enum SpendDomain {
  NECESSITY
  DISCRETIONARY
  INVESTMENT
  TRANSFER
}

enum MerchantRiskProfile {
  NORMAL
  QUASI_CASH
  GAMBLING
  HIGH_CHARGEBACK
  INTERNAL_ONLY
}

enum MerchantLifeCategory {
  TRAVEL
  HOME
  AUTO
  HEALTH
  BUSINESS
  PERSONAL_SERVICES
  EDUCATION
  CHARITY
  GOVERNMENT
  OTHER
}

enum BankTransactionIncomeKind {
  NONE
  PAYROLL
  ALLOWANCE
  SIDE_GIG
  REFUND
  INTERNAL_TRANSFER
  OTHER
}

enum BankTransactionP2PKind {
  NONE
  P2P_ALLOWANCE
  P2P_REPAYMENT_IN
  P2P_REPAYMENT_OUT
  P2P_PSEUDO_MERCHANT_IN
  P2P_PSEUDO_MERCHANT_OUT
}

enum DailyStateStatus {
  SAFE
  TIGHT
  RISKY
  INSUFFICIENT_DATA
}

enum DailyStateSource {
  NIGHTLY
  MANUAL
}

model User {
  id                     String    @id @default(cuid())
  email                  String    @unique
  name                   String?
  emailVerified          DateTime?
  image                  String?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  engineObjectiveProfile String?   @default("BALANCED")
  engineObjectiveWeights Json?

  cards                       Card[]
  buckets                     Bucket[]
  simulationSessions          Simulation[]
  simulations                 SimulatedTransaction[]
  accounts                    Account[]
  sessions                    Session[]
  recommendationSessions      RecommendationSession[]
  autopilotCommits            AutopilotCommit[]
  cherryPointLedgerEntries    CherryPointLedger[]
  accountingTransactions      AccountingTransaction[]
  categoryPreferences         CategoryPreference[]
  bankTransactions            BankTransaction[]
  merchantObservations        MerchantObservation[]
  historicalEngineEvaluations HistoricalEngineEvaluation[]
  historicalIncomeRegimes     HistoricalIncomeRegime[]
  historicalBucketTemplates   HistoricalBucketTemplate[]
  dailyStates                 DailyState[]
  alertEvents                 AlertEvent[]
}

model Card {
  id     String @id @default(cuid())
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String

  nickname  String // "Amex Gold", "Chase Freedom"
  issuer    String // "AMEX", "CHASE"
  network   String // "VISA", "MASTERCARD", "AMEX", etc.
  isCredit  Boolean
  annualFee Int? // cents

  rewardRules            RewardRule[]
  simulations            SimulatedTransaction[]
  recommendationSessions RecommendationSession[]
  ledgerEntries          CherryPointLedger[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model RewardRule {
  id     String @id @default(cuid())
  card   Card   @relation(fields: [cardId], references: [id], onDelete: Cascade)
  cardId String

  category        RewardCategory
  multiplier      Float? // points multiplier (e.g., 4.0 = 4x)
  cashbackPercent Float? // e.g., 2.0 = 2%
  capAmount       Int? // optional cap in cents
  promoStart      DateTime?
  promoEnd        DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

/// Bucket invariants (runtime, not DB-enforced):
/// - budgetAmount: configured periodic cap/target (limit).
/// - spentCents: settled/posted debits for this period.
/// - pendingSpendCents: not stored in the DB today; assumed 0 unless added later.
/// - committed = spentCents + pendingSpendCents.
/// - remaining = max(0, budgetAmount - committed).
/// - currentAmount is legacy and should mirror remaining on write; do not treat it as the source of truth.
model Bucket {
  id     String @id @default(cuid())
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String

  name          String // "Food", "Fun", "Gas"
  period        BucketPeriod
  budgetAmount  Int // total budget for the period (cents)
  currentAmount Int // legacy remaining at write time (cents); derive from budgetAmount/spentCents
  spentCents    Int            @default(0) // settled/posted spend for this period (cents)
  strictMode    Boolean        @default(true) // decline if over
  category      RewardCategory
  periodStart   DateTime       @default(now())
  periodEnd     DateTime       @default(now())
  lastResetAt   DateTime?

  simulations            SimulatedTransaction[]
  recommendationSessions RecommendationSession[]
  createdAt              DateTime                @default(now())
  updatedAt              DateTime                @updatedAt
}

model MerchantCategory {
  id                String  @id @default(cuid())
  mccCode           Int     @unique
  description       String
  networkVisa       Boolean @default(false)
  networkMastercard Boolean @default(false)
  networkTsys       Boolean @default(false)
  notes             String?

  // Internal tagging metadata (nullable to allow progressive backfill)
  vertical     MerchantVertical?
  channel      MerchantChannel?
  spendDomain  SpendDomain?
  riskProfile  MerchantRiskProfile?
  lifeCategory MerchantLifeCategory?

  mappings MccToRewardCategory[]
}

model MccToRewardCategory {
  id        String           @id @default(cuid())
  mcc       MerchantCategory @relation(fields: [mccCode], references: [mccCode], onDelete: Cascade)
  mccCode   Int
  category  RewardCategory
  isDefault Boolean          @default(true)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@unique([mccCode, isDefault])
  @@index([mccCode])
}

model Simulation {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  name      String?
  createdAt DateTime @default(now())

  transactions SimulatedTransaction[]
}

model SimulatedTransaction {
  id           String      @id @default(cuid())
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  simulation   Simulation? @relation(fields: [simulationId], references: [id], onDelete: Cascade)
  simulationId String?

  amount              Int // cents
  currency            String          @default("USD")
  merchantName        String?
  mccCode             Int?
  resolvedCategory    RewardCategory
  rewardRuleCategory  RewardCategory?
  multiplier          Float?
  cashbackPercent     Float?
  rewardsEarnedPoints Int?
  rewardsEarnedCents  Int?
  rewardMultiplier    Int?
  rewardsEarned       Int?
  bucketBeforeCents   Int?
  bucketAfterCents    Int?
  bucketLimitCents    Int?
  bucketName          String?
  bucketPeriod        BucketPeriod?

  chosenCard     Card?   @relation(fields: [chosenCardId], references: [id])
  chosenCardId   String?
  chosenCardName String?
  bucket         Bucket? @relation(fields: [bucketId], references: [id])
  bucketId       String?

  status        TransactionStatus
  reason        String?
  strictDecline Boolean           @default(false)

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([simulationId])
}

model RecommendationSession {
  id     String @id @default(cuid())
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String

  merchantName     String?
  mccCode          Int?
  category         RewardCategory
  amountCents      Int
  currency         String               @default("USD")
  deviceId         String?
  storeId          String?
  terminalId       String?
  orderId          String?
  orderToken       String               @unique
  source           RecommendationSource @default(APP_SCAN)
  engineDecisionId String?

  recommendedCard      Card?   @relation(fields: [recommendedCardId], references: [id], onDelete: SetNull)
  recommendedCardId    String?
  recommendedBucket    Bucket? @relation(fields: [recommendedBucketId], references: [id], onDelete: SetNull)
  recommendedBucketId  String?
  confirmedAmountCents Int?
  bucketSpendReversed  Boolean @default(false)

  verdict             RecommendationVerdict
  cherryPointsOffered Int                    @default(0)
  status              RecommendationStatus
  expiresAt           DateTime
  verifiedAt          DateTime?
  rejectedAt          DateTime?
  budgetVerdict       BudgetVerdict
  cardVerdict         CardVerdict
  overallVerdict      OverallVerdict
  coverageMode        CategoryCoverageModeDb
  verificationStatus  VerificationStatus     @default(UNVERIFIED)
  anomalyCode         SessionAnomalyCode     @default(NONE)
  anomalyDetails      String?                @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ledgerEntries    CherryPointLedger[]
  autopilotCommits AutopilotCommit[]

  @@unique([userId, orderToken], name: "userId_orderToken", map: "user_order_token_unique")
  @@unique([userId, source, engineDecisionId], name: "userId_source_engineDecisionId", map: "RecommendationSession_userId_source_engineDecisionId_key")
  @@index([userId, engineDecisionId])
  @@index([userId])
  @@index([recommendedCardId])
  @@index([recommendedBucketId])
}

model AutopilotCommit {
  id         String                @id @default(cuid())
  user       User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  session    RecommendationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  sessionId  String
  decisionId String
  createdAt  DateTime              @default(now())

  @@unique([userId, decisionId])
  @@index([sessionId])
}

model DailyState {
  id               String           @id @default(cuid())
  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId           String
  date             DateTime
  status           DailyStateStatus
  safeToSpendCents Int?
  nextRiskEvent    Json?
  summary          Json?
  computedAt       DateTime         @default(now())
  source           DailyStateSource @default(NIGHTLY)
  engineVersion    String?
  inputsVersion    String?
  errors           String?          @db.Text
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@unique([userId, date])
  @@index([userId, computedAt])
}

model AlertEvent {
  id     String @id @default(cuid())
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String

  date   DateTime
  kind   String
  sentAt DateTime @default(now())

  @@unique([userId, date, kind])
  @@index([userId, date])
}

model DecisionEvent {
  id              String   @id @default(cuid())
  userId          String
  surface         String
  amountCents     Int
  category        String
  verdict         String
  reasonCode      String
  reasonCodes     Json
  severity        Int
  inputsVersion   String
  counterfactuals Json
  createdAt       DateTime @default(now())

  @@index([userId, createdAt])
}

model IdempotencyKey {
  userId    String
  key       String
  createdAt DateTime @default(now())
  payload   Json

  @@id([userId, key])
}

model VineDevice {
  id        String   @id @default(cuid())
  deviceId  String   @unique
  label     String?
  storeId   String?
  secret    String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CherryPointLedger {
  id     String @id @default(cuid())
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String

  session   RecommendationSession? @relation(fields: [sessionId], references: [id], onDelete: SetNull)
  sessionId String?

  points                Int
  reason                String
  awardedAt             DateTime                @default(now())
  expiresAt             DateTime?
  status                CherryPointLedgerStatus @default(PENDING)
  postedAt              DateTime?
  revokedAt             DateTime?
  isAnomalous           Boolean                 @default(false)
  anomalyCode           LedgerAnomalyCode       @default(NONE)
  merchantObservation   MerchantObservation?    @relation(fields: [merchantObservationId], references: [id], onDelete: SetNull)
  merchantObservationId String?
  card                  Card?                   @relation(fields: [cardId], references: [id], onDelete: SetNull)
  cardId                String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([sessionId], map: "cherry_point_ledger__session_id__unique")
  @@index([userId])
  @@index([merchantObservationId])
  @@index([cardId])
}

model AccountingTransaction {
  id        String @id @default(cuid())
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  currency  String
  txnType   String
  effectiveAt DateTime
  externalId  String?

  postings AccountingPosting[]

  createdAt DateTime @default(now())

  @@unique([userId, externalId], map: "accounting_transaction__user_id_external_id__unique")
  @@index([userId])
  @@index([effectiveAt])
}

model AccountingPosting {
  id            String @id @default(cuid())
  transaction   AccountingTransaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  transactionId String

  accountId   String
  accountType String
  role        String
  amount      Int
  currency    String

  createdAt DateTime @default(now())

  @@index([transactionId])
  @@index([accountId])
}

model CategoryPreference {
  id     String @id @default(cuid())
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String

  category RewardCategory
  mode     CategoryBudgetMode

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, category])
}

model MerchantObservation {
  id           String   @id @default(cuid())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  merchantName String?
  mcc          Int?
  city         String?
  region       String?
  country      String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  bankTx     BankTransaction[]
  ledgerRows CherryPointLedger[]

  @@unique([userId, merchantName, mcc], map: "user_merchant_mcc_unique")
  @@index([userId, merchantName])
  @@index([userId, merchantName, city, region])
}

model BankTransaction {
  id                    String                       @id @default(cuid())
  externalId            String
  user                  User                         @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId                String
  source                String                       @default("legacy")
  accountId             String
  accountLast4          String?
  cardBrand             String?
  cardLast4             String?
  description           String?
  rawDescription        String?
  merchantName          String?
  merchantCity          String?
  merchantRegion        String?
  merchantCountry       String?
  mcc                   Int?
  amount                Decimal
  amountMinor           Int
  currency              String
  direction             String
  transactionType       String?
  isRecurring           Boolean?                     @default(false)
  occurredAt            DateTime?
  postedAt              DateTime
  raw                   Json?
  sourceStatement       String?
  statementStart        String?
  statementEnd          String?
  section               String?
  merchantObservation   MerchantObservation?         @relation(fields: [merchantObservationId], references: [id], onDelete: SetNull)
  merchantObservationId String?
  historicalEvaluations HistoricalEngineEvaluation[]
  incomeKind            BankTransactionIncomeKind    @default(NONE)
  p2pKind               BankTransactionP2PKind       @default(NONE)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, externalId], map: "BankTransaction_userId_externalId")
  @@index([userId])
  @@index([userId, merchantName])
}

model HistoricalEngineEvaluation {
  id                   String                  @id @default(cuid())
  user                 User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId               String
  bankTransaction      BankTransaction         @relation(fields: [bankTransactionId], references: [id], onDelete: Cascade)
  bankTransactionId    String
  runId                String
  decisionType         String
  cardId               String?
  bucketId             String?
  rawDecision          Json
  scores               Json?
  regimeId             String?
  bucketKey            String?
  bucketUsageBeforeBps Int?
  bucketUsageAfterBps  Int?
  createdAt            DateTime                @default(now())
  regime               HistoricalIncomeRegime? @relation(fields: [regimeId], references: [id], onDelete: SetNull)

  @@unique([runId, bankTransactionId])
  @@index([userId, bankTransactionId])
}

model HistoricalIncomeRegime {
  id     String @id @default(cuid())
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String

  startMonth DateTime
  endMonth   DateTime

  avgNetIncomeCents  Int @default(0)
  avgFixedCostsCents Int @default(0)
  avgFreeCashCents   Int @default(0)

  regimeLabel String?

  bucketTemplates HistoricalBucketTemplate[]
  evaluations     HistoricalEngineEvaluation[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, startMonth])
}

model HistoricalBucketTemplate {
  id     String @id @default(cuid())
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String

  regime   HistoricalIncomeRegime @relation(fields: [regimeId], references: [id], onDelete: Cascade)
  regimeId String

  bucketKey         String
  monthlyLimitCents Int
  avgSpendCents     Int    @default(0)
  targetShareBps    Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, regimeId])
}

model Account {
  id                String  @id @default(cuid())
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  expires      DateTime

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

<!-- AGENTS.md -->
Status: Active
Last updated: 2026-01-13

# Cherry Agents — Canonical Operating Guide

This file is the operating contract for humans and agents working in this repo. It is authoritative after CI/workflows and guardrail registries. If something conflicts, fix the lower authority, not the higher.

## Authority Ladder (highest to lowest)
1. `package.json` scripts + `.github/workflows/*` (actual behavior)
2. Guardrail registries and tests (`scripts/guardrails/*`, `tests/node/guardrails/*`)
3. `AGENTS.md` (this file)
4. `docs/*` (specs and explanations)
5. Everything else (notes, drafts, marketing)

## Product Identity and Legal Guardrails (non-negotiable)
- Cherry is a real-time spending copilot, not a card, proxy, processor, or payment terminal.
- Cherry never fronts transactions, holds funds, or touches payment rails.
- Cherry Vine is a context beacon (merchant + amount + timestamp), not a reader or terminal.
- Cherry Pass is a storeCard-style advisory pass; it is not a payment instrument.
- Recommendation sessions and Cherry Points are advisory and sandboxed.

Forbidden framings: “fronting card,” “proxy BIN,” “tap to pay with Cherry,” “Cherry terminal,” “payment card.”

## Current behavior (enforced / in code)
- Core loop: Observe → Evaluate → Recommend → Reward.
- `/api/scan` runs the engine and logs a `DecisionEvent` for telemetry; it does not create sessions or ledger rows.
- Sessions + ledger persistence happen via `/api/sessions` and confirm/verify flows.
- Vine ingest (`/api/vine/order`) is dev-only and context-only; no payment rails.
- Wallet pass (`/api/wallet/cherry-pass`) returns 501 unless fully configured and explicitly enabled.
- Engine is deterministic and pure: it consumes `EngineState` + `EngineContext` and emits ranked decisions.

## Determinism and Time Injection
- Do not call `Date.now()` or `new Date()` in `lib/engine/*` or `lib/authority/*`.
- Time enters at boundaries (API routes, adapters) and is passed in as `nowMs`.
- Guardrails enforce deterministic core behavior.

## SSR / Rendering Determinism
- Server components must not call `Date.now()`, `Math.random()`, or locale-dependent formatting.
- Pages must render from a single data snapshot; no structural changes on hydration.
- Empty/data states must share a stable outer container.

## Data and DB Boundaries
- Prisma client must only be instantiated in `lib/prisma.ts` and consumed by runtime adapters.
- Engine and authority logic must not import Prisma or `@prisma/client`.
- Zod schemas live in `lib/schemas/*`; parse via `parseJsonBody` from `lib/validation.ts`.
- Stateful API routes must use `withUser` and return `401` for unauthenticated requests.
- Bank ingest invariants:
  - `BankTransaction.id` is internal and never set from ingest data.
  - Idempotency key is `(userId, externalId)` only.
  - All ingest writes go through `upsertBankTransactions`.

## Bucket Runtime Invariants
- Bucket math must flow through `lib/buckets-runtime.ts`.
- Authoritative fields: `budgetAmount`, `spentCents`.
- Derived only: `committedCents`, `remainingCents`.
- `currentAmount` is legacy-mirror only; never authoritative.

## Offline Evaluator (hard boundary)
- Evaluator code is read-only with respect to Sessions, Ledger, Buckets.
- Outputs are diagnostic only and must never affect user-facing decisions.
- Must call `assertOfflineEvaluatorModelsReady()` before DB access.
- Gate execution behind `CHERRY_OFFLINE_EVALUATOR_ENABLED`.
- Never hard-code runIds; derive via `defaultRunIdForUser(userId, now)`.

## Guardrails Policy
- Guardrails are registered in `scripts/guardrails/registry.mts` and must run via `npm run check`.
- Guardrails are unaddressable by path; run them only via `npm run check`.
- Guardrails must be deterministic and side-effect free; no network or DB I/O.
- Do not weaken guardrail severity or bypass guardrail tests.

## DB Truth Surface (hard boundary)
- DB truth scripts and DB tests may assert only: existence, impossibility, conservation.
- Allowed: constraint exists, duplicate key fails, FK missing parent fails, NOT NULL fails, count stays 1.
- Forbidden: preferred outcomes, query plans, performance targets, business logic behaviors, ordering.
- Rule of thumb: if the DB could allow multiple valid outcomes, do not assert a preference in DB truth.

## Script Runner Contract
- Repo is ESM by extension. `.mts` is allowed only under `scripts/`.
- `.mts` scripts must be run via `npm run ts:esm -- <script>`.
- `.ts` files under `scripts/` must not use ESM syntax.
- Script imports must use runtime extensions (`.js`/`.mjs`/`.cjs`); no `@/` aliases.

## CI Truth and DB Posture
- `.github/workflows/ci.yml` runs `npm ci` then `npm run ci:verify`.
- Tests run with Prisma mocked; CI green does not fully prove DB behavior.
- `.github/workflows/env-checks.yml` provisions Postgres and runs `check:env` plus `test:db`.

## Change Protocol
- Keep API handlers thin; move domain logic into `lib/`.
- Use `safeSolveDecisionForWorld` / `safeSolveDecisionForUser` for engine decisions.
- For schema changes:
  - `npx prisma format`
  - `npx prisma migrate dev --name <desc>`
  - `npx prisma generate`
  - Run `npm run check` and `npm run build` (use `npm test` for a test-only rerun).
- For docs: add `Status` + `Last updated`, split Current vs Future, add Related docs.

## PR Checklist (what each command proves)
- `npm run check:aggregate` → guardrails only.
- `npm run check:node` → Node lint/typecheck + node tests.
- `npm run check:next` → UI lint/typecheck + next tests.
- `npm run check` → aggregate + node + next (full non-DB correctness).
- `npm test` → node + next tests only (Prisma mocked by loader).
- `npm run build` → Next.js build passes.
- `npm run ci:verify` → mirrors CI entrypoint.
- If schema changed: migrations apply and Prisma client is regenerated.

## Drift Policy
- If docs conflict with code, update docs to match reality unless legal constraints require a code fix.
- If code conflicts with legal constraints, fix code and add guardrail/tests rather than weakening docs.
- Do not update guardrail fixtures unless you also update the corresponding tests intentionally.

## Product-Ready Definition (Cherry terms)
Cherry is product-ready for a pilot when:
- Engine decisions are deterministic and stable across core surfaces.
- Sessions + ledger lifecycle is reliable (no double-award, clear pending/posted rules).
- Vine and Wallet remain advisory-only and correctly gated.
- Observability (DecisionEvent logging, guardrails) is in place and CI is green.

## Future/Target Behavior (explicitly speculative)
- Full bank ingest verification and automated ledger posting beyond current stubs.
- Enforced Vine signature lifecycle and expanded device coverage.
- Marketing and user-facing surfaces under `app/(marketing)` and richer user shell routes.

## Related docs
- `docs/legal-constraints.md`
- `docs/cherry-vision.md`
- `docs/ci-and-guardrails.md`
- `docs/guardrails.md`
- `docs/script-standards.md`
- `docs/repo-structure.md`

<!-- docs/accounting/invariants.md -->
Status: Active
Last updated: 2026-01-18

# Accounting Invariants

## Current behavior
- The accounting ledger contract lives in `lib/accounting/ledger.ts` and is pure, deterministic, and USD-only.
- Ledger operations are append-only; corrections are new transactions, never mutations.
- The model is advisory and internal. It does not touch payment rails and is separate from `CherryPointLedger`.
- Engine decisions must consume a validated snapshot; invalid ledger states are rejected by invariant checks.

## Canonical model

### Entities
- Account: a bucket with a currency and overdraft policy.
- Posting: an atomic signed amount applied to exactly one account, with a semantic role.
- Transaction: an ordered set of postings (length >= 2).
- Ledger: the set of transactions plus derived balances.
- External event id: idempotency key for dedup.

### Sign convention
- Debit is positive, credit is negative.
- Assets and expenses increase with positive amounts.
- Income, liabilities, and equity increase with negative amounts.

### Base accounts (USD only)
- `ASSET:CASH` (no overdraft)
- `ASSET:RESERVED` (no overdraft)
- `EXPENSE:<category>`
- `INCOME:<source>`
- `LIABILITY:CREDIT_CARD`
- `EQUITY:OPENING`

### Transaction templates
- `SPEND`: `SINK` = `EXPENSE` (+), `SOURCE` = `ASSET:CASH` (-) or `LIABILITY_DRAW` = `LIABILITY:CREDIT_CARD` (-)
- `INCOME`: `SINK` = `ASSET:CASH` (+), `OFFSET` = `INCOME` (-)
- `TRANSFER`: `SOURCE` = `ASSET` (-), `SINK` = `ASSET` (+) or `LIABILITY_REPAY` = `LIABILITY` (+)
- `REFUND`: `SINK` = `ASSET:CASH` (+), `OFFSET` = `EXPENSE` (-)
- `ADJUSTMENT`: `SINK`/`SOURCE` = `ASSET` (+/-) or `LIABILITY` (+/-), offset by equity
- `REVERSAL`: same roles as original txn, signs inverted per role rules

## Invariants (I1-I9)

### I1 — Conservation (double-entry)
For every transaction, postings sum to zero in the ledger currency.

### I2 — Determinism
Given the same ordered events and `nowMs`, the final ledger state is identical.

### I3 — Idempotency
Reprocessing the same external event id does not change ledger state.

### I4 — Non-negative constraints
Accounts flagged `noOverdraft` must never have negative balances. If spend exceeds cash,
the transaction must use a liability posting (explicit debt).

### I5 — Classification soundness
Each posting must obey `(account_type, sign)` rules, with reversals allowed only for
`REFUND`, `REVERSAL`, or `ADJUSTMENT` transactions.

### I6 — Replay correctness
`replay(events) == materialized` for the same ordered event stream.

### I7 — Single-currency ledger
All postings must share the ledger currency (USD). Cross-currency requires an explicit FX transaction.

### I8 — Time correctness
Balance as of time `T` equals the sum of postings with `effectiveAtMs <= T`.

### I9 — External ID uniqueness
Each `externalId` maps to exactly one immutable transaction, and the map is replay-stable.

## Operations and preservation arguments (Ops)

### 1) Ingest statement line -> normalized external event
- Preconditions: external event id present; normalized to a deterministic ledger event.
- Preservation: does not mutate ledger; idempotency ensures replays do not append duplicates (I2, I3).

### 2) Create transaction (apply postings)
- Preconditions: postings are balanced, non-zero, and single-currency.
- Preservation: balance constructor enforces I1/I7; sign rules enforce I5; no-overdraft checks enforce I4.

### 3) Reverse transaction
- Preconditions: original txn exists; reversal postings negate the original.
- Preservation: negation keeps sum zero (I1) and marks explicit reversal type (I5).

### 4) Adjust / correction
- Preconditions: correction uses `ADJUSTMENT` and balances against equity.
- Preservation: append-only correction preserves I1/I6 and makes adjustments auditable.

### 5) Dedup merge
- Preconditions: external ids are merged to a canonical id.
- Preservation: dedup map blocks double-apply (I3) without mutating prior txns.

### 6) Recompute derived views
- Preconditions: derived views are recomputed from postings only.
- Preservation: replay and materialized match (I6); no new postings are introduced.

### 7) Engine decision (recommendation)
- Preconditions: decisions read a validated snapshot and declare any overdraft via liability postings.
- Preservation: decisions never invent money and must pass I1-I5 before execution.

## Enforcement and proofs (Current)
- Structural: `balancePostings`, posting roles + sign matrix, and branded types (`Currency`, `AccountId`, `TxnId`, `NonZeroAmount`).
- Procedural: deterministic, append-only event application in `lib/accounting/ledger.ts`.
- Tests: property-based invariants and replay checks in `tests/node/accounting/*.spec.ts`.
- Guardrails: `check:accounting-invariants`, `check:replay-equals-materialized`, `check:no-mutation`.

## Future behavior
- DB-backed accounting tables with append-only rows and correction tables.
- Event sourcing and replay integrated with sessions and ledger confirmation flows.
- Optional FX transactions with explicit rate snapshots when multi-currency is enabled.

## Related docs
- `docs/guardrails.md`
- `docs/legal-constraints.md`
- `docs/system-overview.md`
- `docs/decision-event-ledger.md`
- `docs/verification-flow.md`

<!-- docs/adapters.md -->
Status: Active
Last updated: 2026-01-03

# Adapters

## Current behavior (enforced / in code)
- Adapter contracts live in `lib/adapters/*` and are pure TypeScript types only.
- Runtime adapter implementations live under `lib/adapters/runtime/*` and assemble a `World`.
- Engine code must never import from `lib/adapters/runtime/*`; only boundary layers may do so.
- Engine/authority time is numeric (`nowMs`); adapter layers convert `Date ↔ ms`.
- Idempotency keys are per-user (`(userId, key)`), persisted via `IdempotencyStore`.

## Future/Target behavior
- Engine code imports only `lib/adapters/*` plus pure type modules.
- Side effects live exclusively in adapter implementations and boundary layers.
- Engine execution is deterministic given inputs plus a `World` instance.

## Related docs
- `docs/authority-v1.md`
- `docs/cherry-vision.md`
- `docs/ci-and-guardrails.md`

<!-- docs/agent-run-summary.md -->
Status: Deprecated
Last updated: 2026-01-02

# Agent Run Summary (Historical)

This document captures a historical run summary and is not authoritative for current routing or UI state.

## Current behavior
- See `docs/routes-map.md`, `docs/dev-route-inventory.md`, and `docs/shell-architecture.md` for current route and shell state.

## Historical summary (archived)
- Prior phases covered route migrations, design system updates, and dev console refactors.
- Details in the original summary may no longer reflect the current repo layout.

## Future/Target behavior
- None. This document is archival.

## Related docs
- `docs/routes-map.md`
- `docs/dev-route-inventory.md`
- `docs/shell-architecture.md`

<!-- docs/api.md -->
Status: Active
Last updated: 2026-01-03

# Cherry API Reference (App Router)

This file documents the server routes under `app/api/*` and how they align with Cherry’s product contract (copilot, not a card/terminal). See `docs/legal-constraints.md` for hard guardrails. Authenticate protected endpoints with cookies from `./scripts/dev-login.sh` (`-b cookies.txt`).

---

- Engine overview: versioned solver pipeline in `lib/engine` (`solveDecision`/`safeSolveDecisionForUser` with normalized state + context builders); legacy `runEngine` remains only for compatibility on older surfaces.
- Engine scoring: multi-objective utility across rewards, runway, debt relief, volatility, and rule adherence. Per-user weights come from `User.engineObjectiveProfile` (+ JSON overrides). `/api/simulate` response shape stays the same; internal ranking adapts to the user profile.

---

## Dev console surfaces (UI entry points)
- `/dev` dashboard consolidates metrics and shortcuts into engine, spend, and admin tools.
- `/scan` runs the manual advisory UI for `POST /api/scan` with session handoff to `/api/sessions` (dev-only surface).
- `/sessions` maps to `/api/sessions` CRUD and confirmation/verification flows.
- `/simulate` + `/simulations` exercise `/api/simulate` and inspect simulation history.
- `/dev/statements` uses `/api/activity` for statement rollups.
- `/vine-simulator` is the UI harness for `/api/vine/order`.
- `/admin` fronts `/api/admin/*`, seed endpoints, and `/api/health`.
- Buckets/History pages follow the same header → metrics → panels layout with standardized Empty/Loading/Error states.
- `/history` is spend history (statement/bank-derived timeline); `/activity` is engine activity (sessions/ledger/engine events) under the Engine section.

---

## Auth
- Auth stack: NextAuth (PrismaAdapter) in `app/api/auth/[...nextauth]/route.ts`.
- Auth guard: `withUser` (`lib/with-user.ts`) wraps all stateful routes; unauthenticated calls return `401`.
- Client rule: on `401`, prompt sign-in (`signIn()`); server components redirect to `/signin?callbackUrl=...`.
- `GET /api/user/context` — returns `{ userId, mode }` for authenticated requests (used by server components to avoid direct config access).

## Error handling boundary
- Canonical error type: `AppError` (`lib/errors.ts`). Normalize in catch blocks with `asAppError` before logging or branching.
- Transport boundary throws: `fetchJSON` throws `AppError`; API routes either use `apiHandler` or catch + map `AppError` to responses.
- UI boundary is value-based: `fetchApiResult`/`callApi` return `ApiResult<T>`; components switch on `ok` and never inspect raw errors.

---

## Core Advisory API — `POST /api/scan` (advisory with telemetry)
- Route: `app/api/scan/route.ts`
- Purpose: pre-swipe advisory for manual scans, Cherry Pass/App Clip triggers, or quick bucket snapshots. **No sessions/ledger writes; logs a `DecisionEvent` for telemetry.**
- Request:
  {
    "merchantName": "Chipotle",
    "category": "DINING",           // optional RewardCategory
    "expectedAmountCents": 2000,    // optional integer >= 0; 0 gives bucket snapshot
    "mccCode": 5812                 // optional MCC
  }
  - `merchantName`: required string.
  - `expectedAmountCents`: optional non-negative integer; defaults to `0` if omitted/invalid.
  - `category` and `mccCode`: optional. Category resolution prefers explicit → MCC map → merchant heuristics/history.
- Behavior:
  - Validates JSON with `lib/schemas/scan.ts` and `parseJsonBody` (`lib/validation.ts`).
  - Resolves category via `resolveScanCategory` (MCC-aware).
  - Calls engine solver via `safeSolveDecisionForUser` (legacy fallback allowed for mapping) and `validateEngineDecision`; logs a `DecisionEvent` row per request (no session/bucket/ledger writes).
- Response: bucket/card verdicts + Cherry incentive + raw `engineDecision` echo for debugging + `authority` (authority_v1: verdict, severity, reasons[], counterfactuals[], explanation, inputsVersion).

---

## Session + Reward Lifecycle
Routes: `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/sessions/[id]/confirm/route.ts`, `app/api/sessions/[id]/verify/route.ts`

Purpose: persist a recommendation (manual scan or Vine), let the user claim they followed advice, and move Cherry Points between `PENDING`/`POSTED`/`REVOKED`.

### `POST /api/sessions`
- Body fields: `merchantName?`, `amountCents` (int > 0), `category?`, `currency?` (default `USD`), optional `deviceId`, `storeId`, `terminalId`, `orderId`, `mccCode`.
- Behavior:
  - Validates via `lib/schemas/sessions.ts`.
  - Runs engine solver (`safeSolveDecisionForUser`) and persists `RecommendationSession` with verdicts, coverageMode, offered points, expiry (~15 minutes), `orderToken` (UUID), `source = APP_SCAN`.
  - Returns `{ sessionId, orderToken, expiresAt, source, decision }`.

### `GET /api/sessions`
- Query params: `limit` (<=100), `offset`, `status` (`all|active|expired|confirmed`), `verdict` (comma list), `from`, `to`, `source`.
- Returns paginated summaries via `fetchSessionSummaries`.

### `GET /api/sessions/[id]`
- Returns a single session with verdicts, coverageMode, expiry, anomalyCode, and computed `pointsPosted`/`pointsPending`. Marks `isExpired` based on `expiresAt`.

### `POST /api/sessions/[id]/confirm`
- Body:
  {
    "actualAmountCents": 2200,    // optional positive int; defaults to recommended amount
    "usedCardId": "card_abc",     // optional override
    "followedRecommendation": true
  }
- Behavior:
  - Rejects missing/unauthorized/expired/claimed/verified/rejected sessions.
  - Flags anomalies:
    - amount mismatch (<85% or >115% of recommended),
    - time window violation (>24h since creation),
    - card mismatch when a different card is claimed.
  - Freshens the recommended bucket via `ensureBucketFresh` and increments `spentCents` once per session.
  - Creates `CherryPointLedger` row(s) with `PENDING` status; anomaly codes propagate to ledger.
  - Calls `autoVerifySession` (stub today).
  - Response: sessionStatus `CLAIMED`, ledgerStatus `PENDING`, pending points, message.

### `POST /api/sessions/[id]/verify`
- Body: `{ "verified": true | false }`.
- Behavior:
  - Finalizes session to `VERIFIED`/`REJECTED`; updates `verificationStatus`, `verifiedAt`/`rejectedAt`.
  - Moves pending ledger rows to `POSTED` (when verified) or `REVOKED` (when rejected); anomaly codes mirror session.
  - Response: `{ ok: true, sessionStatus, ledgerStatus }`.

---

## Vine Order Ingestion (dev-only)
- Route: `app/api/vine/order/route.ts`
- Purpose: ingest order context from the Vine simulator or future hardware, run the engine, and create a bound `RecommendationSession`.
- Accepted payloads:
  1) **Terminal event form** (`lib/schemas/vine-terminal.ts`): amount, optional currency, merchant block (name/storeId/MCC), terminal block (terminalId), vine block (source/sessionId).
  2) **OrderContext form** (`lib/schemas/vine.ts`): `deviceId`, `amountCents` (positive int), `timestamp` (epoch ms), optional merchant/store/terminal/order IDs, optional `mccCode`, optional `nonce`, optional `source` (default `VINE_SIM`).
- Behavior:
  - Parses terminal event first; falls back to `OrderContext`.
  - Validates MCC when provided; rejects stale payloads (> ~3 minutes old).
  - Calls `runRecommendationFromOrderContext` → engine; persists `RecommendationSession` with `source` = `VINE_SIM` or `VINE_DEVICE`, `orderToken` (nonce or UUID), expiry ~15 minutes; also runs `simulateSpendAuthority` (authority_v1) and logs a `DecisionEvent` when authority returns `ok: true`.
  - Returns `{ sessionId, decision, orderToken, authority }`.
- Not implemented yet: HMAC/nonce verification, cleanup of expired order tokens.

---

## Wallet Pass Scaffold
- Route: `app/api/wallet/cherry-pass/route.ts`
- Behavior:
  - Guarded by `withUser`.
  - Gating via `getWalletPassConfigStatus`:
    - Requires `CHERRY_WALLET_PASS_ENABLED=true`.
    - Requires Apple Wallet env vars: `APPLE_WALLET_TEAM_ID`, `APPLE_WALLET_PASS_TYPE_ID`, `APPLE_WALLET_ORG_NAME`, `APPLE_WALLET_PASS_DESCRIPTION`, `APPLE_WALLET_CERT_PASSWORD`, `APPLE_WALLET_CERT_PATH`, `APPLE_WALLET_WWDR_CERT_PATH`.
  - If disabled/misconfigured: returns `501` JSON `{ error: "wallet_pass_not_configured", reason, message }`.
  - When fully configured: generates a `storeCard` `.pkpass` via `lib/wallet/cherryPass.ts`.
- Positioning: loyalty/advisory pass only; never a payment instrument (see `docs/wallet-pass.md`).

---

## Cards, Buckets, Simulation, MCCs
- `/api/cards` — CRUD for cards (auth required).
- `/api/cards/[cardId]` — update a specific card (PATCH).
- `/api/cards/[cardId]/rewards` — CRUD for reward rules on a card (includes PATCH for updates).
- `/api/buckets` — Create/list/delete buckets; sets period windows on create (weekly starts Monday).
- `/api/buckets/[bucketId]` — Update or delete a specific bucket (PATCH/DELETE).
- `/api/simulate` — Runs the same engine as `/api/scan`/`/api/sessions` (via `safeSolveDecisionForUser` in `lib/engine/solver.ts`) and records a `SimulatedTransaction` for sandbox history; does **not** mutate buckets. Also runs `simulateSpendAuthority` (authority_v1), logs a `DecisionEvent` when authority returns `ok: true`, and returns an `authority` verdict/severity/reasons/counterfactuals alongside the legacy card-focused response. The solver now considers multi-action decisions (delay/reject/merchant-switch/debt paydown), but this route still returns the legacy card-focused response.
- `/api/simulations` and `/api/simulations/[id]` — List/fetch simulated transactions.
- `/api/mccs` — Read MCC → RewardCategory mapping.
- `/api/activity` — Activity feed (sessions/ledger/simulations) with pagination/filters.
- `/api/autopilot/prereqs` — returns Autopilot onboarding prerequisites (`cards/rules/buckets` counts + warnings) and the first missing step.

All use Zod validation in `lib/schemas/*`, `parseJsonBody` from `lib/validation.ts`, and `withUser` guard where stateful.

---

## Admin/Dev Endpoints (local only)
- `/api/admin/clear-user` — clear user data (cards/buckets/etc).
- `/api/admin/clear-sessions` — clear `RecommendationSession` rows.
- `/api/admin/clear-ledger` — clear `CherryPointLedger` rows.
- `/api/admin/health` and `/api/health` — health checks.
- `/api/seed-demo` and `/api/seed-demo/cards-buckets` — seed demo data.
- `/api/dev/pending-sessions` — list PENDING-ledger sessions for the user.
- `/api/dev/bank/ingest` — dev-only bank ingest; `POST { transactions: RawBankTransaction[] }` upserts `BankTransaction` rows idempotently (`source = "dev_simulator"`), `GET` dumps recent rows for the current user. In production, dev sources are rejected.
- `/api/dev/verification/trigger` — dev-only manual verification trigger that forwards a `VerificationSignal` into `verifySessionFromSignal` (tests ledger POSTED/REVOKED without bank simulator UI).
- Dev-only CSV ingest shortcut: `npm run dev:ingest:moustafa-bank` parses `data/bank/moustafa-adv-safebalance-2061.csv` and writes `BankTransaction` rows with `source = "csv_dev"`; blocked in production.

---

## Notes and Invariants
- Errors must cross boundaries only via `AppError` (API) or `ApiResult<T>` (UI); do not throw or inspect raw errors across layers.
- `/api/scan` is a hard stateless boundary; all persistence must occur via `/api/sessions` and ledger flows only.
- Engine solver traces multiple action types internally; public APIs still expose card-centric recommendations for compatibility.
- Monetary values are integer cents in APIs and DB.
- Bank ingest must be idempotent on `(userId, externalId)` only; provider data must never supply `BankTransaction.id`.
- Do not store card PAN/CVV/track data; Vine payloads are context-only.
- Wallet pass remains gated at 501 until Apple certs/env vars are provided and the feature flag is set.
- All routes must respect the legal guardrails in `docs/legal-constraints.md`.

## Current behavior (enforced / in code)
- API handlers live under `app/api/*` and parse inputs with Zod schemas plus `parseJsonBody`.
- Engine decisions run through `safeSolveDecisionForUser` or `safeSolveDecisionForWorld` with deterministic inputs.
- `/api/scan` logs `DecisionEvent` telemetry but does not create sessions/ledger rows.
- `/api/sessions` is the persistence boundary for recommendations and Cherry Points.
- Wallet pass remains gated until certs and the feature flag exist.

## Future/Target behavior (explicitly speculative)
- Add enforced Vine signature lifecycle and a verified bank/receipt path that posts Cherry Points automatically.
- Document any new API surfaces in this file before shipping.

## Related docs
- `docs/routes-map.md`
- `docs/legal-constraints.md`
- `docs/cherry-vision.md`
- `docs/wallet-pass.md`

<!-- docs/architecture/auth.md -->
Status: Active
Last updated: 2026-01-02

# Auth Architecture (NextAuth + Prisma)

This document explains how authentication works in Cherry and how to keep it aligned with the product guardrails (`docs/legal-constraints.md`, `docs/cherry-vision.md`). It must stay consistent with `AGENTS.md`.

---

## Overview
- Identity/auth stack: **NextAuth** with **PrismaAdapter**.
- Location: `app/api/auth/[...nextauth]/route.ts`.
- Storage: `User`, `Account`, `Session`, `VerificationToken` tables in `prisma/schema.prisma`.
- Session guard: `withUser` (`lib/with-user.ts`) extracts `userId` via `getServerSession` and returns `401` on failure.
- Client handling: components use `useSession()` and call `signIn()` on `401` responses from APIs.

## Current behavior (enforced / in code)
- Stateful routes use `withUser` or `resolveUserContext` to require auth and supply `userId`.
- `/api/scan` allows lab demo access (`requireAuth: false`) but still resolves user context when possible.

## Providers and Env
- Supported providers today:
  - **Email** (`EMAIL_SERVER`, `EMAIL_FROM`)
  - **Google OAuth** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
  - **Dev Credentials** (non-production only; creates/fetches user by email, no secrets required)
- Add providers by importing from `next-auth/providers/*` inside `authOptions.providers`.
- Keep secrets in `.env.local` (never committed).

## Session Lifecycle
1. User signs in via `/signin` or `signIn()` (client).
2. NextAuth issues a session token; PrismaAdapter persists `User` + `Account` + `Session`.
3. `session` callback stamps `session.user.id`.
4. API routes call `withUser(request, handler)` → loads session → supplies `userId` → 401 if absent.
5. UI reacts to 401 by prompting sign-in (never silently fails).

## Protected Surfaces
- Auth is required for stateful APIs (via `withUser` or `resolveUserContext`), including:
  - `/api/sessions`, `/api/sessions/[id]`, `/api/sessions/[id]/confirm`, `/api/sessions/[id]/verify`
  - `/api/vine/order`
  - `/api/cards`, `/api/cards/[cardId]`, `/api/cards/[cardId]/rewards`
  - `/api/buckets`, `/api/buckets/[bucketId]`
  - `/api/simulate`, `/api/simulations`, `/api/activity`
  - `/api/autopilot/*`
  - Admin/dev utilities (`/api/admin/*`, `/api/seed-demo`, `/api/dev/*`, `/api/internal/*`)
- Advisory `/api/scan` resolves user context but allows lab/demo access.
- Health endpoints (`/api/health`, `/api/admin/health`) are open by design.
- UI pages calling protected endpoints must wrap in `useSession()` and redirect/prompt on unauthenticated states (`/signin?callbackUrl=...`).

## Error Handling and UX Rules
- Never let `401` bubble as a generic error. In client components, if `res.status === 401`, call `signIn()` or show a CTA.
- In server components, redirect to `/signin` with `callbackUrl` for the requested page.
- The `/signin` page should clearly state that Cherry is a spending copilot (not a card) and link to legal/privacy if exposed to users.

## Testing Auth
- CLI: use `./scripts/dev-login.sh [email]` to create `cookies.txt`, then pass `-b cookies.txt` to curl.
- Browser: hit `/signin`, complete provider flow, then exercise APIs via UI or Dev Console.
- After schema changes, run `npx prisma migrate dev` and `npx prisma generate` so NextAuth tables stay in sync.

## Do / Don’t
- **Do** enforce auth via `withUser` for every stateful API.
- **Do** keep session callbacks stamping `session.user.id`.
- **Do** handle `401` intentionally in UI.
- **Don’t** read cookies manually or create ad-hoc Prisma clients.
- **Don’t** weaken auth on admin tools; they are local-only and should stay guarded.

## Future/Target behavior (explicitly speculative)
- Add stricter role gating for admin/dev utilities before any production exposure.

## Related docs
- `AGENTS.md`
- `docs/ci-and-guardrails.md`
- `docs/legal-constraints.md`

<!-- docs/architecture/compat-shims.md -->
Status: Active
Last updated: 2026-01-02

# Compat shims policy

Purpose: keep strict typing while upstream packages ship incomplete or unstable type surfaces.

## Current behavior (enforced / in code)
- Compat shims live under `types/compat/*` and are scoped to missing surfaces only.
- Guardrails enforce TS project ownership and prevent stray shims.

## Invariants
- Each `declare module 'X'` exists in exactly one file.
- No shim introduces globals except `types/jsx-global.d.ts`.
- Scripts TS program only includes compat shims it actually needs.

## Upgrade procedure
1) Upgrade dependency.
2) Run `npm run check`.
3) If a shim becomes unnecessary, delete it.
4) If a shim must remain, keep it minimal and scoped to the exact missing surface.

## Smell
- Package-level augmentation (`declare module 'nodemailer'`) should be rare and justified.

## Future/Target behavior (explicitly speculative)
- Reduce shim usage as upstream typings improve.

## Related docs
- `docs/ci-and-guardrails.md`
- `types/compat/README.md`

<!-- docs/architecture/typed-eslint-postmortem.md -->
Status: Deprecated
Last updated: 2026-01-02

# Typed ESLint Postmortem (Historical)

This is a historical postmortem kept for context. It is not an active contract.

## Current behavior
- Lint and typecheck boundaries are enforced via tsconfig and guardrails; see `docs/ci-and-guardrails.md`.

## Summary
- Problem: typed ESLint surfaced files outside its TS program.
- Root cause: lint scope diverged from TSConfig scope; scripts were typechecked under app semantics.
- Key insight: ESLint is correct when it reports project-boundary violations.
- Fix: introduce a TSConfig lattice (base/app/scripts/eslint) and explicit ESLint routing.
- Invariant: every linted file belongs to exactly one TS program.
- Result: editor and CI share one semantic universe with no implicit assumptions.

## Future/Target behavior
- None. This remains a historical record.

## Related docs
- `docs/ci-and-guardrails.md`
- `docs/guardrails.md`

<!-- docs/audit-format.md -->
Status: Active
Last updated: 2026-01-03

# Cherry Audit Format (agents)

Canonical spec for writing future audit entries in `AUDIT.md`.

## Current behavior (enforced / in code)
- `AUDIT.md` entries must follow this schema and section order.

## 0. JSON header (required for every new audit entry)

Each audit section MUST start with a JSON code block:

{
  "audit_type": "repository_completion",
  "audit_version": 2,
  "date": "YYYY-MM-DD",
  "git": {
    "branch": "main",
    "commit": "<short-sha>",
    "dirty": false
  },
  "completion": {
    "beta": 66,
    "v1": 66
  },
  "subsystems": {
    "core_engine": 69,
    "api_layer": 75,
    "data_ingestion_modeling": 60,
    "user_web_ui": 68,
    "dev_console_admin": 69,
    "cherry_pass": 50,
    "cherry_vine": 58,
    "security_ops": 56,
    "docs_product_identity": 84
  }
}

Use the latest scores for that audit; keep keys stable. JSON uses snake_case.

## 1. Section order

1. JSON header (above)
2. Summary + subsystem table
3. Evidence and Observations (with scoring rationales)
4. Highest-Leverage Next Steps
5. Risk Register (see below)
6. Handoff Notes for Next Agent
7. Open Questions for Human

## 2. Delta section (mandatory)

Include `### 1.b Delta since previous audit` that:
- Finds the prior audit in `AUDIT.md`.
- Shows a table: Subsystem | Prev (%) | Now (%) | Δ | Notes.
- Bullets for any |Δ| ≥ 5 or added/removed subsystems.

## 3. Risk Register

`### 5. Risk Register` must contain:
- Table: ID | Title | Subsystem | Likelihood (LOW/MEDIUM/HIGH) | Impact (LOW/MEDIUM/HIGH/CRITICAL) | Status (OPEN/MITIGATING/CLOSED/ACCEPTED) | Notes.
- At least 5 rows covering: security/ops, data integrity, legal/identity, engine quality, UX/behavioral risks.
- Stable IDs like `SEC_RATE_LIMIT`, `ENG_DEBT_MODEL`, `VINE_SIGS`.

## 4. Handoff & Questions

- `### 6. Handoff Notes for Next Agent`: 3–10 bullets prefixed with `[CONTEXT]`, `[GOTCHA]`, or `[WORKFLOW]`.
- `### 7. Open Questions for Human`: 3–10 direct questions for the maintainer.

## 5. Subsystem key mapping

- `core_engine` ↔ “Core Engine”
- `api_layer` ↔ “API Layer / Backend Routes”
- `data_ingestion_modeling` ↔ “Data Ingestion & Modeling”
- `user_web_ui` ↔ “User-facing Web UI”
- `dev_console_admin` ↔ “Dev Console / Admin Tools”
- `cherry_pass` ↔ “Cherry Pass / Pre-Swipe”
- `cherry_vine` ↔ “Cherry Vine”
- `security_ops` ↔ “Security, Reliability, Ops”
- `docs_product_identity` ↔ “Documentation & Product Identity”

JSON uses keys; tables/headings use labels. Update both if you add/remove subsystems.

## 6. Scoring rationales

For each subsystem in `### 3. Evidence and Observations`:
- Provide ≥3 bullets.
- Each bullet references specific files/modules and tags the maturity judgment (HIGH/MEDIUM/LOW).
- Example: `lib/engine/solver.ts` integrates candidate generation, simulation, scoring but still calls legacy mapper → MEDIUM maturity (core present, migration incomplete).

## 7. Behavioral guidelines

- Be conservative; credit only what’s on `main`.
- If evidence is missing, say so in the Evidence section.
- Do not change weights or subsystems without updating the JSON example, mapping, and noting the change in the next Delta section.

## Audit Mindset (for agents)

Cherry audits are not just snapshots. They exist so a different LLM (or human) can safely pick up the repo later and know:

- What is real vs prototype.
- What changed since last time.
- What is risky vs boringly safe.
- What the next few sprints should actually do.

When you run an audit, adopt this mindset:

1. **Diff-first, then scan**
   - Before reading everything, inspect what changed since the last audit:
     - `git log --oneline` between the two audit commits.
     - `git diff <prev-audit-commit>...HEAD` focusing on `app/`, `lib/`, `prisma/`, `docs/`.
   - Use this to target your attention. Do not re-describe subsystems that did not change except in the Delta table.

2. **Product loop first, features second**
   - Think in terms of the core loop: **Observe → Evaluate → Recommend → Verify → Reflect**.
   - Map each change to where it lands in the loop:
     - Observe = ingest / Vine / bank / pass.
     - Evaluate = engine, guardrails, scoring.
     - Recommend = scan/session surfaces, API responses.
     - Verify = verification, ledger, receipts/bank signals.
     - Reflect = statements/history, points, feedback into budgets.
   - When scoring and writing evidence, always say which stage of the loop a change affects.

3. **Be risk-biased, not feature-biased**
   - Adding new screens or endpoints is less important than:
     - Removing legacy paths.
     - Tightening guardrails.
     - Reducing “magic” behavior.
   - When in doubt, lower scores if:
     - There is no test coverage.
     - There is a silent failure path.
     - A critical flow depends on manual conventions.

4. **Assume the human is the product brain, not the infra expert**
   - Explain tradeoffs in language a product person can use:
     - “If we ship like this, X can happen” rather than “module Y is messy”.
   - Prefer statements of the form:
     - “If Cherry is used by 1000 strangers, this subsystem will break in these ways: …”

## Longitudinal Consistency Rules (for agents)

Your job is to make audits comparable over time.

1. **Risk IDs are stable**
   - Never rename an existing `ID` in the Risk Register.
   - If a risk is resolved, keep the row but change:
     - `Status` to `CLOSED` or `ACCEPTED`.
     - `Notes` to explain what changed (file paths, commit hash if known).
   - New risks get new IDs; do not recycle old ones.

2. **Subsystem scores should move slowly**
   - Changes ≥ 5 points on a subsystem must:
     - Be linked to specific commits, files, and tests.
     - Be explained clearly in `### 1.b Delta since previous audit`.
   - If you can’t justify a ≥ 5 move with concrete code/docs evidence, do not move it.

3. **Completion_beta vs Completion_v1**
   - `completion_beta` can move on smaller changes (internal tools, flows).
   - `completion_v1` should not move unless:
     - Risk register shows important risks moving to MITIGATING/CLOSED.
     - Real-world ingest / verification / security posture improves.
   - Always explain why the two numbers did or did not diverge.

## Evidence Quality & Uncertainty (for agents)

You must distinguish between what you know and what you are guessing.

1. **Mark weak evidence explicitly**
   - When you’re not sure (e.g., feature hidden behind flags, unclear dead code), say so in the Evidence section:
     - “Appears unused; no references from `app/api/*` (LOW confidence).”
   - Do not assign high scores based on speculative behavior.

2. **Prioritize observed behavior over intent**
   - If docs promise a behavior but code does not enforce it:
     - Score based on code, not docs.
     - Note the mismatch in `### 3. Evidence and Observations` and/or Risk Register.
   - Never assign maturity or score increases based solely on documentation, comments, flags, or TODOs; only observed behavior on `main` counts.

3. **Call out blind spots**
   - If you did not inspect a plausible area (e.g., mobile client, external service), note:
     - “Not inspected: <area>. Scores do not reflect its state.”
   - Do not implicitly assume external systems are safe or complete.

## Turning Findings into Sprints (for agents)

Highest-Leverage Next Steps must be usable as sprints, not just vibes.

For each item in `### 4. Highest-Leverage Next Steps`:

1. Ensure it can be turned into a GitHub issue or sprint goal:
   - Clear scope (files, surfaces, APIs).
   - Clear “done” condition (tests, docs, behavior).

2. Add a one-line **Cost/Benefit** estimation:
   - Example:
     - “Cost: ~1–2 focused days.”
     - “Cost: multi-sprint refactor, should be broken down.”

3. Tag each item with the affected loop stage:
   - `[OBSERVE]`, `[EVALUATE]`, `[RECOMMEND]`, `[VERIFY]`, `[REFLECT]`, `[INFRA]`.
   - Example: `[VERIFY][INFRA] Wire webhook → verification signal → ledger auto-posting …`

4. Prefer fewer, heavier items over many small ones:
   - 5–7 items is ideal.
   - Each item should move at least one subsystem ≥ 2–3 points if fully completed.

## Future/Target behavior (explicitly speculative)
- If the audit schema evolves, update this file and `AUDIT.md` together.

## Related docs
- `AUDIT.md`
- `docs/system-overview.md`

## Cherry Mental Model Primer (for agents)

Before scoring or suggesting work, align to this mental model:

1. **Cherry is advisory only**
   - It never fronts payments.
   - It should behave like a copilot sitting next to the card, not a new card.

2. **The “user story” you should optimize**
   - A real person:
     - Signs in.
     - (Eventually) links real accounts/cards.
     - Gets advice before paying (scan / Vine / pass).
     - Actually makes a decision based on that advice.
     - Later sees the impact in:
       - Buckets/budgets.
       - Statements/history.
       - Points/rewards.
   - When evaluating features, always ask:
     - “Does this make that story real, safer, or more boringly reliable?”

3. **Prototype vs product**
   - Anything that only works with seeded data is a **lab tool**, not a user feature.
   - Treat lab-only flows as helpful for beta but not as v1-complete.

## Human Interaction & Style (for agents)

The maintainer (Moustafa) is:

- The product brain.
- An indie dev.
- Not interested in fluff.

When you write audits:

1. **Be terse and explicit**
   - Avoid marketing language.
   - Prefer:
     - “X is unsafe because Y” over “X might be improved.”

2. **Surface hard truths early**
   - In `### 1. Summary`, include one blunt line:
     - “Main blockers to real users: <list of 2–3 systemic issues>.”

3. **Ask sharp, binary questions**
   - In `### 7. Open Questions for Human`, avoid vague questions.
   - Prefer yes/no or “pick one” questions:
     - “Do you want Vine to be required for any v1 cohort? (yes/no)”
     - “Should we prioritize real ingest before pass/Vine, or the reverse?”

<!-- docs/authority-ui-contract.md -->
Status: Active
Last updated: 2026-01-03

# Authority → UI Contract (advisory-only)

Scope: Defines how UI surfaces must consume `authority_v1` outputs. UIs are renderers, not interpreters.

## Current behavior (enforced / in code)
- Authority decisions are returned by `/api/scan`, `/api/simulate`, `/api/vine/order`, and Autopilot surfaces.
- UI must render authority outputs verbatim and avoid translating them into payment semantics.

## Contract
- Render `authority` exactly as provided: `verdict`, `severity`, `reasons[] { code, severity, detail }`, `counterfactuals[]`, `explanation`.
- Authority outputs may affect presentation only; UIs must not enable, disable, gate, or alter flows based on authority fields.
- Do **not** remap severity, invent labels, or re-rank reasons. Use the ordering provided by the engine.
- Do **not** translate advisory signals into approval/decline/route semantics. Allowed verbs: *simulate, evaluate, recommend, warn, flag*.
- Show counterfactuals verbatim (e.g., suggested amount/delay/bucket); do not alter thresholds or add local logic.
- Persisted DecisionEvents are authoritative for replay/analytics; UIs must not mutate or synthesize new events.

## Why this exists
- Prevents UI drift that reintroduces payment semantics.
- Keeps a single, deterministic source of truth for authority reasoning.
- Enables safe iteration on engine rules without breaking surfaces.

## Anti-patterns (forbidden)
- Re-labeling `FLAG_SIMULATED`/`WARN_SIMULATED` as decline/approve.
- Dropping reasons or counterfactuals because they “seem redundant”.
- Client-side severity math or “smart” thresholds.
- Creating new reason codes in UI or telemetry.

## Allowed presentation tweaks
- Copy/visual styling is allowed if it does not change meaning.
- Grouping reasons for readability is allowed **only** if all reasons remain visible and unedited.

## Future/Target behavior (explicitly speculative)
- If an `authority_v2` is introduced, update this contract with any new fields or reason codes before shipping UI changes.

## Related docs
- `docs/authority-v1.md`
- `docs/legal-constraints.md`
- `docs/api.md`

<!-- docs/authority-v1.md -->
Status: Active
Last updated: 2026-01-03

# Authority v1 (advisory-only, deterministic)

Cherry’s authority layer is a pure, replayable simulator that answers: **“Given this hypothetical spend, how strongly should Cherry discourage it — and why?”** It never approves/declines, never mutates state, and is advisory-only.

Aligns with: `docs/legal-constraints.md` (no payments), `docs/cherry-vision.md` (copilot), `docs/wallet-pass.md` (501 gate), and engine invariants.

---

## Current behavior (enforced / in code)
- Authority is deterministic and pure; same inputs yield the same verdicts and inputsVersion.
- `simulateSpendAuthority` runs in `/api/scan`, `/api/simulate`, `/api/vine/order`, and Autopilot preview/commit.
- `DecisionEvent` rows are logged only when authority returns `ok: true`.
- The spec is frozen for `authority_v1`; semantic changes require a new version.

## Inputs
- `userId` (string, required)
- `amountCents` (int, ≥ 0; `0` denotes a snapshot/no-spend evaluation)
- `category` (RewardCategory)
- `surface` (`autopilot | vine | simulate | scan`)
- `counterfactuals?`: array of `{ amountCents?, delayDays?, bucketId? }` (optional). Defaults: 20% amount reduction, 3-day delay.

Derived (read-only):
- Latest `DailyState` (status, safeToSpendCents, inputsVersion)
- Bucket runtime (rolled via `applyInMemoryRollover` → `toBucketRuntime`)
- Category preference
- Pending verification: `RecommendationSession.verificationStatus=PENDING` count
- Pending points: `CherryPointLedger.status=PENDING` sum
- Deterministic `inputsVersion` hash over all inputs + counterfactual requests

No writes, no side effects.

---

## Outputs (type: `SimulatedAuthorityDecision`)
- `version`: `'authority_v1'`
- `verdict`: `ALLOW_SIMULATED | WARN_SIMULATED | FLAG_SIMULATED`
- `severity`: integer lattice (max of reasons)
  - `3`: hard flag
  - `1–2`: warning
  - `0`: allow
- `reasons`: non-empty array of `{ code: AuthorityReason, severity, detail }`
  - `AuthorityReason` (finite): `DAILY_STATE_RISKY`, `BUCKET_EXHAUSTED`, `ESSENTIAL_BUFFER_LOW`, `CATEGORY_RESTRICTED`, `VERIFICATION_PENDING`, `AMOUNT_SPIKE`
  - Severity map (deterministic):
    - `CATEGORY_RESTRICTED`: 3
    - `BUCKET_EXHAUSTED`: 3
    - `DAILY_STATE_RISKY`: 2 (tight/risky), 0 when steady (fallback detail)
    - `ESSENTIAL_BUFFER_LOW`: 2
    - `VERIFICATION_PENDING`: 1
    - `AMOUNT_SPIKE`: 1
- `explanation`: top reason detail (deterministic)
- `inputsVersion`: sha256 hash of inputs + counterfactual requests
- `engineVersion`: commit/version env or `null`
- `counterfactuals`: array of `{ adjustment, verdict, severity, reasons, explanation }`

Verdict rule (severity lattice):
- `severity >= 3` ⇒ `FLAG_SIMULATED`
- `1–2` ⇒ `WARN_SIMULATED`
- `0` ⇒ `ALLOW_SIMULATED`

---

## Invariants
- Pure/deterministic: same inputs → identical outputs + inputsVersion.
- Advisory only: no bucket/session/ledger mutations; no auth/routing semantics; no approval/decline language.
- Authority outputs must never be used to gate, block, auto-expire, or otherwise alter control flow; they affect presentation and advisory messaging only.
- Reasons are exhaustive and finite; no free-form codes.
- `reasons` is non-empty; severity is the max of reasons.
- `DecisionEvent` is written once per `ok: true` invocation (see below).
- Counterfactuals use the same evaluation pipeline and determinism rules.

---

## Persistence (DecisionEvent ledger)
- Table: `DecisionEvent`
- Columns: `id`, `userId`, `surface`, `amountCents`, `category`, `verdict`, `reasonCode` (top), `reasonCodes` (array JSON), `severity`, `inputsVersion`, `counterfactuals` (JSON), `createdAt`
- Rule: every `simulateSpendAuthority` call that returns `ok: true` writes exactly one `DecisionEvent`; fallback/blocked results do not write; no retries/dedup.

---

## Language contract (allowed verbs)
- Use: **simulate, evaluate, recommend, flag, warn**
- Do NOT use: approve, decline, block, route (except as simulated labels)
- Always surface as advisory/sandbox; never imply fund movement or payment routing.

## TODO — Phase 3: Offline Learning & Policy Evaluation

Status: Deferred  
Depends on: Phase 2 ledger guarantees

Purpose:
- Enable offline analysis and policy iteration using historical DecisionEvents.
- Never affect live authority behavior.
- Never mutate user state or spending power.

Planned work:
- [ ] Offline evaluators that consume DecisionEvent + inputsVersion snapshots
- [ ] Counterfactual policy scoring (would-have-been-better analysis)
- [ ] Rule fire-rate and severity distribution analysis
- [ ] Dataset extraction for research / tuning only

Hard constraints:
- No feedback loop into authority_v1
- No live re-weighting or auto-tuning
- No enforcement logic
- Results are advisory and retrospective only

Notes:
- Any live influence requires authority_v2 and explicit user opt-in.

---

## Counterfactuals (v1)
- Optional `counterfactuals` input lets callers test “what-if” adjustments (amount, delay, bucket override).
- Default set (when none provided): `{ amountCents: amount * 0.8 }`, `{ delayDays: 3 }`.
- Each counterfactual emits the full authority decision shape (verdict/severity/reasons/explanation).
- No side effects; same inputsVersion discipline (requests are included in the hash).

---

## Surfaces consuming authority_v1
- `/api/scan`, `/api/simulate`, `/api/autopilot/preview`, `/api/autopilot/commit`, `/api/vine/order` return `authority` alongside legacy decision payloads.
- UI must render the provided verdict/reasons/counterfactuals verbatim; no local inference or thresholds.

## Future/Target behavior (explicitly speculative)
- `authority_v2` may introduce new reason codes and scoring rules; no changes to `authority_v1` without a version bump.

## Related docs
- `docs/legal-constraints.md`
- `docs/cherry-vision.md`
- `docs/api.md`
- `docs/decision-event-ledger.md`

<!-- docs/autopilot-engine-adapter.md -->
Status: Active
Last updated: 2026-01-03

# Autopilot Engine Adapter (UI ↔️ Backend)

Purpose: explain, in one place, how the Autopilot UI contract (`AutopilotSimulationResult`) is filled from the real Cherry engine via `/api/autopilot/preview`. This is written for an AI agent with zero Cherry context—start here, then cross‑reference `AGENTS.md`, `docs/cherry-vision.md`, `docs/legal-constraints.md`, and `docs/api.md`. Treat this file as the adapter truth: inputs, validation, engine calls, and UI mapping all live here and must stay aligned with the code paths noted below.

Cherry guardrails you must keep in mind:
- Cherry is a spending copilot (observe → evaluate → recommend → reward). It is **not** a card/terminal/payment front.
- Autopilot is advisory only; no charges are made from the UI or this adapter.
- Wallet/Vine/payment rails are out of scope here; we only fetch a recommendation.

Repo/location primers:
- Framework: Next.js 16 App Router; TypeScript; server-first.
- UI entry: `app/(user)/app/autopilot/page.tsx` → `components/autopilot/AutopilotShell`.
- Adapter entry: `lib/autopilot/runSimulation.ts` (only place UI performs logic).
- Backend entry: `/api/autopilot/preview` (App Router route).
- Validation: `lib/validation/autopilot/preview.ts` (input + output schemas; single source).
- Service wrapper: `lib/autopilot/service.ts#getAutopilotPreview` (engine orchestration + DTO mapping).
- Engine entry: `lib/engine/public.getAutopilotDecisionForUserSwipe` (solver wrapper).

## Current behavior (enforced / in code)
- `/api/autopilot/preview` is read-only; adapter maps preview output to `AutopilotSimulationResult`.
- `lib/autopilot/runSimulation.ts` is the only place the UI performs mapping logic.
- Autopilot preview must never create sessions, mutate buckets, write ledger rows, or advance user state.

## Data flow (verbose, end-to-end)
1) UI sends `AutopilotPurchaseSummary` to `lib/autopilot/runSimulation.ts`. Summary is validated locally (amount > 0, merchant non-empty).
2) Adapter builds preview payload (merchant trimmed, `amountCents = round(amount*100)`, `occurredAt = now`, `category` mapped to `AutopilotRewardCategory`) and POSTs `/api/autopilot/preview` with credentials.
3) `/api/autopilot/preview` parses JSON through `AutopilotPreviewInputSchema` (`lib/validation/autopilot/preview.ts`), resolves user via `resolveUserContext(requireAuth: true, allowLabDemo: true)`, then calls `getAutopilotPreview` in `lib/autopilot/service.ts`.
4) Service builds the engine call context (card universe from Prisma, idempotency fingerprint, bucket lookup), invokes `getAutopilotDecisionForUserSwipe`, maps to the DTO, validates the DTO through `AutopilotPreviewOutputSchema`, and returns it (no writes).
5) Route re-validates with `AutopilotPreviewOutputSchema`, logs guardrail events on `blocked`/`fallback`, and responds 200 JSON.
6) Adapter validates the JSON again with `AutopilotPreviewOutputSchema`, maps to `AutopilotSimulationResult` (state, cards, impact bar, badges, CTAs), and hands it to the pure UI renderers.

### Semantics ownership (current and target)
- **AdapterSemantics v1 (current reality):** `lib/autopilot/runSimulation.ts` still authors user-facing strings (card labels, reward strength labels, badge copy, impact segment labels). Guardrail tests (`tests/autopilot-*-literals.test.ts`) snapshot current literals to prevent silent drift.
- **EngineSemantics v2 (target):** `/api/autopilot/preview` should return a complete UI bundle (badge labels/tones, card labels/sentences, section headers, segment labels, reward strength label, CTA labels, action note, idle/loading/error copy, timestamp fallback). When v2 exists, the adapter becomes formatting-only and the UI remains a pure renderer. Keep v1 stable until v2 is implemented and adopted.

## Shape quick reference (with validation hooks)
- **Input (UI → runSimulation):**
  type AutopilotPurchaseSummary = {
    amount: number;          // dollars, > 0
    merchant: string;        // required
    category: "dining" | "groceries" | "travel" | "gas" | "other";
    timing: "now" | "scheduled-soon";
  };
- **Preview request (runSimulation → backend)** — validated by `AutopilotPreviewInputSchema`:
  {
    "merchant": "Chipotle",
    "amountCents": 2200,
    "occurredAt": "2025-12-05T05:00:00.000Z",
    "category": "DINING"
  }
- **Preview response (validated twice via `AutopilotPreviewOutputSchema`: service + route + adapter):**
  {
    "decisionId": "decision-123",
    "merchant": "Chipotle",
    "amountCents": 2200,
    "occurredAt": "2025-12-05T05:00:00.000Z",
    "status": "ok|blocked|fallback",
    "recommendedCard": { "id": "...", "label": "...", "issuer": null, "network": null },
    "expectedBenefitCents": 120,
    "explanation": { "primary": "...", "secondary": ["..."], "warnings": ["..."] },
    "bucketImpact": { "bucketId": "...", "name": "Dining", "remainingCents": 7000, "spentCents": 13000 },
    "reasonCode": "MAX_REWARDS"
  }
- **Renderer contract (`AutopilotSimulationResult` key fields the UI expects):**
  - `state: "recommended" | "warning"`
  - `cards: SimulationCardChoice[]` (index 0 is primary)
  - `rewardStrength: 1 | 2 | 3 | 4` + `rewardStrengthLabel`
  - `impactSegments: { label; percentage; color }[]` **exactly 3 entries**
  - `impactNotes: string[]`
  - `monthImpactTitle`, `monthImpactSummary`, `monthImpact.riskNote`
  - `safetyBadgeClass`, `safetyBadgeDotClass`, `safetyBadgeLabel`
  - `ctaPrimary`, `ctaSecondary`

## Mapping (preview → AutopilotSimulationResult, verbose)
- `state`: `recommended` only when `status === "ok"` AND no warnings AND bucket has remaining > 0; otherwise `warning`.
- `status === "blocked"` indicates a preview generation failure or guardrail stop, not an authority verdict, and must not be presented as a spend warning or denial.
- `cards`: index 0 is the recommended card (or “Your usual card”) with `labelTone` positive/negative by state; index 1 is a neutral “Alternate card” placeholder to keep UI loops stable even when no alternate exists.
- `rewardStrength`: derived from `expectedBenefitCents / amountCents` bands (≤1% → 1, >1% → 2, >2% → 3, >3% → 4) with `rewardStrengthLabel` (“Low”→“Strong” rewards).
- `recommendationSummary`: `explanation.primary` or fallback “Use <card>…”.
- `impactSegments`: always exactly 3; uses `bucketImpact.spentCents` + `remainingCents` when present (used vs remaining vs everything else) or padded safe defaults otherwise.
- `impactNotes`: bucket remaining note (when present) + `explanation.secondary` + `explanation.warnings`.
- `monthImpactSummary`: bucket remaining narrative + reward uplift string when `expectedBenefitCents > 0`; `monthImpact.riskNote` concatenates warnings or a safe default.
- `riskBanner`: first warning when `state === "warning"`; omitted in recommended posture.
- Safety badge: green for `recommended`, amber for `warning`; CTAs are text-only (“Use <card>…”, “View bucket impact”).

## Validation and guardrails (authoritative checkpoints)
- Input guard: `AutopilotPreviewInputSchema` enforces merchant trimmed + present, `amountCents` positive int, `occurredAt` ISO string (defaults to now in adapter), and required `category` enum. The route rejects invalid/absent JSON with `400/INVALID_PAYLOAD`.
- Engine guard: service checks userId, card universe non-empty, positive amount, and wraps engine errors with `AutopilotServiceError (500, ENGINE_ERROR)` without mutating state.
- Output guard: `AutopilotPreviewOutputSchema` is applied in the service, the route, and the adapter—three gates before UI consumption. If any gate fails, callers see a structured error; no partial payloads flow through.
- Error envelope: all non-200 responses from `/api/autopilot/preview` include `{ error, code }` (e.g., `INVALID_PAYLOAD`, `UNAUTHORIZED`, `ENGINE_TIMEOUT`, `PREVIEW_UNEXPECTED_ERROR`). The adapter reads `code` when present to classify failures but never surfaces it as UI copy.
- Adapter invariants: `impactSegments.length === 3`, `rewardStrength ∈ {1,2,3,4}`, `state` derived only from status + warnings + bucket pressure; errors include `errorTimestamp` for UI.
- Network/auth: `fetch("/api/autopilot/preview", credentials: "include")` so auth cookies are required; UI shows the simulation error banner while retaining the last good result.
- UI purity guard: no business logic in `AutopilotShell`, `AutopilotPurchaseForm`, `AutopilotDecisionPanel`, or `AutopilotMonthImpactBar`. Only `AutopilotSimulationResult` drives rendering.

## Quick start for a new agent
1) Read `AGENTS.md` → legal/identity constraints (copilot, not a card).  
2) Read this file end to end.  
3) If you change the contract, edit `lib/autopilot/runSimulation.ts` (adapter) and keep `AutopilotDecisionPanel` untouched.  
4) Keep `/api/autopilot/preview` shape in sync; update `AutopilotPreviewOutputSchema` if backend changes.  
5) Run `npm test` (includes `tests/autopilot-runSimulation.test.js`) to validate the mapping.  
6) Never move business logic into UI components; adjust the adapter or backend instead.

## Tests
- `tests/autopilot-runSimulation.test.js` covers happy-path mapping: payload sent to preview, state resolution, reward strength bounds, and 3-segment impact bar padding.

## Future/Target behavior (explicitly speculative)
- Replace AdapterSemantics v1 with EngineSemantics v2 once the backend returns a full UI bundle.

## Related docs
- `docs/autopilot-master-spec.md`
- `docs/autopilot-integration-summary.md`
- `docs/legal-constraints.md`

<!-- docs/autopilot-integration-summary.md -->
Status: Active
Last updated: 2026-01-03

# Autopilot Integration Summary

## Current behavior (enforced / in code)
- **Engine location:** `lib/engine/public.getAutopilotDecisionForUserSwipe` (solver via `safeSolveDecisionForUser`; guardrails documented in `AGENTS.md`).
- **Backend routes:** `/api/autopilot/preview` (advisory fetch for UI) and `/api/autopilot/commit` (transitional: re-evaluates, enforces fingerprint/idempotency, writes a `simulatedTransaction`, and **may mutate bucket state** when the engine provides a bucket delta; no `RecommendationSession` or ledger rows today). Commit must never be exposed to end users and must not be used as a substitute for sessions/ledger-based state transitions. Both require auth via `resolveUserContext`.
- **Service and validation:** `/api/autopilot/preview` now flows through `lib/autopilot/service.getAutopilotPreview` and validates both input and output with `lib/validation/autopilot/preview.ts` (single source for schemas; route re-validates before responding).
- **Reliability/observability:** Preview route enforces structured error codes (`INVALID_PAYLOAD`, `UNAUTHORIZED`, `ENGINE_ERROR`, `ENGINE_TIMEOUT`, `PREVIEW_UNEXPECTED_ERROR`), wraps engine calls with a timeout, and emits metrics for request counts/status breakdown, bucket pressure/warnings, and route/service latency.
- **Adapter:** `lib/autopilot/runSimulation.ts` calls `/api/autopilot/preview` with `{ merchant, amountCents, occurredAt, category }`, re-validates the response with `AutopilotPreviewOutputSchema`, and adapts it into `AutopilotSimulationResult`.
- **UI contract:** `AutopilotSimulationResult` remains the sole renderer input for `AutopilotDecisionPanel`; UI components stay pure (no business logic in `AutopilotShell`, `AutopilotPurchaseForm`, `AutopilotDecisionPanel`, `AutopilotMonthImpactBar`).
- **State semantics:** `state = warning` when preview status is non-OK, warnings exist, or bucket remaining ≤ 0; safety badges and risk banners are derived from that flag. Autopilot state is a UI posture only and must not be interpreted as an authority verdict or enforcement signal. Reward strength is derived from expected benefit ratio; impact segments always padded to 3 entries.
- **Auth and guardrails:** Requests include `credentials: "include"` and respect identity/legal constraints (copilot only, no payment action). Errors surface as user-friendly copy while keeping buckets/cards untouched.
- **What to show/hide:** If the preview response is invalid or non-200, `runSimulation` throws with an `errorTimestamp`; `AutopilotShell` already surfaces `simulationError` and keeps the last successful result visible. Do not add copy or business logic to UI components—extend the adapter if semantics change. Commit is **out of scope for Phase 1**; the UI does not expose it. Use `/api/autopilot/commit` only in controlled tests until the Phase 3 commit spec is finalized.
- **Key shapes to remember:** Input `AutopilotPurchaseSummary { amount, merchant, category, timing }`; output `AutopilotSimulationResult` requires reward strength (1–4), exactly 3 `impactSegments`, badge classes, CTAs, and optional `riskBanner`. See `docs/autopilot-engine-adapter.md` for the full field mapping.
- **Zero-context onboarding (for AI agents):**
  1. Cherry is a spending copilot (not a card, not payment rails); keep advisory-only framing (see `docs/cherry-vision.md`, `docs/legal-constraints.md`).
  2. UI entry: `app/(user)/app/autopilot/page.tsx` → `AutopilotShell` → `runSimulation` → `AutopilotDecisionPanel`.
  3. Backend entry: `/api/autopilot/preview` (validated by `AutopilotPreviewOutputSchema`); solver entry `lib/engine/public.getAutopilotDecisionForUserSwipe`.
  4. Adapter source of truth: `lib/autopilot/runSimulation.ts` (do not move logic into components).
  5. Contract doc: `docs/autopilot-engine-adapter.md` (keep it in sync if fields change).
  6. Validation: run `npm test` (includes `tests/autopilot-runSimulation.test.js`) to ensure mapping stays intact.

## Future/Target behavior (explicitly speculative)
- Tighten commit semantics and document Phase 3 behavior before enabling user-facing commit flows.

## Related docs
- `docs/autopilot-engine-adapter.md`
- `docs/autopilot-master-spec.md`
- `docs/legal-constraints.md`

<!-- docs/autopilot-master-spec.md -->
Status: Active
Last updated: 2026-01-03

# Autopilot Master Spec

Scope: Autopilot subsystem only (UI `/app/autopilot`, `/api/autopilot/*`, adapter, and solver entry). This does not redefine global engine semantics, bank ingest, or Cherry Pass/Vine behavior.

Document purpose: Define the complete architecture, lifecycle, contracts, and invariants of the Autopilot subsystem.  
Governed subsystems: Autopilot UI (`/app/autopilot`), Autopilot adapter (`runSimulation`), Preview API (`/api/autopilot/preview`), Commit API (if present), and solver entry (`public.getAutopilotDecisionForUserSwipe`). This doc must stay aligned with `docs/autopilot-engine-adapter.md`, `docs/autopilot-integration-summary.md`, and the validation/service layers named below.

## Current behavior (enforced / in code)
- Preview is read-only and advisory; commit is transitional and may write simulated transactions and bucket updates.
- Autopilot uses the engine solver via `getAutopilotDecisionForUserSwipe` and authority_v1 for advisory warnings.
- UI remains render-only; mapping lives in `lib/autopilot/runSimulation.ts`.

## Implementation status
- Phase 1 — Autopilot preview wiring (UI ↔ adapter ↔ /preview ↔ engine): **COMPLETE**. Implemented in `app/api/autopilot/preview/route.ts`, `lib/autopilot/service.ts`, `lib/autopilot/runSimulation.ts`, `lib/validation/autopilot/preview.ts`, with coverage in `tests/api-autopilot-preview.test.js`, `tests/api-autopilot.user-context.test.ts`, and `tests/autopilot-runSimulation.test.js`.
- Phase 2 — Autopilot preview reliability/observability: **COMPLETE**. Structured errors `{ error, code }`, engine timeout (503/`ENGINE_TIMEOUT`), metrics (request counts, status breakdown, latencies, bucket pressure/warnings) added to `/api/autopilot/preview` and `lib/autopilot/service.ts`, with adapter-aware error handling in `lib/autopilot/runSimulation.ts`.
- Phase 3 — Autopilot commit re-spec (sessions/ledger alignment): **NOT COMPLETE**. Target contract is defined in §17; implementation is gated behind `AUTOPILOT_COMMIT_V2` and pending migration/backfill off the transitional bucket-mutating commit.

## 1. Autopilot Identity and Positioning
Autopilot is Cherry’s before-purchase spend planning copilot. It observes user-provided context (merchant, amount, category, timing), evaluates through the Cherry engine, recommends a card and budget impact, and presents advisory outputs. Autopilot is not a card, proxy, processor, terminal, or authorization layer; it never fronts or routes payments.

## 2. Surfaces and Entry Points
- `/app/autopilot` (AutopilotShell): user-facing page that gathers context and renders results; stateless aside from client state.
- `/api/autopilot/preview`: advisory API; auth required; consumes merchant/amount/category/occurredAt; returns an engine-backed preview; stateless (no bucket/session mutation).
- `/api/autopilot/commit` (transitional): optional follow-up to persist a simulated swipe; auth required; re-evaluates via the same engine flow as preview, **writes a simulated transaction**, and **may mutate bucket state** when a valid `bucketDelta` is present. It does not create `RecommendationSession` or ledger rows today and should be treated as experimental until the Phase 3 commit spec is finalized.
- Engine entry: `lib/engine/public.getAutopilotDecisionForUserSwipe` invoked by the preview service.
- Validation entry: `lib/validation/autopilot/preview.ts` (input + output schemas; single source used by route, service, adapter).
- Service entry: `lib/autopilot/service.ts#getAutopilotPreview` (engine orchestration + DTO mapping + output validation; no writes).

For each:
- Caller: UI (preview), backend service (commit).  
- Inputs/outputs: preview request/response defined by `AutopilotPreviewOutputSchema`; commit request/response defined by `AutopilotCommitInputSchema`/result.  
- Mutations: preview is read-only; commit may write simulated transaction/bucket adjustments.

## 3. Autopilot Invariants (MUST Hold Across All Implementations)
- Preview (`/api/autopilot/preview`) never mutates buckets, sessions, ledger, or simulated transactions; it is read-only.
- Autopilot commit must never be exposed in user-facing UI prior to Phase 3; any invocation before that is restricted to tests or controlled internal tooling.
- Autopilot warnings and states are UI posture only and must not be interpreted as authority verdicts or enforcement signals.
- Adapter output `AutopilotSimulationResult` always satisfies:
  - `impactSegments.length === 3`
  - `rewardStrength ∈ {1,2,3,4}`
  - `cards[0]` represents the primary recommendation; UI must not infer alternate semantics beyond provided fields.
- UI renders purely from `AutopilotSimulationResult`; no hidden business logic or alternate branching.
- Preview responses are engine-backed or explicit fallback/blocked with warnings; never silent partials.
- Auth is required for preview/commit; no anonymous Autopilot.
- All copy and behavior remain advisory-only; no payment, routing, or authorization is implied.
- If preview fails, the last successful result remains visible; errors surface via `simulationError`/`errorTimestamp`.
- UI must never branch on raw preview payload; it consumes only the mapped `AutopilotSimulationResult`.
- Autopilot uses the same solver path as `/api/scan`; no forked logic is permitted.
- Phase 3 (target): Autopilot commit must route through the shared confirm pipeline (same as `/api/sessions/confirm`); direct bucket/ledger writes in Autopilot code are forbidden. `(userId, decisionId)` is the canonical idempotency key across sessions, commits, and ledger entries originating from Autopilot.

## 4. Commit Path (Current vs Target Behavior)
The detailed target commit contract and confirm-pipeline integration are specified in §17.
- Current:
  - `/api/autopilot/commit` is optional/transitional; validates input via `AutopilotCommitInputSchema`, requires auth, and re-evaluates via `evaluateAutopilot` using the same engine flow as preview.
  - Enforces idempotency by recomputing a decision fingerprint (`decisionId`) from `{ userId, merchant, amountCents, occurredAt }` and comparing to the request.
  - Resolves category via `resolveScanCategory` for the simulated transaction.
  - Inside a single DB transaction:
    - If a `simulatedTransaction` with this `decisionId` already exists, returns `status: "already_exists"` and may refresh the bucket snapshot.
    - Otherwise, if the engine provided a `bucketDelta` and the bucket belongs to the user, it ensures freshness via `ensureBucketFresh`, computes `bucketBefore`/`bucketAfter` with `computeBucketBalance`/`computeBucketBalanceFromNumbers`, and when the delta is positive **updates the bucket** (`spentCents`, `currentAmount`) to reflect the simulated swipe.
    - Writes a `simulatedTransaction` row with `status: APPROVED`, amount, merchant, resolved category, bucket identifiers and before/after/limit cents, chosen card info, and reason `AUTOPILOT_COMMIT`.
  - Does **not** create `RecommendationSession` or `CherryPointLedger` rows today, but **does mutate bucket state** when a valid `bucketDelta` is present. This behavior is **transitional** and is **not** part of the Autopilot Phase 1 preview spec; any production use of commit must go through a dedicated Phase 3 spec.
- Target:
  - Keep commit optional and clearly labeled as advisory/simulated; no points awarded.
  - If linked to sessions/ledger in the future, define explicit mapping to `RecommendationSession` and `CherryPointLedger`, with guardrails to avoid double-counting and to respect advisory-only scope.
  - Align commit semantics with the advisory-only positioning and bucket/session semantics used by `/api/sessions` confirm flows, or deprecate Autopilot commit in favor of session-based confirmation. Until then, treat commit as experimental and not user-facing.

## 5. Autopilot Life-Cycle and State Machine
Current lifecycle (implemented): Idle (no summary) → Simulating (form submit triggers `runSimulation`/preview) → Recommended/Warning (adapter maps preview to `AutopilotSimulationResult`) → Optional Commit (simulated transaction write only, no sessions/ledger) or Ignore. Preview remains stateless regardless of commit.

Target lifecycle (Phase 3, see §17): Idle → Simulating → Recommended/Warning → Optional Commit (shared confirm pipeline creates/updates `RecommendationSession` + ledger, advisory-only, no payment rails) or Ignore. Preview stays stateless/read-only.

Relationship to `/api/scan`: `/api/scan` is the general-purpose pre-swipe advisor used by Pass/Vine/manual triggers and can seed sessions/ledger flows. `/api/autopilot/preview` is user-initiated, UI-driven, and stateless; it wraps the same solver for planning and must not mutate sessions, buckets, or ledger. Autopilot is a structured planning sandbox and does not replace `/api/scan`; both share the solver and category resolution. Commit (target in Phase 3) transitions into the shared confirm pipeline to create/update `RecommendationSession` and ledger rows while remaining advisory-only (no payment rails).

Verbal diagrams:
- Data flow: User → AutopilotShell (client state) → `runSimulation(summary)` → POST `/api/autopilot/preview` → `service.getAutopilotPreview` → solver (`safeSolveDecisionForUser`) → preview payload → adapter maps to `AutopilotSimulationResult` → UI renders purely from `AutopilotSimulationResult`.
- Lifecycle: Idle → Simulating → Recommended (safe) or Warning (caution/fallback/blocked) → (Optional) Commit (current: simulated transaction only; target: shared confirm pipeline/session+ledger) or Ignore.

## 6. Engine Contract for Autopilot
`lib/engine/public.getAutopilotDecisionForUserSwipe` requires: authenticated `userId`, normalized merchant name, positive `amountCents`, card universe IDs, and resolved category (via scan helper). It produces: decision kind (`OK`/`FALLBACK`/`BLOCKED`), recommended card ID (or null), expected monetary benefit vs runner-up, optional bucket delta (remaining/spent projections), reason code, and user-facing message. Internally it calls the solver (`safeSolveDecisionForUser`) using the standard objective weights (rewards, runway, debt relief, volatility, rule violations) and filters to card actions only.

## 7. Preview Backend Integration Contract (/api/autopilot/preview)
- Request (`/api/autopilot/preview`): JSON with `merchant` (string, trimmed, required), `amountCents` (positive int), optional `occurredAt`, **required** `category` (`AutopilotRewardCategory`). Auth required (`resolveUserContext`, allow lab demo). Stateless: no bucket writes. Parsed via `AutopilotPreviewInputSchema` in `lib/validation/autopilot/preview.ts`.
- Response: JSON validated by `AutopilotPreviewOutputSchema` (decisionId, merchant, amountCents, occurredAt, status `ok|blocked|fallback`, recommendedCard, expectedBenefitCents, explanation {primary, secondary[], warnings[]}, bucketImpact {id, name, remainingCents, spentCents} | null, reasonCode).  
- Status semantics: `ok` when engine returns a usable card; `blocked` when guardrails prevent safe recommendation; `fallback` when engine cannot produce a safe decision. Categories normalized via UI string → `AutopilotRewardCategory` → engine RewardCategory resolver; `occurredAt` defaults to “now” when absent.
- Data flow (verbal diagram): UI (`AutopilotShell` form) → adapter (`runSimulation`) → preview route (`/api/autopilot/preview`) → service (`lib/autopilot/service#getAutopilotPreview`) → engine entry (`getAutopilotDecisionForUserSwipe` → solver) → preview response → adapter maps to `AutopilotSimulationResult` → UI renders panel.
- Error shape: all non-200 responses from `/api/autopilot/preview` include `{ error, code }` (e.g., `INVALID_PAYLOAD`, `UNAUTHORIZED`, `ENGINE_ERROR`, `ENGINE_TIMEOUT`, `PREVIEW_UNEXPECTED_ERROR`).
- Timeout: engine evaluation is wrapped in a 1.5s timeout returning `503/ENGINE_TIMEOUT` on breach.
- Metrics: route/service emit counters for request totals (by HTTP and preview status), bucket pressure, warnings, invalid outputs, plus durations (`autopilot_preview_route_ms`, `autopilot_preview_total_ms`).

## 8. Adapter Contract (`runSimulation`)
`runSimulation(summary: AutopilotPurchaseSummary)` (client):
- Transforms `{ amount (dollars), merchant, category ("dining"|"groceries"|"travel"|"gas"|"other"), timing }` into preview payload `{ merchant, amountCents, occurredAt: now, category: AutopilotRewardCategory }`.
- Fetches `/api/autopilot/preview` with credentials; rejects on non-200 or invalid schema.
- Maps preview → `AutopilotSimulationResult`:
  - `state`: `recommended` only when status is `ok` and no warnings/budget exhaustion; else `warning`.
  - `cards`: primary from `recommendedCard`/primary message; secondary placeholder with neutral tone.
  - `rewardStrength`: bands from expectedBenefit/amount (1–4).
  - `impactSegments`: derived from bucketImpact used/remaining; always exactly 3 entries (padded if missing).
  - `impactNotes`: bucket remaining note + preview secondary + warnings.
  - Safety badges: green for recommended, amber for warning; CTAs are text-only.
  - Preserves advisory-only semantics; no writes.
- UI components consume only `AutopilotSimulationResult`; they must not embed logic.

AutopilotSimulationResult Field Contract Table:

| Field | Meaning | Source | Invariants | UI may assume | UI must not assume |
| --- | --- | --- | --- | --- | --- |
| `state` | Recommended vs warning posture | Adapter (preview status + warnings) | `"recommended"` or `"warning"` | Drives badge tone and risk banner | Payment/authorization implication |
| `cards[0]` | Primary recommendation card/name/message | Adapter (recommendedCard/explanation) | Exists when preview returns; labelTone matches state | It is the best available card | That it triggers payment or is guaranteed available |
| `cards[1]` | Alternate neutral option | Adapter (placeholder/secondary) | Optional; labelTone `neutral` | Secondary text only | Any business logic difference |
| `rewardStrength` | Benefit ratio band | Adapter (expectedBenefit/amount) | Integer 1–4 | More dots = stronger rewards | Exact cents or APR |
| `rewardStrengthLabel` | Text label for strength | Adapter | Non-empty string | Descriptive only | Numeric precision |
| `impactSegments` | Three budget segments (remaining/used/other) | Adapter (bucketImpact or fallback) | Length = 3; percentages clamp 0–100 | Bar render matches percentages | Exact bucket math beyond provided values |
| `impactNotes` | Bullet copy about budget/rewards | Adapter (bucketImpact + explanation) | Array, may be empty | Textual guidance only | That notes imply persistence |
| `monthImpactSummary` | One-line month impact | Adapter (remaining + benefit) | Non-empty | Display as-is | Hidden promises on buckets |
| `monthImpactTitle` | Section label | Adapter | Non-empty | Title only | Implied action |
| `monthImpact.riskNote` | Narrative warning/note about risk | Adapter (warnings) | String (may be empty) | Display as text | Any enforcement |
| `categoryLabel` / `timingLabel` | Human-friendly labels | Adapter (UI input) | Non-empty | Display only | Engine category precision |
| `recommendationSectionLabel` / `alternativeSectionLabel` | Section headers | Adapter | Non-empty | Display only | Additional logic |
| `safetyBadgeClass` / `safetyBadgeDotClass` / `safetyBadgeLabel` | Styling + label for safety | Adapter (state) | Non-empty, consistent with state | Visual indicator only | Approval/denial of spend |
| `ctaPrimary` / `ctaSecondary` | Text CTAs (no actions) | Adapter | Non-empty | Labels only; sandbox planning | That clicking performs payment or mutation |
| `riskBanner` | Warning banner | Adapter (first warning) | Optional string | Show when present | Severity beyond provided text |
| `errorTimestamp` | When an error occurred | Adapter (on error) | ISO string or undefined | Display as metadata | Any mutation timing |

## 9. UI Rendering Contract
- `AutopilotShell`: manages form state, calls `runSimulation`, passes data/errors/loading to panel.
- `AutopilotDecisionPanel`: renders four modes—idle (no purchase), loading (during fetch), error (shows simulationError, keeps last good result), recommendation (uses `AutopilotSimulationResult`). Uses rewardStrength dots, safety badges, CTAs as labels only.
- `AutopilotMonthImpactBar`: expects exactly 3 segments with labels/colors/percentages; falls back if shape is invalid.
- `AutopilotPurchaseForm`: captures amount/merchant/category/timing; no business logic.

## 10. Error Handling and Degradation
- Engine/preview failure or invalid response: `runSimulation` throws with `errorTimestamp`; UI surfaces `simulationError` and leaves last successful result visible.
- Network errors: same as above; no state mutation.
- Degraded engine decisions (`status = fallback/blocked`): map to `state = warning`, risk banner from first warning, and neutral/negative card labels.

## 11. Relationship to Existing Engine Surfaces
Currently, Autopilot uses the same solver as `/api/scan` and `/api/sessions` (`safeSolveDecisionForUser`), filtered to card actions. It is a dedicated lens, not a different solver profile. It does not persist sessions/ledger rows (unlike `/api/sessions`) and does not mutate buckets on preview (unlike confirm flows). `/api/autopilot/commit` is analogous to simulated transaction commit today; the target confirm-pipeline behavior is defined in §17.

## 12. Current vs Target Behavior
- Engine contract  
  - Current: Uses standard solver via `getAutopilotDecisionForUserSwipe`, card-only actions, benefit vs runner-up, optional bucket delta.  
  - Target: Same solver but add clearer reason codes and surface constraint tags in the preview response for richer UI messaging (still advisory).
- Preview route  
  - Current: Auth required, stateless, validates payload with Zod (`lib/validation/autopilot/preview.ts`), re-validates output in service + route, returns preview shape; status reflects solver outcome.  
  - Target: Add rate limits, richer telemetry/dashboarding, and explicit response versioning while keeping the route stateless.
- Adapter (`runSimulation`)  
  - Current: Fetches preview with credentials, validates schema, maps to `AutopilotSimulationResult`, pads segments, rewardStrength bands fixed.  
  - Target: Classify backend error codes in client state and optionally record client-side latency/error metrics while keeping the adapter contract stable and error shape unchanged.
- Commit (target): Follows the shared confirm pipeline defined in §17; aligns sessions/ledger with advisory-only semantics and forbids direct bucket math in Autopilot code.
- UI  
  - Current: Pure renderer; idle/loading/error/recommendation states; CTAs are informational.  
  - Target: Add explicit “advisory only” copy on CTAs and hook into future commit flow without adding logic to components.
- Lifecycle  
  - Current: No session/ledger link; commit writes simulated transactions only.  
  - Target: Optional handoff to sessions/ledger while respecting advisory boundaries and avoiding double counting.

## 13. Testing and Observability
- Required tests: unit test for `runSimulation` mapping (exists: `tests/autopilot-runSimulation.test.js`); backend preview tests for happy/error/auth paths (exists: `tests/api-autopilot-preview.test.js`, `tests/api-autopilot.user-context.test.ts`); reliability tests for error codes/timeouts (e.g., `tests/autopilot-service-timeout.test.js`). Tests should import schemas from `lib/validation/autopilot/preview.ts` to avoid divergence. Metrics expectations: preview call counts, error codes, distribution of `state`/`rewardStrength`, bucket-pressure incidence, and latency histograms.

## 14. Constraints and Guardrails
- Advisory-only: no payment rails, no card/proxy semantics, no bucket/session mutation on preview.
- Engine source of truth: `lib/engine/public.getAutopilotDecisionForUserSwipe` and solver; no forked logic in UI/adapter.
- UI purity: `AutopilotShell`, `AutopilotPurchaseForm`, `AutopilotDecisionPanel`, `AutopilotMonthImpactBar` must remain render-only; all mapping stays in the adapter or backend.
- Legal identity: obey `docs/cherry-vision.md` and `docs/legal-constraints.md` (copilot, not a card/terminal).

## 15. Known Gaps / Technical Debt
- Preview still lacks rate limiting and explicit response versioning; adapter/backend currently rely on the implicit v1 response contract.
- Commit migration to the shared confirm pipeline (see §17) is not implemented; current code still uses transitional bucket-mutating commit and lacks session/ledger linkage, creating double-counting risk until migration completes.
- Autopilot commit v2 is feature-flagged (`AUTOPILOT_COMMIT_V2`) and requires applying migration `20251206090000_autopilot_commit_v2` (adds `engineDecisionId`, `RecommendationSource.AUTOPILOT`, `AutopilotCommit`) before rollout.
- Reason codes/warnings are limited; richer constraint tagging from the solver would improve UI messaging without adding UI logic.
- Engine constraint tags are not surfaced to UI; warnings are coarse and not differentiated (safety vs soft advice).
- Preview/adapter ignore multi-action decisions (delay, reject, paydown) even though the solver can generate them; only card actions are surfaced.
- No contract yet for distinguishing “safety warnings” (guardrail-related) vs “soft advice” (preference/rewards nudges); UI treats all warnings uniformly.
- Temporary dual behavior may exist behind an `AUTOPILOT_COMMIT_V2`-style flag during migration; legacy commit behavior must be clearly marked and removed once Phase 3 rolls out.

## 16. Spec Enforcement Rules
- Any Autopilot-related PR must reference the spec section being updated; spec diffs must accompany behavior changes.
- Invariants in “Autopilot Invariants” and “AutopilotSimulationResult Field Contract” are mandatory; violating them is forbidden without prior spec update and explicit guardrail review.
- Future Autopilot behavior changes (backend, adapter, or UI) must first update this spec, then implement; no changes may bypass advisory-only/legal guardrails from `AGENTS.md`.

## 17. Phase 3 — Autopilot commit re-spec (target)
- Goal: Replace transitional `/api/autopilot/commit` bucket mutations with the unified confirm pipeline used by `/api/sessions/confirm`, keeping Autopilot advisory-only while recording user confirmation.
- Flow (target): UI confirms → `/api/autopilot/commit` re-evaluates via `evaluateAutopilot`, validates `decisionId`/`cardId`/`status=ok`, resolves category, finds or creates `RecommendationSession (source='AUTOPILOT', engineDecisionId=decisionId)`, invokes shared confirm pipeline (buckets + `CherryPointLedger`), persists an idempotent commit artifact linked to `decisionId`/`sessionId`, and returns `{ decisionId, sessionId, status: created|already_exists, bucket? }`.
- Errors: `{ error, code }` parity with preview plus commit-specific codes (`DECISION_MISMATCH`, `DECISION_BLOCKED`, `CARD_MISMATCH`, `COMMIT_INVARIANT_VIOLATION`), honoring `ENGINE_TIMEOUT`/`ENGINE_ERROR`.
- Invariants: no direct bucket math in Autopilot commit; all bucket/ledger effects flow through the shared confirm service; `(userId, decisionId)` governs idempotency across sessions/ledger/artifacts; advisory-only (no payment rails).
- Migration: add/align confirm service if needed; refactor `commitAutopilotDecision` to reuse it; add `RecommendationSession.source = 'AUTOPILOT'` if missing; feature-flag rollout (`AUTOPILOT_COMMIT_V2`), backfill/mark legacy `simulatedTransaction` rows, and remove V1 paths after rollout.

## Future/Target behavior (explicitly speculative)
- Full Phase 3 commit integration with shared confirm pipeline and session/ledger alignment.

## Related docs
- `docs/autopilot-engine-adapter.md`
- `docs/autopilot-integration-summary.md`
- `docs/legal-constraints.md`

<!-- docs/bank-ingest-notes.md -->
Status: Draft
Last updated: 2026-01-03

# Bank ingest notes

Quick capture of how `BankTransaction` is read today and what an ingest pipeline must populate to keep history/statements working.

## Current behavior (enforced / in code)
- Bank ingest is dev-only today; `/api/dev/bank/ingest` and CSV ingest populate `BankTransaction` rows.
- Unified activity reads bank rows alongside simulations and ledger events; no bucket or ledger mutation occurs during ingest.

## What reads BankTransaction
- `lib/unified-activity.ts` pulls `prisma.bankTransaction` rows (optionally period-filtered) and maps:
  - `amount` (Decimal) → cents, signed by `direction` (`CREDIT` positive, otherwise negative).
  - `currency`, `occurredAt`, `merchantName`, `mcc`.
  - `cardBrand`, `cardLast4`.
  - `merchantCity/Region/Country` (or from linked `merchantObservation`) for location.
  - `statementPeriod` derived from `occurredAt`.
- `app/(user)/history/page.tsx` and `app/(dev)/dev/statements/page.tsx` consume the unified activity feed; real spend rows come from `BankTransaction`, while simulations/ledger rows are shown separately.

## Schema fields that matter (prisma/schema.prisma)
- `BankTransaction`:
  - Identity and scoping: `id` (cuid), `externalId` (idempotency key, unique per `userId`), `userId` (FK to User), `source` (e.g., `plaid`, `teller`, `dev_simulator`, `csv_dev`), `accountId` (string; provider account identifier), `accountLast4?`.
  - Merchant context: `merchantName`, `description/rawDescription`, `merchantCity`, `merchantRegion`, `merchantCountry`, `mcc`, `merchantObservationId?`.
  - Card-ish metadata: `cardBrand?`, `cardLast4?`.
  - Money fields: `amount` (Decimal, provider-native units), `amountMinor?` (integer cents, signed by direction), `currency` (string), `direction` (`CREDIT` treated as positive in unified feed), `transactionType?`, `section?`, `isRecurring?`.
  - Classification hints: `incomeKind` (PAYROLL/ALLOWANCE/SIDE_GIG/REFUND/INTERNAL_TRANSFER/OTHER/NONE) and `p2pKind` (P2P_ALLOWANCE/REPAYMENT/PSEUDO_MERCHANT/ NONE) are set by the dev-only classifier for offline evaluator regimes.
  - Timestamps: `occurredAt` (required), `postedAt?`, plus `createdAt`/`updatedAt` defaults.
  - Statement metadata: `sourceStatement?`, `statementStart?`, `statementEnd?`.
  - Raw payload: `raw` (Json?; should include source and raw lines when present).

## Where fake/simulated data comes from
- `SimulatedTransaction` (populated by `/api/simulate` and seeds) feeds the unified activity as `SIMULATED_TRANSACTION`.
- `CherryPointLedger` rows show as `POINTS_EVENT` with inferred cash deltas.
- No production bank ingest exists yet; only dev and CSV-based ingest paths populate `BankTransaction`. `app/bank-simulator` exposes pending sessions and manual verify/reject for points, but does not create `BankTransaction` rows.
- Offline evaluator: `HistoricalEngineEvaluation` stores engine advice for historical `BankTransaction` rows (e.g., `csv_dev` SafeBalance ingest) and is populated by `lib/evaluator/offline-history.ts` via `npm run dev:evaluator:moustafa`. It is read-only and does not create sessions/ledger rows.

## Implications for ingest
- Ingest must upsert `BankTransaction` rows (idempotent by provider transaction id).
- Ingest must never trigger authority, Autopilot, scan, session creation, or engine evaluation; it is strictly a historical data write.
- `direction` and `amount` must be consistent: unified feed assumes `direction === 'CREDIT'` means positive cash delta; otherwise debit.
- Location/merchant info should populate `merchant*` fields and optionally link/create `MerchantObservation` for reuse across ledger/points.
- Do not touch buckets or ledgers during ingest; verification/points stay separate.

## Idempotency & internal IDs
- `BankTransaction.id` is internal only (`cuid`) and never set from provider/CSV data.
- Idempotency is enforced on `(userId, externalId)`:
- Schema: `@@unique([userId, externalId], name: "BankTransaction_userId_externalId")`
  - Code: all ingest paths use `where: { userId_externalId: { userId, externalId } }`.
- Ingest flows must normalize into `NormalizedBankTransactionInput` and call `upsertBankTransactions`; avoid direct `create`/`update` to prevent collisions.
- `externalId` must be stable per provider (e.g., provider transaction id or deterministic hash of date/amount/raw description for CSV).
- Dev ingest/evaluator identity: `BANK_INGEST_USER_EMAIL`/`BANK_INGEST_USER_ID` picks the ingest user; evaluator scripts and `/dev/evaluator` must use the same user to render results.

## Dev CSV provider guardrails (moustafa SafeBalance import)
- Dataset lives at `data/bank/moustafa-adv-safebalance-2061.csv`; parser in `lib/bank/csv-dev-provider.ts` keeps the source shape as-is (no business logic).
- Script `npm run dev:ingest:moustafa-bank` (uses lab or provided user) normalizes rows and upserts `BankTransaction` with `source = "csv_dev"` and unique `externalId` hash; reruns are idempotent.
- `upsertBankTransactions` explicitly skips `csv_dev` rows in production to keep the CSV provider dev-only.
- Unified activity treats `csv_dev` rows like other bank rows; merchant fallback uses `description` when merchant name is absent.
- After ingest, run the dev classifier + regime builder (via `npm run dev:evaluator:moustafa`) to populate `incomeKind`/`p2pKind`, `HistoricalIncomeRegime`, and `HistoricalBucketTemplate` for offline evaluator metrics. These writes stay in dev tables and do not touch live Buckets or Ledger rows.

## Future/Target behavior (explicitly speculative)
- Production ingest provider support (Plaid/Teller/etc.) with stable `externalId` values and a verification pipeline.
- Automated verification signals that post ledger rows after ingest reconciliation.

## Related docs
- `docs/offline-evaluator.md`
- `docs/verification-flow.md`
- `docs/legal-constraints.md`

<!-- docs/buckets-rollover-plan.md -->
Status: Active
Last updated: 2026-01-03

# Bucket Rollover & Spend Semantics

This doc explains how bucket periods and spend tracking work today, what gaps remain, and what future behavior should look like. See `docs/legal-constraints.md` and `docs/cherry-vision.md` for broader guardrails.

## Current behavior (enforced / in code)

## Current Schema (prisma/schema.prisma)
- Model: `Bucket`
  - `id`, `userId`, `name`
  - `period` (`BucketPeriod`: `WEEKLY` | `MONTHLY`)
  - `budgetAmount` (int, cents; canonical limit)
  - `currentAmount` (int, cents; legacy mirror of remaining on writes only)
  - `spentCents` (int, default 0; posted/settled spend this period)
  - `strictMode` (boolean, default true)
  - `category` (`RewardCategory`)
  - `periodStart`, `periodEnd` (DateTime, defaults `now()`)
  - `lastResetAt` (DateTime?)
  - timestamps: `createdAt`, `updatedAt`
  - Runtime/derived (not stored): `pendingSpendCents` (0 today), `committedCents = spentCents + pendingSpendCents`, `remainingCents = max(0, budgetAmount - committedCents)` via `lib/buckets-runtime.ts`.

## Current Behavior (code reality)
- Canonical balance math lives in `lib/buckets-runtime.ts` (`computeBucketBalanceFromNumbers`/`toBucketRuntime`). All surfaces (engine, seeds/admin, `/api/buckets`) rely on it; no ad hoc remaining calculations.

- **Creation (`POST /api/buckets`)**
  - Computes weekly window (Monday 00:00 → next Monday 00:00) or monthly (first of month → first of next month) via `getPeriodWindow`.
  - Uses `computeBucketBalanceFromNumbers` (pending=0) to derive `spentCents`/`committedCents`/`remainingCents`; writes `currentAmount` as the derived remaining for legacy consumers. Stores `periodStart`/`periodEnd`, `strictMode`, `category`.

- **Rollover helpers**
  - `lib/buckets/periods.ts#applyInMemoryRollover` advances `periodStart`/`periodEnd` forward until `periodEnd > now`, resets `spentCents` to `0` (and `currentAmount` to `budgetAmount`), and marks `isExpired` when rollover happened. Multi-period gaps are covered by looping windows.
  - `lib/buckets/ensure-fresh.ts` fetches a bucket, applies the in-memory rollover, recomputes balances via `computeBucketBalanceFromNumbers`, and persists `periodStart`/`periodEnd`/`spentCents`/`currentAmount`/`lastResetAt` when they changed.

- **Engine usage (`lib/engine.ts`)**
  - Loads buckets for the category, runs them through `applyInMemoryRollover`, normalizes via `toBucketRuntime`, and bases budget verdicts/guardrails on `remainingCents` (not raw `limitCents`).
  - Chooses the earliest-created bucket for the category (first in list).
  - Verdicts: `BORDERLINE` when <10% remains; `BREAKS_BUDGET` when spend would exceed `budgetAmount`; respects `strictMode` flag in outputs.

- **Spend mutation (`POST /api/sessions/[id]/confirm`)**
  - Ensures the recommended bucket is fresh via `ensureBucketFresh` before updates.
  - Increments `spentCents` by the claimed amount (or recommended amount when `actualAmountCents` is absent). Happens once per session because status checks block double-claims.
  - Reversal on verification failure is handled in `verifySessionFromSignal` when a session is rejected.
  - Cadence today: bucket spend only changes on session confirm (and optional reversal on verify-reject); bank ingest, scans, and simulations do not mutate bucket balances.

- **Other paths**
  - `/api/scan`, `/api/sessions`, `/api/vine/order`, `/api/simulate` do **not** mutate buckets.
  - `/api/autopilot/commit` may mutate buckets when the engine provides a bucket delta (simulated commit flow).
  - Engine in-memory rollover means verdicts stay time-accurate even if the DB has not been refreshed yet; persistence happens on confirm via `ensureBucketFresh`.

### Example balance
- limit = $100 (`budgetAmount = 10_000`)
- posted spend = $75 (`spentCents = 7_500`), pending = 0
- committed = $75
- remaining = $25 (`remainingCents = 2_500`, `currentAmount` mirrors this on write)
- A $50 attempt is over budget because $50 > $25 remaining even though $50 < $100 total limit.

### Hard invariant
- Buckets are mutated only by:
  - `/api/sessions/[id]/confirm`
  - verification reversal logic
  - `/api/autopilot/commit` (transitional, simulated only)
- Bank ingest, scans, simulations, preview APIs, and authority must never mutate buckets.

## Gaps / Inconsistencies
- Bucket selection is naive (first created for a category) and ignores multiple buckets for the same category.
- No background job to pre-roll buckets; freshness relies on engine reads and confirm-time `ensureBucketFresh`.
- `lastResetAt` is only set when rollover occurs via `ensureBucketFresh`; initial creation leaves it null. This intentionally records only true period rollovers (not creation or spend) so it can detect elapsed budget windows and multi-period gaps.
- Cadence is confirm-only: there is no per-transaction bucket ledger, no per-purchase balance updates, and no daily reconciliation sweep; Autopilot can operate on stale spend if ingests lag.

### Verification rejection semantics
- Current behavior: when a session is confirmed, `Bucket.spentCents` increments by the confirmed amount (`confirmedAmountCents` on `RecommendationSession`). On `verify(verified: true)`, the increment remains. On `verify(verified: false)`, if the session was confirmed and not yet reversed, the bucket spend is decremented by `confirmedAmountCents` (bounded at 0) and `bucketSpendReversed` is set on the session to avoid double reversal. Reversal uses `ensureBucketFresh` so the active period window is respected.

### Legacy fields and soft flags
- `Bucket.currentAmount` exists only as a legacy mirror of derived remaining; compute balances via `lib/buckets-runtime.ts` instead of reading it.
- `CategoryPreference.category` is now a `RewardCategory` enum; no arbitrary strings are allowed (legacy string field has been migrated).

### Accounting model invariant
- Buckets are a derived, period-scoped cache of spend, not a source of truth.
- The authoritative record of spend is (today) sessions and (future) a bucket ledger.
- Direct edits to `spentCents` outside controlled mutation paths are forbidden.

## Future/Target behavior
- Keep `lib/buckets-runtime.ts` as the single source of truth for committed/remaining math; avoid adding alternative “remaining” fields.
- Consider deriving bucket selection rules (e.g., prioritize strict buckets) and document them.
- Add optional reversal or adjustment when verification fails, or mark rejected sessions for audit before reversing spend.
- Add periodic freshness sweeps or on-read hooks for other bucket consumers if more surfaces start relying on bucket windows.
- Expand tests around weekly/monthly rollover, gap handling, and strict-mode overspend enforcement.
- Cadence (v1 spec):
  - Balances: update per purchase/authorization and again on posting or reclassification. Each transaction writes an immutable bucket ledger row `(tx_id, bucket_id, amount, period_id)`; settlement edits adjust the ledger entry and recompute `spentCents`, `remainingCents`, and `percent_used`.
  - Targets/allocations: recompute on pay-period boundaries or when income events/plan edits happen (monthly/biweekly or explicit paycheck); persist `bucket_target_amount` per `(bucket_id, period_id)`. No daily recompute needed.
  - Engine policy: per swipe, pull the freshest bucket balance, compute `remaining = target - spent`, and route accordingly (`remaining <= 0` → warn/avoid; soft threshold → nudge; else optimize rewards). If data is stale (e.g., last ingest > 12h), fall back to the safe default card and log “data stale.”
  - Reconciliation: run daily to re-sync feeds, ensure all transactions are bucketed, recompute derived metrics, and verify invariants (`sum(bucket_spent) ≈ total_spend`, period boundaries intact). If reconciliation fails, mark Autopilot as degraded until corrected.
- Cadence stance: weekly-only updates are insufficient; balances must be event-driven, with daily sweeps for safety and pay-period recomputes for targets.

## Related docs
- `docs/legal-constraints.md`
- `docs/api.md`

<!-- docs/cherry-core-loop-engine-vine-wallet-audit.md -->
Status: Active
Last updated: 2026-01-03

# Cherry Core Loop / Engine / Vine / Wallet Pass Audit (Verified)

Cross-links: see `docs/cherry-vision.md`, `docs/legal-constraints.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, `docs/api.md`, and `docs/buckets-rollover-plan.md` for identity, legal, Vine, wallet, API, and bucket details.

This is the canonical, implementation-ready audit of Cherry’s Observe → Evaluate → Recommend → Reward loop, aligned with `docs/legal-constraints.md` and `docs/cherry-vision.md`.

## 0. Scope and Sources
Audited areas: advisory scan, sessions/ledger, buckets/engine, Vine ingest, Wallet Pass scaffold.

Code inspected:
- Prisma schema: `prisma/schema.prisma` (Bucket, RecommendationSession, CherryPointLedger, Card/RewardRule, etc.).
- Engine and helpers: `lib/engine.ts`, `lib/engine-invariants.ts`, `lib/scan-helpers.ts`, `lib/buckets/periods.ts`, `lib/buckets/ensure-fresh.ts`, `lib/buckets-runtime.ts`.
- Sessions/ledger APIs: `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/sessions/[id]/confirm/route.ts`, `app/api/sessions/[id]/verify/route.ts`, `lib/verification/verify-session.ts`.
- Advisory scan API: `app/api/scan/route.ts`, `lib/schemas/scan.ts`.
- Vine ingest: `app/api/vine/order/route.ts`, `lib/vine/order-context.ts`, `lib/vine/run-recommendation.ts`, `lib/schemas/vine.ts`, `lib/schemas/vine-terminal.ts`.
- Wallet pass: `app/api/wallet/cherry-pass/route.ts`, `lib/wallet/config.ts`, `lib/wallet/cherryPass.ts`.
- Auth helpers: `lib/auth.ts`, `lib/with-user.ts`, `app/api/auth/[...nextauth]/route.ts`.
- Legacy simulation engine: `lib/simulation.ts` (archived; not used by core routes).
- Tests: `tests/*.test.js`.

Docs consulted:
- `docs/legal-constraints.md`, `docs/cherry-vision.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, `docs/api.md`, `docs/buckets-rollover-plan.md`, `docs/system-overview.md`, `docs/repo-structure.md`, `AGENTS.md`, `.github/copilot-instructions.md`.

## 1. Current behavior (verified)
- Bank ingest (new):
  - Dev-only endpoint `app/api/dev/bank/ingest/route.ts` validates `RawBankTransaction` payloads (`lib/schemas/bank-ingest.ts`) and upserts `BankTransaction` rows idempotently via `lib/bank/ingest.ts`, linking optional `MerchantObservation`.
  - Unified activity and statements surface these rows; admin console includes a “Bank ingest debug” panel to paste payloads and dump recent rows.
- Verification (wired):
  - `lib/verification/verify-session.ts` implements `verifySessionFromSignal` with amount/time/merchant matching and bucket reversal on rejection; invoked by `/api/sessions/[id]/verify` and `/api/dev/verification/trigger`.
  - `docs/verification-flow.md` documents signal shape; auto-trigger from ingest is still a follow-up (signals can be queued).
- Advisory scan (`POST /api/scan`, `app/api/scan/route.ts`):
  - Resolves user context (`resolveUserContext`, `requireAuth: false`, `allowLabDemo: true`); parses `ScanRequestSchema` (`lib/schemas/scan.ts`, non-negative `expectedAmountCents`).
  - Category resolution uses `resolveScanCategory` (`lib/scan-helpers.ts`) with precedence: explicit → MCC map → last simulated merchant category → heuristics → `OTHER`.
  - `amountCents` defaults to 0 if missing/invalid; `runEngine` accepts 0 (guards only `amountCents < 0` in `lib/engine.ts`); incentives become 0 for amount <= 0.
  - No sessions/ledger writes; logs a `DecisionEvent` when authority returns `ok: true`.

- Authority invariant:
  - `authority_v1` is advisory and telemetry-only; it never mutates buckets, sessions, ledger rows, or user state.
  - Any future authority version that affects state requires a version bump plus explicit legal/spec review.

- Engine (`lib/engine.ts`, `lib/engine-invariants.ts`):
  - Resolves category (MCC → explicit → heuristics).
  - Fetches buckets for the category; applies `applyInMemoryRollover` (`lib/buckets/periods.ts`) to advance weekly/monthly windows, normalizes via `toBucketRuntime` (`lib/buckets-runtime.ts`) to attach `committedCents`/`remainingCents`, and picks the earliest-created bucket.
  - Budget verdicts/guardrails computed from `remainingCents` (not raw `limitCents`); strictness flagged but no decline logic here.
  - Card selection chooses best multiplier rule per category (fallback GENERAL_MERCHANDISE/OTHER) and estimates rewards; if no cards, verdict `NO_CARD_DATA`.
  - Incentives: base `min(floor(amount/1000), 20)`, doubled for `HEALTHY`, zeroed for `BREAKS_BUDGET`; zero if `amountCents <= 0`.
  - Invariants enforce consistency (no incentives with `INSUFFICIENT_DATA` or `NO_CARD_DATA`, coverage mode matches bucket presence, etc.).

- Buckets (`prisma/schema.prisma`, `app/api/buckets/route.ts`, `lib/buckets/*`, `lib/buckets-runtime.ts`):
  - Schema fields: `budgetAmount` (limit), `spentCents` (posted), `currentAmount` (legacy mirror), `strictMode`, `periodStart/periodEnd`, `lastResetAt`.
  - Canonical math: `computeBucketBalanceFromNumbers` (pending=0 today) → `committedCents` and `remainingCents` (clamped at 0); `currentAmount` is written as the derived remaining for legacy consumers.
  - Creation sets weekly window (Monday 00:00) or monthly (1st → next 1st), derives balances via `computeBucketBalanceFromNumbers`, and persists `budgetAmount`/`spentCents`/`currentAmount`.
  - `ensureBucketFresh` applies in-memory rollover, recomputes balances, and persists updated `periodStart`/`periodEnd`/`spentCents`/`currentAmount`/`lastResetAt` when stale.
  - Reversal of `spentCents` on verification rejection is handled by `verifySessionFromSignal`. Reversal is idempotent and guarded (`bucketSpendReversed`), bounded at zero, and always applies after `ensureBucketFresh` to respect active period windows.

- Sessions & ledger:
  - Creation (`POST /api/sessions`, `app/api/sessions/route.ts`):
    - Auth via `withUser`, validates `CreateSessionSchema` (`lib/schemas/sessions.ts`, `amountCents` strictly positive).
    - Runs `runEngine`; stores `RecommendationSession` with `source` default `APP_SCAN`, `orderToken` UUID, expiry ~15 minutes, verdicts, coverageMode, cherryPointsOffered.
  - Fetch by id (`GET /api/sessions/[id]`): returns full session plus `pointsPending`/`pointsPosted` computed from ledger rows; marks `isExpired` if `expiresAt` <= now.
  - Confirm (`POST /api/sessions/[id]/confirm`, `app/api/sessions/[id]/confirm/route.ts`):
    - Blocks missing/expired/claimed/verified/rejected sessions.
    - Anomalies: amount ratio outside 0.85–1.15 → `AMOUNT_MISMATCH`; claim older than 24h → `TIME_WINDOW_VIOLATION`; card mismatch → `CARD_MISMATCH`.
    - Freshens bucket via `ensureBucketFresh` and increments `spentCents` by claimed/recommended amount once per session.
    - Writes `CherryPointLedger` row(s) with `status = PENDING`, anomaly mirrored to ledger code `SESSION_ANOMALOUS`.
    - Calls `autoVerifySession` (stub returns null).
  - Verify (`POST /api/sessions/[id]/verify`, `app/api/sessions/[id]/verify/route.ts`):
    - Delegates to `verifySessionFromSignal` (amount/time/merchant match with override), sets `status` and `verificationStatus`, and updates ledger PENDING → POSTED/REVOKED with anomaly propagation.
    - Bucket reversal now handled when rejecting sessions that previously incremented `spentCents`.
  - Ledger model: `CherryPointLedger.status` default `PENDING` in schema; anomaly flags stored separately; linked to `sessionId`, `cardId`, `merchantObservationId`.

- Vine ingest (`app/api/vine/order/route.ts`):
  - Auth via `withUser`; reads request body once.
  - Accepts either terminal-event form (`lib/schemas/vine-terminal.ts`) or `OrderContext` form (`lib/schemas/vine.ts`); MCC optional but validated by `isValidMcc` when present.
  - Rejects stale payloads older than ~3 minutes (`ageMs > maxAgeMs`).
  - Maps to `OrderContext` (`lib/vine/order-context.ts`), runs solver via `safeSolveDecisionForWorld` inside `runRecommendationFromOrderContext` (a thin wrapper around `safeSolveDecisionForUser` with a World-injected runtime) and maps to legacy shape, then creates `RecommendationSession` with `source` set to `VINE_SIM` or `VINE_DEVICE`, `orderToken` from nonce or UUID, expiry ~15 minutes.
  - Runs `simulateSpendAuthority` and logs `DecisionEvent` telemetry when authority returns `ok: true`.
  - Returns `{ sessionId, decision, orderToken, authority }`. HMAC/nonce auth is TODO.

- Wallet Pass (`app/api/wallet/cherry-pass/route.ts`):
  - Auth via `withUser`. Uses `getWalletPassConfigStatus` (`lib/wallet/config.ts`): requires `CHERRY_WALLET_PASS_ENABLED=true` and Apple Wallet env vars (team ID, pass type ID, org name, description, cert password/path, WWDR path).
  - If misconfigured/disabled: returns `501` JSON `{ error: "wallet_pass_not_configured", reason, message }`.
  - When configured: generates `storeCard` pass via `generateCherryPass` (`lib/wallet/cherryPass.ts`); placeholders for points; never a payment pass.

- Auth stack:
  - NextAuth (PrismaAdapter) with Email, Google, and dev Credentials (non-prod) in `app/api/auth/[...nextauth]/route.ts`.
  - `withUser` (`lib/with-user.ts`) pulls `getServerSession` userId; returns 401 otherwise.

- Tests:
  - Engine invariants, wallet-pass config, bucket periods, engine bucket remaining vs total limit, vine order mapping, and client API smoke tests in `tests/*.test.js`; all passing as of this audit.

### State hierarchy (mental model)
- Authoritative events: `RecommendationSession`, `CherryPointLedger`.
- Derived state: `Bucket` (period-scoped cache).
- Advisory signals: authority decisions, scan results.
- Engine: pure evaluation over current derived + authoritative state.

## 2. Gaps vs Vision / Legal Constraints
- Verification is still manual/explicit: signals are processed, but ingest does not auto-queue verification; production flow needs webhook-driven or worker-triggered signals.
- Bank ingest is dev-only: no provider auth/signature validation, and user mapping is limited to email/providerAccountId.
- Vine security is minimal: signature enforcement remains optional/off by default; nonce cleanup and device lifecycle are missing.
- Legacy/duplicate engine logic in `lib/simulation.ts` (archived) still exists; while balance math now reuses canonical helper, the separate category resolver risks drift if revived.
- Wallet pass generation still reads certs when fully enabled; acceptable, but ensure feature flag stays off by default to avoid accidental filesystem access. Currently compliant.
- Bucket cadence is confirm-only with one exception: `/api/autopilot/commit` may apply bucket deltas for simulated commits. There is no per-transaction ledger, no per-swipe balance update, no stale-data fallback, and no daily reconciliation sweep. Autopilot can therefore operate on stale budgets.

## 3. Risks and Impact (Ranked)
- High — Verification path needs automation:
  - Impact: ledger posting relies on manual API calls; without webhook/worker wiring, PENDING rows can linger. Evidence: `verifySessionFromSignal` exists, but nothing enqueues signals from ingest yet.
- Medium — Vine lacks enforced auth:
  - Impact: spoofed Vine events could create sessions with misleading recommendations. Evidence: `app/api/vine/order/route.ts` signature mode defaults to off; no device lifecycle/nonce cleanup.
- Medium — Legacy simulation engine drift:
  - Impact: future contributors might reuse `lib/simulation.ts` and diverge from canonical engine (rollover/incentive rules) even though balances now use the shared helper. Evidence: separate `resolveCategory`/card logic in `lib/simulation.ts` not used by main APIs.

## 4. Concrete Fixes / Migrations
- Verification automation:
  - Enqueue verification signals from ingest (bank/Vine/receipts) and drain via worker calling `verifySessionFromSignal`. Add metrics on pending vs posted/revoked.
- Vine hardening:
  - Add HMAC/nonce verification and device registry table; validate signatures in `app/api/vine/order/route.ts` before running the engine. Update `docs/cherry-vine.md` and `docs/api.md` with signature format and failure modes.
  - Add cleanup (cron/script) to mark expired Vine-created `RecommendationSession` rows as `EXPIRED` and invalidate tokens.
- Engine/Simulation consolidation:
  - Keep `lib/simulation.ts` marked legacy or refactor any future callers to use `safeSolveDecisionForUser`; ensure any remaining uses either import the canonical engine or are archived.
- Schema/ingest hygiene:
  - Consider adding provider IDs/unique constraints to `BankTransaction` instead of overloading `id`, and wire webhook auth; keep ingest idempotent and auditable.
  - Keep `currentAmount` documented as legacy-only; rely on `lib/buckets-runtime.ts` for derived balances and avoid surfacing `currentAmount` in UI math.
- Bucket cadence:
  - Add a bucket ledger keyed by `(tx_id, bucket_id, period_id)`; update balances on every authorization/posting or reclassification.
  - Recompute targets on pay-period start/paycheck/plan edits; keep engine decisions per swipe and add a stale-data fallback (safe default card + log).
  - Run a daily reconciliation sweep to re-sync feeds, recompute spent/remaining/derived metrics, and mark Autopilot degraded on failure.

## 5. Short-Term Plan (Implementation Checklist)
1) Verification automation:
   - Queue verification signals from ingest (bank/Vine/receipts) and drain via worker calling `verifySessionFromSignal`; add metrics on pending vs posted/revoked.
2) Bank ingest hardening:
   - Add provider auth/signature and webhook handler; expand user mapping beyond email/providerAccountId; convert dev endpoint into an authenticated provider entrypoint.
3) Vine security + cleanup:
   - Enforce signature mode by default, add device lifecycle/nonce cleanup, and document failure modes in `docs/cherry-vine.md`/`docs/api.md`.
4) Observability/rate limits:
   - Instrument engine/sessions/ingest/verification paths with structured logs + basic rate limiting on public APIs.

## Future/Target behavior (explicitly speculative)
- Automated verification signals from real bank/receipt sources with worker-backed posting.
- Signed Vine payloads with enforced device lifecycle.
- Bucket ledger for per-transaction reconciliation.
- Expanded observability and rate limiting across public APIs.

## Related docs
- `docs/cherry-vision.md`
- `docs/legal-constraints.md`
- `docs/api.md`

<!-- docs/cherry-vine.md -->
Status: Active
Last updated: 2026-01-03

# Cherry Vine Design Document

*Reference architecture for the Cherry in-store hardware node*

Vine is context-only hardware, never a payment terminal. See `docs/legal-constraints.md` for the hard guardrails.

Current code hooks (dev-only) and caveats:
- Backend ingest: `app/api/vine/order/route.ts` accepts Vine terminal events or `OrderContext` and creates a `RecommendationSession` via `lib/vine/run-recommendation.ts`.
- Types: `lib/vine/order-context.ts`, `lib/schemas/vine.ts`, `lib/schemas/vine-terminal.ts`.
- Dev UI: `/vine-simulator` (App Router page) posts to `/api/vine/order` and shows decision/orderToken.
- Engine: `lib/engine.ts` computes verdicts; results persist to `RecommendationSession` and Cherry Points ledger when confirmed.
- MCC is optional but validated when provided; freshness window (~3 minutes) is enforced. HMAC/nonce auth is **TODO** (see `lib/vine/security.ts`).

All firmware and future device work must match this document and **never** touch card rails.

---

## Current behavior (dev-only, enforced / in code)
- Endpoint: `POST /api/vine/order` guarded by `withUser`.
- Accepted payloads:
  - **Terminal event form** (`lib/schemas/vine-terminal.ts`): amount (number), optional currency, merchant block (name/storeId/MCC), terminal block (terminalId), vine block with source/sessionId.
  - **OrderContext form** (`lib/schemas/vine.ts`): deviceId, amountCents (positive integer), timestamp (epoch ms), optional merchant/store/terminal/order IDs, optional MCC, optional nonce, `source` defaults to `VINE_SIM`.
- Behavior:
  - Validates payload; rejects stale timestamps (`> ~3 minutes` old).
  - MCC is optional; when present it must pass `isValidMcc`.
  - Maps payload to `OrderContext`, calls `runRecommendationFromOrderContext` → `safeSolveDecisionForWorld` (world-context wrapper around the user solver), and persists a `RecommendationSession` with `source = VINE_SIM` or `VINE_DEVICE`, `orderToken` (nonce or UUID), expiry ~15 minutes.
  - Runs `simulateSpendAuthority` and records a `DecisionEvent` when authority returns `ok: true`.
  - Returns `{ sessionId, decision, orderToken, authority }` to the simulator/client.
- Not implemented yet (explicit TODOs):
  - HMAC/nonce verification and device secrets.
  - Order token cleanup/expiry sweeps.
  - Hardware/firmware transport; today is backend-only for simulation.

- Safety assertions:
  - Vine does **not** read cards or act as a terminal.
  - Vine payloads contain only merchant/order context (merchant ID/name, amount, timestamp, optional MCC/store/terminal/order IDs).
  - No EMV/ISO8583 or payment-rail protocols are emitted or consumed.

### Core invariant
- Vine may only observe and broadcast context.
- It must never:
  - imply approval, authorization, or reservation of funds
  - signal success/failure of a payment
  - block, delay, or gate a POS transaction

### State boundaries
- Vine holds only ephemeral, local state (`currentOrder`).
- All durable state (sessions, buckets, ledger, authority events) lives exclusively in the Cherry backend.
- Vine reboot or failure must never affect correctness of user balances, rewards, or ledger state.

## 0. Purpose of this Document

This document describes **Cherry Vine** end to end:

* what it is
* what it must and must not do
* how it fits into Cherry’s product identity
* its **hardware**, **firmware**, **protocols**, **security**, and **merchant workflows**

You can treat this as a blueprint for a future implementation.
Nothing here assumes you already know embedded.

---

## 1. What Cherry Vine Is

**Cherry Vine** is:

> A tiny, on-counter hardware node that listens to the store’s POS/order system for `merchant + amount (+ optional metadata)` and broadcasts that context to nearby phones via BLE/NFC so Cherry can run *Observe → Evaluate → Recommend → Reward* in real time, **without ever touching payment rails**.

Key points:

* It is **not** a card reader.
* It is **not** a payment terminal.
* It never sees PAN, CVV, track2, EMV fields, or network messages.
* It only deals in **order metadata**:

  * `merchantId`, `terminalId`, `orderId`
  * `amountCents`, `currency`
  * `timestamp`, optional flags

Think of it as a **context router**, not a money router.

---

## 2. Goals and Non-Goals

### 2.1. Goals

Cherry Vine should:

1. **Inject context into the Cherry loop** at the exact moment the order total is known.
2. **Work with many POS environments**, from modern APIs to old printer-port systems.
3. **Expose a single, normalized payload format** to the phone (BLE/NFC), regardless of how the data arrived.
4. **Be legally boring**:

   * no payment functions
   * no PCI scope
   * no cardholder data
5. **Be operationally simple**:

   * plug in device
   * connect to WiFi
   * associate with store
   * it works

### 2.2. Non-Goals

Cherry Vine should **not**:

* act as a **payment terminal**
* accept card taps, swipes, chips, PINs
* speak EMV, ISO8583, or scheme protocols
* run complex business logic beyond:

  * ingest → normalize → broadcast

All higher-level behavior (bucket logic, recommendations, rewards, analytics) stays in the **Cherry backend + app**, not on the device.

---

## 3. High-Level Architecture

At a high level, Cherry Vine has three layers:

1. **Ingress (from POS world)**
   Multiple possible sources:

   * local POS API/WebSocket
   * POS middleware
   * cloud push
   * printer stream/ESC/POS tap
   * manual tool/test mode

2. **Normalization & State**

   * unify all incoming events into a single `OrderContext` structure
   * track “current/last order” per terminal
   * handle dedup and expiry

3. **Egress (to phone)**

   * BLE advertisements: short, ephemeral payload
   * NFC/App Clip NDEF: richer payload when tapped
   * optional local HTTP endpoint for debugging

### 3.1. Conceptual Flow

1. POS completes order → sends order context to Vine.
2. Vine normalizes and stores `currentOrder` for `terminalId`.
3. Vine starts broadcasting:

   * `merchantId`, `terminalId`, `amountCents`, `orderIdHash`, `nonce`.
4. Nearby iPhone sees broadcast → opens Cherry App Clip/Pass.
5. Cherry backend consumes broadcast payload, merges with user state → recommendation.
6. User pays on the real POS terminal with the recommended card.
7. Cherry later reconciles outcome for rewards.

---

## 4. Hardware Architecture

You don’t need to design a PCB now, but you need a **conceptual BOM** and platform.

### 4.1. Core Components

1. **MCU / SoC**
   Requirements:

   * BLE 5.0 (advertising + GATT)
   * WiFi 2.4 GHz (for POS/cloud)
   * Enough flash/RAM for:

     * RTOS (e.g., FreeRTOS)
     * TCP/IP stack
     * TLS (for cloud APIs)
       Candidate families:
   * ESP32-S3 or ESP32-C6
   * Nordic nRF5340 with external WiFi module (more complex)

2. **NFC / NDEF Tag** (optional but recommended)

   * For tap-based App Clips
   * Chip families: NTAG21x, NTAG424 (for secure NDEF if you want signing)
   * Interface: I2C or SPI to MCU

3. **Power**

   * USB-C 5V input
   * On-board regulator to 3.3V
   * Optional PoE variant for enterprise

4. **Indicators / Minimal UI**

   * Status LED(s):

     * power
     * WiFi/POS connection
     * broadcasting / idle
   * Optional button:

     * reset / factory mode
     * “pairing” mode for onboarding
   * Optional tiny buzzer for debug/alerts (not required)

5. **Connectivity**

   * WiFi (STA mode)
   * Optional Ethernet jack for stable back-of-house deployments
   * BLE for outbound to phones only (no inbound card data)

6. **Enclosure**

   * Small puck or tile
   * Non-threatening design (looks like a loyalty device, not a payment terminal)
   * Clearly branded as “Cherry Vine – Not a payment device.”

### 4.2. Hardware Constraints

* No magstripe reader.
* No EMV CL or contact interface.
* No keypad.
* No secure element for card data (because we never see card data).
* Target BOM cost (vision-level, not real quote):

  * prototype: $40–$80
  * volume: $15–$30

---

## 5. Firmware Architecture

Firmware should be modular and boring.

### 5.1. Main Modules

1. **System Core**

   * RTOS scheduler
   * Boot & config loading
   * Logging + debug over serial

2. **Network Stack**

   * WiFi connect + reconnect logic
   * TLS client for HTTPS
   * Local HTTP server (for config + diagnostics)

3. **Ingress Drivers**

   * `pos_api_driver`: listens to local POS HTTP/WebSocket or cloud push
   * `middleware_driver`: listens for middleware events
   * `cloud_driver`: long-polling or server-sent events from Cherry or merchant cloud
   * `printer_tap_driver`: parses ESC/POS or text from serial/USB
   * `manual_test_driver`: simple REST endpoint to push test orders (for dev)

4. **Normalizer**

   * Takes events from all drivers, maps to common struct:

     type OrderContext = {
       merchantId: string;
       storeId: string;
       terminalId: string;
       orderId: string;
       amountCents: number;
       currency: string;   // "USD" etc.
       timestamp: number;  // unix epoch seconds
       source: "POS_API" | "MIDDLEWARE" | "CLOUD" | "PRINTER" | "MANUAL";
     }
   * Performs minimal validation, deduplication, and expiry.

5. **Broadcast Engine**

   * BLE advertisement builder
   * Optional NFC NDEF writer
   * Maintains a short-lived “current/last order” by terminal or global (for small shops)
   * Rotates nonces to mitigate replay

6. **Security & Keys**

   * Module to:

     * store device ID
     * store per-merchant secrets (for signing)
     * derive per-order token for BLE and NDEF payload

7. **Config & Provisioning**

   * Handles:

     * initial setup
     * connecting to WiFi
     * registering with Cherry backend
     * receiving merchant/POS configuration

---

## 6. POS Integration Protocol

The POS side is where **order context** comes from. There are multiple possible strategies; Cherry Vine should support several.

### 6.1. Common Payload Shape

Regardless of source, push this to Vine:

{
  "merchantId": "chipotle_0241",
  "storeId": "chipotle_0241",
  "terminalId": "register_03",
  "orderId": "845902",
  "amountCents": 1472,
  "currency": "USD",
  "timestamp": 1732674554
}

This is **not** card data. It’s the same sort of data used to print a receipt.

### 6.2. Integration Modes

#### 6.2.1. Mode A — Local POS API → Vine HTTP

* Vine exposes a local HTTP endpoint on the LAN (or via DNS like `vine-01.local`):

  * `POST /api/v1/order`

  Request body: the common payload above.

* POS vendor or integrator config:

  * after each order is finalized, call `vine-ip/api/v1/order` with that JSON.

Pros:

* Simple
* Works well in smaller environments
* Good for modern, open POS systems

#### 6.2.2. Mode B — Middleware → Vine HTTP

* Some merchants already use a middleware layer (e.g., Omnivore, Punchh-like system).
* That middleware acts as a **relay**:

  * POS → Middleware → Vine.

Architecture:

* Vine exposes same `POST /api/v1/order`.
* Middleware is configured per store to call Vine.

Pros:

* Less per-POS integration complexity.
* Standard pattern in restaurant tech.

#### 6.2.3. Mode C — Cloud → Vine

Here, Vine doesn’t talk directly to POS. Flow:

1. POS sends orders to **merchant cloud** or **Cherry cloud connector**.
2. Cloud identifies associated Vine device(s) for that store.
3. Cloud calls Vine over the internet:

   * `POST https://vine-0138.store-domain.com/api/v1/order`
     or via:
   * WebSocket / MQTT / SSE

This requires:

* Vine to have DNS or some stable identity.
* Vine to punch out/outbound connection to Cherry or merchant cloud (commonly done via WebSockets).

Pros:

* Enterprise-friendly
* Minimal local POS changes

#### 6.2.4. Mode D — Printer Stream Tap

For older POS that cannot do API:

* Many POS systems send ESC/POS commands to a receipt printer.
* Vine can:

  * sit **in-line** between POS and printer, or
  * be configured as a “printer” that forwards to the actual printer.

Data flow:

* POS → Vine (ESC/POS) → Printer
* Vine parses the stream to detect lines like:

  * `TOTAL $14.72`
* Once total is found, Vine creates an `OrderContext` with:

  * amount from parsed line
  * merchant/store ID from config
  * a random orderId if none exists.

This is ugly but effective in legacy environments.

#### 6.2.5. Mode E — Manual / Test

For development:

* `POST /api/v1/test-order` on Vine with payload:

  {
    "amountCents": 1234,
    "merchantId": "sandbox_merchant",
    "terminalId": "dev_terminal"
  }
* Immediately normalizes and broadcasts for QA.

---

## 7. BLE Advertisement Specification

BLE is how the phone gets a **fast, low-friction signal** from Vine.

### 7.1. Goals

* Small packet (BLE adv is limited in size).
* No direct user identity.
* Enough data to let the **Cherry App Clip / app** fetch full context from backend.
* Resistant to simple spoofing and replay.

### 7.2. Example Advertisement Layout

BLE advertisement payload (manufacturer-specific or service data field):

* Version (1 byte)
* Flags (1 byte)
* Vine ID (4–6 bytes, short ID or hash)
* Merchant ID hash (4–8 bytes)
* Amount (3 bytes, `amountCents` up to 16,777,215)
* Order token (8–12 bytes, HMAC/nonce)

Rough layout example (not final, just conceptual):

[VER][FLAGS][VINE_ID(4)][MERCH_HASH(4)][AMOUNT(3)][ORDER_TOKEN(8)]

Interpretation:

* `VINE_ID` — mapped server-side to `storeId` and `merchantId`.
* `MERCH_HASH` — sanity check + support for some local/offline features.
* `AMOUNT` — direct representation of cents.
* `ORDER_TOKEN` — short-lived HMAC or MAC over (`VINE_ID`, `amount`, `timestamp`) using a per-device secret; lets backend verify authenticity.

### 7.3. Advertising Behavior

* Advertising interval: e.g., 100–300 ms when there is an active `currentOrder`.
* Timeout:

  * Broadcast for N seconds (e.g., 60–120 seconds) after an order is created.
  * After that, stop advertising or downgrade to “idle” mode.
* Multiple orders:

  * For simplicity, start with “last completed order” semantics.
  * If multiple terminals in a store, either:

    * treat each Vine as per-terminal, or
    * include `terminalId` in order token & let backend disambiguate.

---

## 8. NFC / NDEF Structure

NFC is useful for:

* explicit user taps
* App Clip invocations
* fallback when BLE behavior is not enough

### 8.1. NDEF Content

NDEF record usually encodes a URL.

Pattern (example):

https://cherryapp.com/vine?d={deviceId}&t={orderToken}

Where:

* `deviceId` = Vine’s public identifier
* `orderToken` = short-lived, signed token referencing the latest order

When the phone taps:

1. iOS reads URL.

2. iOS sees association between `cherryapp.com` and Cherry App Clip/full app.

3. Cherry app opens, extracts `d` and `t`.

4. App calls backend:

   GET /api/v1/vine/order?deviceId=...&orderToken=...

5. Backend returns full `OrderContext` + derived merchant/category fields.

6. Cherry runs evaluation and shows recommendation.

### 8.2. Dynamic Updates

* Vine updates the NDEF record when:

  * a new order arrives
  * the previous order expires
* To avoid flash wear on some tags, consider:

  * using tags designed for dynamic NDEF
  * caching for a few seconds between updates

---

## 9. Security Model

Cherry Vine doesn’t touch payment data, but it still must avoid being trivially spoofed.

### 9.1. Threats to Consider

* A malicious app or device broadcasting fake “Cherry Vine” BLE packets to trick users.
* A bad merchant forging order totals to game analytics/points.
* Replay of old broadcasts.

### 9.2. Basic Security Mechanisms

1. **Device Identity**

   * Each Vine has:

     * a unique `deviceId`
     * a device secret key, provisioned by Cherry backend.
   * The secret is used to generate HMAC/MAC tokens.

2. **Order Tokens**

   * For each OrderContext, Vine computes:

     * `orderToken = HMAC(deviceSecret, canonical(orderFields + timestampBucket))`
   * `orderToken` is included in BLE and NFC payloads.
   * Backend verifies token validity and timestamp.
   * Order tokens are single-use and time-bound; reuse for a different order or outside the validity window must be rejected server-side.

3. **Time-Bound Validity**

   * Orders expire quickly (e.g., 1–3 minutes) for broadcast.
   * Backend rejects stale tokens.

4. **TLS for Cloud/Config**

   * All communication between Vine and Cherry/merchant cloud is over HTTPS/TLS.
   * Use standard certificate validation.

5. **No Secrets to Phone**

   * The BLE & NDEF payloads contain:

     * `deviceId`
     * `orderToken`
     * safe metadata
   * No direct device secrets or raw HMAC keys.

6. **Merchant Authentication**

   * When linking Vine to a merchant, use one of:

     * pairing code
     * provisioning QR
     * signed config file from Cherry backend

---

## 10. Device Provisioning and Configuration

### 10.1. Manufacturing Stage

* Each device programmed with:

  * `deviceId` (UUID or short ID)
  * `deviceSecret` (random key)
  * base firmware image
* Stored in a secure device registry in Cherry backend.

### 10.2. First-Time Setup at Merchant

Basic flow:

1. Merchant plugs Vine into power.
2. Vine boots in “setup mode”:

   * spins up WiFi AP (e.g., `CherryVine-<shortId>`)
   * or uses BLE to communicate with a mobile setup app
3. Merchant launches “Cherry Vine Setup” app:

   * connects to the device
   * provides:

     * store/merchant ID (or logs into their merchant account)
     * WiFi credentials
4. Setup app contacts Cherry backend:

   * asserts “deviceId X should be linked to store Y”
   * backend verifies merchant account and updates its registry
5. Vine reboots into “normal mode”:

   * connects to WiFi
   * pulls full config from Cherry backend:

     * store info
     * POS integration mode
     * relevant API endpoints or tokens

### 10.3. Reconfiguration

* Via local admin panel at:

  * `http://vine.local/admin`
* Protected by:

  * admin password
  * or ephemeral PIN from backend

Typical operations:

* change WiFi
* switch integration mode
* view diagnostics

---

## 11. Merchant Onboarding Workflow

You are an indie dev; keep this simple conceptually, even if you don’t build it yet.

### 11.1. Step 1 — Merchant Signs Up

Merchant signs up in a **Cherry Merchant Portal**:

* creates account
* registers one or more locations/stores
* optionally connects to POS partner (Toast, Clover, etc.) via OAuth-like flow

### 11.2. Step 2 — Merchant Orders Cherry Vines

* They order N devices for N locations OR N terminals.
* Cherry ships hardware with labels (store IDs or just device IDs).

### 11.3. Step 3 — Install & Pair

For each device:

* place Vine near POS terminal (clear label “Not a payment device”)
* plug into power
* run setup app:

  * pick store from list
  * associate device with store (and optionally terminal)
  * configure integration mode (local API, middleware, cloud, etc.)

### 11.4. Step 4 — POS Integration

Depending on the POS:

* **API-based**:

  * merchant enters Leaf/Cherry integration token into POS configuration panel.
  * POS vendor’s integration sends order data to the Vine or to Cherry backend which then relays it.

* **Middleware-based**:

  * merchant enables Cherry as a destination in their existing integrator.

* **Printer-based**:

  * merchant plugs printer cable into Vine, then from Vine to the printer.
  * optionally configures printing options.

### 11.5. Step 5 — Test Mode

Merchant tests:

* run a test order for $1.23
* see debug display:

  * that Vine received `amountCents = 123`
  * that Cherry app sees merchant + amount when scanning

After that, the system is “live.”

---

## 12. Device Lifecycle

### 12.1. States

* `UNPROVISIONED` — just manufactured, not linked.
* `CONFIGURING` — pairing in progress.
* `ACTIVE` — linked to store and ingesting orders.
* `DEGRADED` — no POS data for X minutes, only idle beacons or none.
* `RETIRED` — unlinked from store and disabled.

### 12.2. Updates

Firmware updates:

* Vine periodically checks Cherry backend for new firmware.
* Downloads via HTTPS.
* Applies update and reboots.

This allows:

* patching security issues
* adding new integration modes
* improving BLE/NFC behavior

---

## 13. Analytics and Merchant Data (High-Level)

Vine carries **no user identity** but enables Cherry to know:

* “At store X, at time T, these order totals were seen.”

On Cherry’s side, when a user engages:

* Cherry ties:

  * `userId`
  * `deviceId`/`storeId`
  * `orderToken`
  * internal evaluation result
* But exported analytics to merchants must be:

  * **aggregated**
  * **anonymized**
  * **consent-respecting**

Examples of merchant-visible metrics:

* % of visits where users stayed in budget
* average spend bucket location when visiting
* day/time patterns of healthy vs borderline spend

Vine is the **sensor**, Cherry backend is the **brain**, merchants get **summaries**, not raw user logs.

---

## 14. Implementation Priority for an Indie Dev

You don’t need to do all of this at once. A realistic path:

### Phase 1 — Pure Software Simulation

* No physical Vine.
* Just:

  * a “Cherry Vine Simulator” page or local service that:

    * calls your backend `/api/vine/order` with merchant + amount
    * triggers a push/notification flow to your phone
* Goal: solidify **Observe → Evaluate → Recommend → Reward** with a fake Vine.

### Phase 2 — Minimal Physical Prototype

* Use an **ESP32 dev board** (e.g., ESP32-DevKitC).
* Implement:

  * WiFi
  * Local HTTP `POST /order`
  * BLE advertisements encoding amount+deviceId
* Hardcode everything else.
* Manually push orders with curl/postman to your ESP32 board and confirm your phone can detect the BLE payload and open a test app.

### Phase 3 — POS Integration Experiment

* Build a fake POS (web page) that:

  * has a “TOTAL” field
  * on “Complete Order”, posts to the ESP32 Vine.
* Now you have:

  * “POS → Vine → Phone → Cherry app”

### Phase 4 — Add NFC/App Clip

* Add an NFC dev tag.
* Encode NDEF with a URL to your test backend.
* On update, re-encode with orderToken.

### Phase 5 — Tighten Security + Config

* Add device identity
* Add token signing
* Add config endpoints

Beyond that, you can start thinking about real merchant environments only when the core experience feels right.

---

## 15. Summary

Cherry Vine is:

* a **dumb but structured** hardware node
* with multiple POS ingestion options
* a normalized order context struct
* a BLE/NFC broadcast interface to phones
* a narrow, clean security model
* and a simple merchant onboarding story

It extends Cherry’s **Observe** step into the physical world without ever becoming a payment device.

When you’re ready, we can turn this into:

* a shorter **spec.md** for engineers
* a mini **firmware-architecture.md**
* or concrete code scaffolding (ESP32 pseudo-code, backend endpoints, etc.).

## Future/Target behavior (explicitly speculative)
- HMAC/nonce verification with device secrets and enforced signature lifecycle.
- Fleet management and monitoring for real devices.
- Production transport integrations with POS and order systems.

## Related docs
- `docs/legal-constraints.md`
- `docs/cherry-vision.md`
- `docs/api.md`
- `docs/wallet-pass.md`

<!-- docs/cherry-vision.md -->
Status: Active
Last updated: 2026-01-03

# Cherry Vision & Product Identity

*A living document for how Cherry should exist in the world*

All other docs and code must conform to this file (and `docs/legal-constraints.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, `docs/api.md`). If reality drifts, fix the code—not this identity. See `docs/legal-constraints.md` for hard legal guardrails.

Where this lives in the repo today:
- Advisory entry: `/api/scan` in `app/api/scan/route.ts` runs the engine and records a `DecisionEvent` for telemetry. It does not create sessions or ledger entries.
- Persisted flow: `/api/sessions` + `/api/sessions/[id]/confirm|verify` backed by `RecommendationSession` and `CherryPointLedger` in `prisma/schema.prisma`. Bucket spend is incremented on confirm after `ensureBucketFresh` rollover.
- Engine: `lib/engine/solver.ts` (`solveDecision` + `safeSolveDecisionForUser`) with invariants in `lib/engine-invariants.ts`; legacy shim lives in `lib/engine/legacy.ts`.
- Vine context ingest (dev-only): `/api/vine/order` + simulator UI `/vine-simulator`.
- Wallet pass scaffold: `/api/wallet/cherry-pass` (501 until Apple certs).

## Current behavior (enforced / in code)
- Cherry is advisory only: observe → evaluate → recommend → reward, with no authorization or routing.
- `/api/scan` is an advisory API for recommendations; it logs a `DecisionEvent` for observability but does not create sessions or ledger rows.
- Sessions and Cherry Points are persisted only via `/api/sessions` + confirm/verify flows.
- Vine is a context beacon (merchant + amount + timestamp) and remains separate from payment rails.
- Wallet pass stays gated at 501 until certs and the feature flag exist.

### Core invariant
- Cherry (including Cherry Vine) must never imply approval, authorization, reservation of funds, or transaction success.
- All recommendations are advisory and may be ignored without consequence.
- Cherry must not signal “go ahead”, “approved”, or “confirmed” semantics prior to user payment.

### State boundaries
- Cherry Vine and client surfaces hold only ephemeral state.
- All durable state (sessions, buckets, ledger, rewards, verification) lives exclusively in the Cherry backend.
- Loss, reboot, or compromise of a Vine device must never affect correctness of user balances or rewards.

## Future/Target behavior (explicitly speculative)
- Deeper verification (bank ingest + receipts + Vine) posts Cherry Points automatically once verification moves beyond the current stubbed flow.
- Vine signature lifecycle enforcement and broader context coverage are planned but not yet in production.

---

## 0. TL;DR — What Cherry Is (and Is Not)

1. **Cherry is not a payment card.**
   It does not front, proxy, route, or intermediate payments. It never “sits in front” of your real cards in the authorization path.

2. **Cherry is a real-time spending advisor.**
   It lives alongside your cards, not in front of them. It gives you intelligent, contextual recommendations before you swipe, tap, or click.

3. **Cherry’s core loop is:**
   **Observe → Evaluate → Recommend → Reward.**
   It observes your context, evaluates budget + rewards impact, recommends what to do, and rewards you for following through.

4. **Cherry is your spending copilot, not your payment proxy.**
   It shapes behavior and decisions, not the underlying financial plumbing.

5. **Cherry can extend into the physical world via Cherry Vine.**
   Cherry Vine is an on-counter hardware node that only emits non-sensitive context (merchant + amount + timestamp) to nearby phones so Cherry can run its loop in real time, while still never touching payment rails.

This document defines Cherry’s identity, constraints, and core product mechanisms so we never drift into illegal “card fronting” territory, and instead build a durable, legal, and actually more powerful engine.

---

## 1. The Core Identity

### 1.1. The Single Sentence

> **Cherry is a real-time spending copilot that tells you whether you should buy, which card to use, and how that choice affects your budget and rewards — then rewards you for following its advice.**

### 1.2. What Cherry Feels Like to a User

To an end user, Cherry feels like:

* That one obsessive friend who knows:

  * every rewards program
  * your paycheck dates
  * your actual budget
  * your upcoming obligations
* …and stands next to you at the register and quietly says:

  * “Use Amex Gold here — 4x dining, you’re still $37 under budget.”
  * Or: “If you swipe this, you’re blowing your Dining bucket. Are you sure?”
  * Or: “Use your 2% card. This merchant doesn’t trigger any promos.”

The user **still pulls out their own card**. Cherry never swipes for them.
But psychologically, the card they pick feels “chosen by Cherry.”

Over time, as Cherry Vine appears on real counters, Cherry also feels like a small piece of hardware that quietly cooperates with the register to tell your phone what’s about to happen, while still leaving the actual payment entirely between you, your card, and the merchant.

---

## 2. What Cherry Explicitly Is Not

To avoid any legal/regulatory confusion, we draw hard lines.

### 2.1. Cherry is not:

* A **credit card** or **debit card**.
* A **“smart” front card** that holds multiple cards behind it.
* A **proxy BIN** that routes authorization to some underlying instrument.
* A **processor**, **gateway**, **program manager**, or **money transmitter**.
* A **custodian of funds** or an entity that “touches money.”

### 2.2. Cherry does not:

* Receive card PANs, CVV, or secure card data on its servers.
* Insert itself into the **authorization pipeline** (no fronting, no routing).
* Represent itself to a merchant as a valid payment instrument.
* Hold funds, escrow money, or delay settlement.
* Make or break the user’s ability to complete a transaction.

If the user’s card issuer declines the transaction, that’s between them and the bank.
Cherry’s job is to say: “If you do this, here’s what it means for you.”

Cherry Vine, even as a physical device in a merchant’s store, follows the same rule: it is not a reader, not a terminal, not a card. It is a context beacon that only ever sees non-sensitive order metadata and never has the ability to approve, decline, or route payments.

---

## 3. The Legal-Friendly Core Loop: Observe → Evaluate → Recommend → Reward

At a high level:

1. **Observe**: Cherry collects just enough context to know *where* you’re about to spend and for roughly *how much*.
2. **Evaluate**: Cherry’s engine runs: bucket logic, card rewards logic, budget trajectory.
3. **Recommend**: Cherry tells you which card and whether this spend is “healthy” given your goals.
4. **Reward**: Cherry gives you Cherry Points if you follow the recommendation and confirm the purchase.

Let’s break this down.

---

## 4. “Observe” — How Cherry Sees the World (Without Touching Money)

Cherry needs context without entering the payment rails.

### 4.1. Inputs Cherry can legally and safely use

These are **non-payment** signals it can rely on:

* **User-initiated scans / taps**:

  * A Wallet Pass (Cherry Pass) opened in Apple Wallet.
  * An app “Scan” button tapped when they’re at checkout.
  * An App Clip triggered via NFC/QR at a merchant.

* **User-provided merchant information**:

  * User types in merchant name (“Chipotle”).
  * User selects merchant from auto-suggest (based on location).
  * User takes a photo of a receipt → OCR extracts merchant, amount.

* **Device context (with consent)**:

  * GPS location (rough coordinates).
  * Time of day.
  * Optional: known geofenced merchant polygons.

* **User’s internal Cherry data**:

  * Buckets (categories + budgets + periods).
  * Cards and reward rules.
  * Past simulated or “verified” transactions.

* **Merchant-side Cherry Vine signals (where deployed)**:

  * A Cherry Vine hardware node broadcasting:

    * merchant identifier (e.g., chipotle_store_0241)
    * final or near-final total amount
    * timestamp and terminal identifier
  * Vine broadcasts over BLE/NFC to nearby iPhones so the Cherry app/App Clip can pre-fill context without manual typing, still without ever reading card data or touching the payment terminal’s EMV rails.

### 4.2. What “Observe” does NOT do

* Does not read card numbers.
* Does not act as POS or payment terminal.
* Does not talk to networks (Visa/Mastercard/Amex) directly.
* Does not intercept or modify the payment authorization message.
* Does not emulate a payment card or speak EMV, magstripe, or network protocols.

Cherry is basically building a **shadow model** of the transaction that’s about to happen, purely from user + context data (and, where available, merchant-provided non-sensitive signals via Cherry Vine).

### 4.3. The Cherry Vine hardware observation layer

Cherry Vine extends “Observe” into the physical merchant environment:

* Sits on or near the counter, physically close to the real POS terminal.
* Connects only to the merchant’s **order layer** (POS APIs, middleware, cloud, or printer streams), never to the **payment network layer**.
* Receives:

  * order total
  * merchant/store ID
  * optional order ID and timestamp
* Normalizes this into a compact payload and:

  * broadcasts it via BLE advertisements
  * exposes it via dynamic NFC or QR App Clip links
* Allows the Cherry app/App Clip to open already knowing:

  * “You are at this specific merchant”
  * “You are about to pay this specific amount”

Cherry Vine is thus a physical extension of Cherry’s Observe step, designed under the same constraint: maximum context, zero payment authority.

---

## 5. “Evaluate” — The Engine’s Job

This is where your existing logic lives.

### 5.1. Inputs to the engine

* `userId`
* `merchantName` (or some merchant identifier)
* `category` (RewardCategory / MCC-derived)
* `amountCents` (estimated or exact)
* Timestamp (`now`)
* User’s:

  * Buckets
  * Cards
  * Reward rules
  * Past simulation/verified transaction history
* Optional merchant metadata:

  * store/location identifiers from Cherry Vine
  * anonymized aggregate statistics for that merchant (for insights, not routing)

### 5.2. What the engine computes

For a hypothetical transaction:

1. **Bucket selection and budget impact**:

   * Which bucket does this belong to (e.g., `DINING`)?
   * What is the current period (this week / this month)?
   * How much has the user already spent in this bucket?
   * After this transaction, will they be:

     * under budget?
     * at the limit?
     * over budget?

2. **Strict-mode logic**:

   * If the bucket is in **strict mode**, should Cherry advise “do not spend”?
   * If not strict, how aggressively should Cherry warn?

3. **Card optimization**:

   * Among all user cards, which:

     * matches the category exactly (e.g., DINING 4x)?
     * or falls back to general rewards (1–2% everywhere)?
   * What is the implied reward multiplier?
   * Are there any special rules (rotating categories, caps) in the future?

4. **Reward & decision summary**:

   * Recommended card.
   * Projected rewards (e.g., 200 points).
   * Proposed “Cherry Points” for compliance.
   * A classification:

     * ✅ “Healthy swipe”
     * ⚠️ “Borderline”
     * ❌ “Budget-breaking swipe (strict)”

The engine returns a **decision object** summarizing this evaluation.

In environments with Cherry Vine, the evaluation can be triggered automatically at the right second (when the POS finalizes the total) without user confirmation and without affecting the transaction, but the decision object and its semantics remain exactly the same.

---

### 5.3. Multi-action solver (advisory only)

Cherry’s engine now evaluates multiple classes of actions for a given purchase context, still within the **advise-only** boundary:

- `USE_CARD` — recommend a specific card for the purchase.
- `USE_CARD_WITH_PAYDOWN` — recommend a card **and** schedule an extra debt payment (horizon-2).
- `DELAY_PURCHASE` — suggest deferring for a few days to protect runway.
- `REJECT_PURCHASE` — suggest skipping entirely (logged as a self-decline).
- `SWITCH_MERCHANT` — recommend an alternate merchant in the same category when data supports it.
- `PAY_DOWN_DEBT` — recommend a standalone paydown when liquidity allows.

Guardrails block unsafe actions (e.g., essential budgets over limit, paydowns that exceed liquid cash), and public APIs still surface card-centric outputs while tracing the broader decision space.

---

## 6. “Recommend” — How Cherry Talks to the User

Cherry’s recommendations should be:

* **Concrete**: “Use this specific card.”
* **Contextual**: “Here’s what this does to your budget.”
* **Actionable**: “Complete in X minutes to earn Y Cherry Points.”
* **Honest**: If it’s a bad idea financially, it should say so.

### 6.1. Example recommendation payload

Think of a canonical recommendation shape:

{
  "merchantName": "Chipotle",
  "amountCents": 2000,
  "category": "DINING",
  "bucket": {
    "name": "Dining Weekly",
    "limitCents": 20000,
    "spentBeforeCents": 15000,
    "spentAfterCents": 17000,
    "remainingAfterCents": 3000,
    "strictMode": true,
    "wouldExceed": false
  },
  "cardRecommendation": {
    "cardNickname": "Amex Gold",
    "multiplier": 4,
    "estimatedRewards": 200
  },
  "cherryIncentive": {
    "pointsIfFollowed": 15,
    "expiryMinutes": 15
  },
  "verdict": "HEALTHY" // HEALTHY, BORDERLINE, BREAKS_BUDGET
}


### 6.2. How it’s delivered

Possible channels:

* **Push notification**: when user taps Cherry Pass in Wallet.
* **In-app banner / card**: “For this swipe, Cherry recommends…”
* **Lock screen Live Activity** (later): ongoing session while you’re in-store.
* **Wearable notification** (Apple Watch): super low friction.
* **Cherry Vine triggered App Clip**: when your phone detects a Cherry Vine broadcast (merchant + amount), the App Clip opens with the recommendation already computed.

The key: **Cherry recommends; user swipes**.
Cherry is not in the transaction chain.

---

## 7. “Reward” — The Cherry Points Loop

Cherry needs a reason for users to actually listen to it.

### 7.1. Cherry Points as a behavioral layer

* Cherry awards **Cherry Points** when:

  * You follow the recommended card.
  * You stay inside your bucket.
  * You continue to track your spending over time.
* Cherry Points are:

  * Initially: an internal, non-monetary gamification mechanism.
  * Eventually: may map to perks (discounts on premium, partner rewards, or just ego metrics like streaks, levels, ranks).

### 7.2. How compliance could be verified

Cherry cannot see the live card authorization, but it can still verify behavior via:

* **User confirmation flows**:

  * After recommendation, show “Did you complete the purchase with [Amex Gold]?” with quick Yes/No.
  * Confirm by:

    * user entering the exact amount
    * taking a photo of receipt
    * or selecting from parsed email receipts.
* **Email forwarding integration (future)**:

  * User forwards receipts to a Cherry email.
  * Cherry parses:

    * merchant name
    * amount
    * last 4 digits of card used (if visible)
    * time
  * Matches this with the recommendation window.
* **Bank data import (long-term)**:

  * Plaid / Tink / account aggregator to reconcile transactions.
  * This has its own compliance requirements, but still does not make Cherry a card.
* **Cherry Vine–assisted matching (where deployed)**:

  * Vine can attach an order ID and timestamp to the broadcast.
  * Later, when Cherry sees a receipt or bank transaction for that merchant and amount within that window, it can automatically reconcile:

    * which recommendation session this belonged to
    * whether the user’s reported card choice matches prior advice
  * Vine still never sees the card; it just improves the quality of the matching between intent and outcome.

### 7.3. Reward rules

Examples:

* +10 Cherry Points:

  * You used the recommended card and stayed within budget.
* +5:

  * You used the recommended card but overspent a bit (not strict-mode).
* 0:

  * You ignored Cherry entirely.
* Streak bonuses:

  * “7 days of following Cherry’s recommendations → +50 bonus points.”
* Location- or merchant-aware bonuses (allowed only if anonymized and consented):

  * “+5 bonus Cherry Points when you follow Cherry at a partnered merchant this week.”
  * This is implemented via aggregate logic and Cherry Vine IDs, not by leaking individual user behavior to the merchant.

---

## 8. Product Surface: The “Cherry Pass” in Apple Wallet

Instead of a “Cherry Card” that pretends to be a payment card, Cherry has a **Wallet Pass**:

* It looks like a **loyalty card** or boarding pass:

  * Cherry logo
  * Your name
  * Your current Cherry Points
  * A “Manual Lookup & Rewards” subtitle.
* When you tap it:

  * It opens the Cherry app / App Clip.
  * It can embed metadata (like a token) that identifies the user quickly.

### 8.1. Flow with Cherry Pass

1. You are about to pay at a store.
2. You open Apple Wallet, tap “Cherry Pass” (not a pay card).
3. Cherry app/App Clip opens, reads:

   * Approximate location
   * Optional merchant selection UI
   * Optional amount input or estimate
4. Cherry runs the engine.
5. Cherry shows + optionally pushes:

   * “Use X card; this is your budget status; here’s how many Cherry Points you’ll earn.”
6. You put your phone back down and use the recommended card normally.

Cherry is like a **ritual** before spending, not an instrument of payment.

### 8.2. Flow with Cherry Pass and Cherry Vine at checkout

When Cherry Vine is present at the merchant:

1. You are in line at a store that has a Cherry Vine puck next to the POS terminal.
2. The cashier rings up your order; the POS finalizes the total.
3. The POS (or its cloud/middleware) sends:

   * merchant/store ID
   * order total
   * timestamp
     to the Cherry Vine device.
4. Cherry Vine broadcasts a small payload over BLE (and optionally via NFC/App Clip link) with that context.
5. Your iPhone detects the Cherry Vine broadcast and:

   * presents a lock-screen prompt to open the Cherry App Clip or
   * wakes the Cherry Pass–linked experience with the merchant and amount pre-filled.
6. Cherry runs the engine using this pre-filled context:

   * merchant name derived from merchant/store ID
   * category resolved from merchant
   * amount from the Vine payload
   * your current buckets, cards, and rules
7. Cherry shows:

   * which card to use
   * your budget status
   * how many Cherry Points you will earn for following the recommendation.
8. You ignore Cherry Vine from that point: you physically pay on the real terminal with the recommended card.
9. Afterward, Cherry asks you to confirm what you actually did and awards Cherry Points accordingly.

Cherry Pass is the user-facing surface; Cherry Vine is the merchant-facing hardware helper that makes the ritual faster and less manual without ever becoming a payment method.

---

## 9. User Mental Model

To the user, Cherry is:

* A **companion** to their wallet, not a wallet replacement.
* A **coach** for their money decisions, not a gatekeeper.
* A **reward layer** on top of doing the “smart” thing.
* In some stores, a small puck (“Cherry Vine”) that quietly cooperates with their phone so Cherry can advise them faster, but that never replaces their card or controls the terminal.

Key phrases we want users to think:

* “I let Cherry choose my card.”
* “I check Cherry before I swipe.”
* “Cherry keeps me honest with my budgets.”
* “I get Cherry Points for following the plan.”
* “At some places, Cherry just pops up at the right second and tells me what to do.”

Not:

* “Cherry is where my money lives.”
* “I pay with Cherry.”
* “Cherry is ‘my card’.”
* “That Cherry puck is the thing I tap to pay.”

---

## 10. Positioning vs. Other Products

### 10.1. vs “Smart Cards” (Curve, etc.)

Smart cards:

* Intercept transactions.
* Route payments to different underlying cards.
* Live in the authorization path.
* Are legally complex, regulated, and fragile.

Cherry:

* Does not intercept transactions.
* Does not route payments.
* Lives entirely outside the authorization path.
* Advises + rewards behavior, with much lower risk.

Even if Cherry Vine exists on the counter, it still never acts as a smart card or proxy; it is closer to a loyalty beacon or digital receipt helper than to a payment instrument.

### 10.2. vs Budgeting apps (Mint, YNAB)

Budgeting apps:

* Are mostly **after-the-fact**.
* Show you what you did last week/month.
* Rarely influence the *moment of decision*.

Cherry:

* Is **pre-swipe** and **real-time**.
* Influences behavior **before** money moves.
* Connects budgeting + card rewards in a single UI and engine.
* Through Cherry Vine, can be physically anchored at the place where decisions actually happen, without leaving the budgeting domain.

### 10.3. vs Rewards content sites (NerdWallet, TPG)

Content sites:

* Teach you which card is good in general.
* Do not know:

  * your live budget
  * your actual cards
  * your specific situation at the register.

Cherry:

* Knows your **real** cards and their rules.
* Knows your **buckets and budgets**.
* Knows where you are **right now**.
* Gives a **single concrete recommendation** at the moment of truth.
* In Cherry Vine locations, can do this with almost zero friction, triggered by the store itself instead of by you typing.

### 10.4. vs in-store loyalty hardware and beacons

Existing in-store loyalty hardware:

* Often tries to capture identity (phone number, QR, app account).
* Sometimes links directly to offers that change what the terminal charges or how rewards are earned.
* Can be tightly bound to a specific merchant’s ecosystem.

Cherry Vine:

* Does not alter prices, promotions, or the checkout itself.
* Does not require you to identify yourself to the merchant through the hardware.
* Is merchant-installed but user-centric: its only role is to broadcast non-sensitive context so Cherry can advise the user.
* Merchant value comes from aggregate insights and better customer behavior, not from owning the user’s identity at the terminal.

---

## 11. Technical & Legal Boundaries (for devs)

When building Cherry, devs must respect these boundaries:

* **NO**:

  * Storing full PAN, CVV, track2, or chip data.
  * Acting as a payment processor, gateway, or issuer.
  * Advertising Cherry as a “card” to tap at terminals.
  * Emulating a network brand (Visa/Mastercard/Amex/Discover) on a pass.
  * Building Cherry Vine to accept card taps, read magstripe, or speak EMV protocols.
  * Wiring Cherry Vine directly into ISO8583, card schemes, acquirers, or processors.

* **YES**:

  * Storing anonymized card metadata (nickname, issuer, last 4).
  * Storing your own reward/routing logic.
  * Storing user budgets, rules, and Cherry Points.
  * Offering advice, forecasts, and recommendations.
  * Integrating with merchant POS/order systems to receive:

    * order totals
    * merchant/store IDs
    * timestamps and non-sensitive metadata
  * Using Cherry Vine as a unidirectional context emitter:

    * POS → Vine → phone, never card → Vine.

This doc should be treated as a **guardrail**:
Any feature that looks like it might cross into “proxy card” territory should be rejected at this layer.
Any Cherry Vine feature that starts to smell like a payment terminal (accepting taps, swipes, PINs, or storing cardholder data) should be rejected here as well.

---

## 12. Roadmap Implications

Because Cherry is defined as a **copilot, not a card**, the roadmap naturally centers around:

1. **Better observation**:

   * Stronger merchant inference (MCC mapping, location + merchant DB).
   * Cleaner ways to input transactions quickly (receipt OCR, simple forms).
   * Cherry Vine deployments that can broadcast merchant + amount so the app/App Clip opens pre-filled and ready to advise.

2. **Smarter evaluation**:

   * More nuanced bucket types (savings goals, debt payoff).
   * “If you keep doing this, you’ll overshoot by X by end of month.”
   * Merchant-aware heuristics that can tell you not just “can you afford it” but “is this consistent with how you said you want to use this category over time,” still computed on Cherry’s side, not at the merchant.

3. **Clearer recommendations**:

   * Simple language that builds trust.
   * Handling edge cases (“No card gives bonus here; use lowest APR”).
   * Variants of the message tailored for:

     * pure app usage
     * Cherry Pass–initiated flows
     * Cherry Vine–triggered flows, where the user has almost no time and needs one sentence plus one button.

4. **Deeper reward loops**:

   * Streaks, levels, achievements.
   * Using Cherry Points to unlock features or insights.
   * Optional opt-in programs where aggregated, anonymized behavior at Cherry Vine merchants can power better offers, while still keeping individual user-level data private.

5. **Optional integrations** (still not fronting):

   * Bank transaction read-only access to confirm behavior.
   * Receipt parsing to validate purchases.
   * Export to spreadsheets or accounting tools.
   * Merchant analytics products that consume only aggregate, anonymized Cherry data (e.g., “dining-budget adherence at your stores”) and never receive raw per-user histories.

6. **Cherry Vine & merchant ecosystem**:

   * Design and ship Cherry Vine as a hardware and firmware product that:

     * connects to POS/order systems via APIs, middleware, cloud, or printer ports
     * normalizes order context into a single internal shape
     * broadcasts that context in a secure, ephemeral way to nearby phones
   * Build a merchant onboarding pipeline:

     * registering stores and Vine devices
     * granting and revoking POS access tokens
     * configuring how data flows into Cherry’s Observe stage
   * Build merchant-facing analytics surfaces that:

     * expose only aggregated trends
     * help franchises understand behavior at the “moment of decision”
     * never reveal which specific person did what with which card.

At no point is “Cherry becomes a fronting card” on the roadmap.
That’s either a separate entity with licenses and a bank partner, or not part of Cherry at all.
Similarly, “Cherry Vine becomes a payment terminal” is not on the roadmap; if that ever happens, it is a separate, heavily regulated project with different constraints and partners.

---

## 13. Dev console surfaces (loop in the UI)

- Dashboard (`/`): unified header + metrics view anchoring spend, engine activity, and shortcuts into Scan, Simulate, Sessions, and tools.
- Statements (`/statements`): spend history that reflects bucket/budget impact and engine-tagged transactions.
- Scan (`/scan`): manual Observe → Evaluate surface for single contexts, with session handoff and Cherry Points preview.
- Sessions (`/sessions`): timeline of engine decisions, overrides, and Cherry Point states across Scan/Simulate/Vine.
- Vine simulator (`/vine-simulator`): hardware-context sandbox for `/api/vine/order`, showing the same engine outputs as Scan.
- Admin (`/admin`): health, seed/clear tools, and diagnostics; guarded as a dev-only surface.
- All pages share the same pattern (PageHeader → metrics → Panels + Empty/Error states) to reinforce Cherry as advisory, not a payment front.
- Buckets, Cards, and History/Activity surfaces follow the same console grammar, exposing budget constraints and recent engine events alongside standardized loading/empty/error handling.
- Spend history (`/history`) shows statement/bank timelines; Engine activity (`/activity`) shows engine-driven events (sessions, confirmations, ledger) under dev tools.

---

## 14. Engine Appendix

- Deterministic core: `EngineState + EngineContext → ranked actions + projections`, exposed via `solveDecision`/`safeSolveDecisionForUser` (`lib/engine/solver.ts`).
- All public and Vine-triggered evaluations route through `safeSolveDecisionForWorld` (a wrapper around `safeSolveDecisionForUser` with a World-injected runtime); no alternate solver path is authoritative.
- Canonical types live in `lib/engine/types.ts` (`NormalizedCard`, `RewardRule`, `Bucket`, `DebtAccount`, `UserConstraints`); guardrails live in `lib/engine/guardrails.ts`; context/state builders in `lib/engine/context.ts`.
- Legacy compatibility (`runEngine`, card/bucket verdicts) sits in `lib/engine/legacy.ts` until all surfaces migrate.
- `/api/simulate`, `/api/scan`, and `/api/sessions` all wrap the engine through `safeSolveDecisionForUser` for graceful failures while mapping back to legacy response shapes.
- Scoring: explicit multi-objective utility over `rewards`, `runway`, `debtRelief` minus `volatility`/`ruleViolations`. Per-user weights come from `engineObjectiveProfile` + optional JSON overrides on `User`; invalid/unknown values clamp to balanced defaults and never throw. External API shapes stay the same; only ranking adapts to the profile.

---

## 15. Summary & Mantra

**Cherry’s identity in one line:**

> Cherry is the real-time advisor that tells you if you should swipe, which card to use, and what it does to your budget — then rewards you for listening.

**Not a card.
Not a processor.
Not an issuer.**

Just a very intelligent, slightly opinionated copilot that lives in your pocket and makes you better at money in the moments that matter.

In some stores, that copilot is aided by a small, dumb hardware node (Cherry Vine) that only whispers “this is the merchant and this is the amount” to your phone so Cherry can speak up at the right second. But the core remains the same: Cherry lives in your head and your phone, not in the rails.

This is the anchor.
Every feature, UI screen, API, integration, and hardware product (including Cherry Vine) should be checked against this:

* Does this keep Cherry as “observe → evaluate → recommend → reward”?
* Does this keep Cherry as “copilot, not card”?
* Does this keep Cherry Vine as “context broadcaster, not payment terminal”?

If yes → green light.
If no → rethink it.

## Related docs
- `docs/legal-constraints.md`
- `docs/cherry-vine.md`
- `docs/wallet-pass.md`
- `docs/api.md`
- `docs/ci-and-guardrails.md`

<!-- docs/ci-and-guardrails.md -->
Status: Active
Last updated: 2026-01-18

# CI and guardrails

## Current behavior

### Pipeline
- Runs on every push to `main` and all PRs via `.github/workflows/ci.yml`.
- Steps (fail-fast):
  1) `npm ci` (postinstall runs `prisma generate`)
  2) `npm run ci:verify` (composite truth gate: check + build)
- Optional env lane (`.github/workflows/env-checks.yml`) provisions Postgres and runs:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npx prisma migrate status`
  - `npm run check:env`
  - `npm run test:db`
  - `prisma generate` is intentionally duplicated here to validate schema generation under a live database and migration context.

### Why CI Runs `npm run ci:verify`

- CI does not enumerate guardrails.
- CI runs one authority: `npm run ci:verify`.
- `check:guardrails` guarantees registry completeness, execution exclusivity, CI coverage, and ordering stability.
- `check` is the aggregate of guardrails + node correctness + UI correctness; env checks live in `check:env`.
- The last non-empty command in the CI job must be `npm run ci:verify`.

> If CI ever runs individual guardrail scripts directly, the system is broken.

### Ordering invariant
- Guardrails execute before env-specific correctness and build.
- Inside `check:node` and `check:next`, lint runs before typecheck and typecheck runs before tests.
- Build executes after `check` completes.

### Guardrails enforced
- ESLint rules must stay strict (`eslint.config.mjs`): Zod strictness, unsafe-any rules, strict-boolean-expressions, and JSON.parse bans.
- TypeScript strict flags in `tsconfig.json` must remain `true`.
- No new `eslint-disable` outside the allowlist captured in `check:guardrails-core`; fix the code instead of silencing rules.
- Package scripts (`lint`, `typecheck`, `test`, `check:guardrails`, etc.) must exist and keep their chaining.
- Guardrail files/tests must not be removed (offline evaluator, ingest, engine tests, Prisma assumptions).
- Guardrail 5 (implicit config): `process.env` access is confined to `app/api/**` and `scripts/**`; load env into typed config via `initConfigFromEnv` and thread it explicitly. `check:config` must pass without allowlists.
- Guardrail 6 (config immutability): server config is deep-frozen and locked after boundary load; `setServerConfig` rejects writes post-lock and loader registration fails once locked. `check:config-lock` must pass.
- `check:check-contract` enforces the `ci:verify` contract and keeps `check` pure.
- `check:ci-must-run-check` enforces the single CI entrypoint (`ci:verify`).
- `check:guardrails-core` exits non-zero on any deviation; CI treats that as a hard failure.

### Guardrail scope invariant
- Guardrails must be read-only.
- Guardrails must not mutate the repo, generate artifacts, or depend on network I/O.
- Guardrails may inspect files, configs, and scripts only.

### How to run locally

Run the npm scripts: `check:aggregate` (guardrails only), `check` (aggregate + node + next), `test` (tests only), `build`, or the full gate `ci:verify`.

### What CI green means (DB posture)
- Standard CI (`ci:verify`) does not exercise a live database; tests run with Prisma mocked.
- The env lane validates migrations, connectivity, and a minimal DB smoke test, but it is not a full integration suite.
- Treat DB correctness as a separate contract: run migrations locally and exercise DB paths explicitly when changing schema or persistence logic.

## Future/Target behavior

- TODO: Document CI changes when guardrail phases or environment requirements evolve.
- TODO: Add an integration lane that exercises critical DB flows with real migrations.

## Related docs
- `docs/guardrails.md`
- `docs/script-standards.md`
- `.github/workflows/ci.yml`
- `.github/workflows/env-checks.yml`

<!-- docs/core-loop-audit.md -->
Status: Deprecated
Last updated: 2026-01-02

# Cherry Core Loop Audit (Historical)

This audit reflects a point-in-time review from 2025 and is no longer authoritative. It is kept for historical context only.

## Current behavior
- Use `docs/cherry-core-loop-engine-vine-wallet-audit.md`, `docs/api.md`, and `docs/cherry-vision.md` for current, code-aligned behavior.

## Summary of historical scope
- Covered `/api/scan`, sessions/ledger, engine/buckets, Vine ingest, and Wallet pass scaffolding.
- Identified gaps around verification automation and Vine security that have since evolved.

## Future/Target behavior
- None. This document is archival.

## Related docs
- `docs/cherry-core-loop-engine-vine-wallet-audit.md`
- `docs/api.md`
- `docs/cherry-vision.md`

<!-- docs/daily-state.md -->
Status: Active
Last updated: 2026-01-03

# DailyState & Cron Contract

Purpose: Give Cherry a clock, memory, and a single, UI-agnostic truth object that summarizes spend safety per user per day. DailyState is descriptive only; it never authorizes, fronts, or mutates spend.

Aligns with: `docs/legal-constraints.md` (advisory-only), `docs/cherry-vision.md` (copilot, not a card), and the engine/bucket invariants in `lib/engine` and `lib/buckets-runtime.ts`.

---

## Current behavior (enforced / in code)
- Manual and batch endpoints exist: `POST /api/internal/run-daily` and `POST /api/internal/run-daily-all`.
- Both endpoints are gated by `CHERRY_DAILYSTATE_CRON_ENABLED=true` and require auth.
- Scheduling is external to the repo; no cron runner is bundled here.
- DailyState is advisory-only and does not mutate buckets, sessions, or ledger.

## Scope
- Headless kernel only. No UI surfaces or alerts in this spec.
- Reads buckets, cards, sessions, ledger, and ingest signals; writes only the DailyState table.
- Out of scope: wallet pass, Vine hardware changes, new payment rails, or any card authorization behavior.

---

## Trigger Contract (Time)
- Schedule: run once per user per UTC day (default at 00:15 UTC). Allow manual backfill via `POST /api/internal/run-daily` gated by `CHERRY_DAILYSTATE_CRON_ENABLED=true` and auth.
- Idempotency: `(userId, date)` is unique. Recomputes for the same day overwrite the row only on success.
- Batch: cron/worker pages through users to avoid timeouts; manual route accepts optional `{ userId?, date? }`.
- Fanout: internal nightly orchestrator (`POST /api/internal/run-daily-all`) pages through users in batches; errors are isolated per user.

---

## Data Model (Memory)
- `id` (cuid)
- `userId` (FK User)
- `date` (UTC date, unique with user)
- `status` enum: `SAFE | TIGHT | RISKY | INSUFFICIENT_DATA`
- `safeToSpendCents` (int, nullable when insufficient)
- `nextRiskEvent` (json/text; reason + eta; nullable)
- `summary` (json, small): `{ buckets: { remainingCents, exhaustedCategories: string[] }, pointsPending, sessionsPendingVerification }`
- `computedAt` (timestamp)
- `source` enum: `nightly | manual`
- `engineVersion` (string/hash)
- `inputsVersion` (hash of buckets/cards/objective weights snapshot)
- `errors` (text, nullable)
- Indexes: `(userId, date)` unique; `(userId, computedAt)` for latest fetch.

---

## Computation Semantics (Meaning)
- Inputs: fresh buckets via `ensureBucketFresh`/`toBucketRuntime`, cards + reward rules, objective weights, recent sessions/ledger (last 7–30 days), bank ingest rows if present, merchant observations. Time is captured at start of run.
### Time invariants
- A single `now` timestamp is captured at the start of each run.
- All bucket freshness, period checks, and anomaly aging are evaluated against this timestamp.
- No additional wall-clock reads are permitted during computation.
- Status mapping:
  - `SAFE`: essentials not exhausted; aggregate remaining above buffer; no blocking anomalies.
  - `TIGHT`: at least one essential bucket at/under buffer.
  - `RISKY`: multiple essentials exhausted or outstanding anomalies (e.g., aged pending verification).
  - `INSUFFICIENT_DATA`: no buckets/cards or engine failure.
- `safeToSpendCents`: min remaining across tracked buckets (essentials-weighted), clamped ≥ 0.
- `nextRiskEvent`: earliest expiry/reset or anomaly deadline (e.g., pending verification older than 24h).
- Read-only: no bucket/ledger/session mutation; no incentives; no auth decisions.

---

## Monotonicity (Stability Guardrail)
- Soft rule: A recompute that worsens status within the same day (e.g., SAFE → RISKY) must be justified by new external data (bank ingest, session verification, fresh anomalies) or resolution of a missing dependency. Absent such changes, recomputes should not degrade status to avoid flapping.

---

## Blind Spots (Explicitly Tolerated)
- Real-time card authorizations and delayed captures.
- Offline transactions or POS context not provided to Cherry.
- Merchant-initiated adjustments outside ingest scope.
- DailyState is best-effort safety, not real-time balance truth.

---

## Semantic Stability (Versioning)
- Changes that alter the meaning or thresholds of `SAFE | TIGHT | RISKY` must bump `engineVersion` and keep existing DailyState rows intact unless an explicit migration is run.
- `inputsVersion` captures the hashed inputs used for the run; consumers must not assume cross-version equivalence without checking `engineVersion`.

---

## Relationship to Authority
- DailyState is an **input signal** to `authority_v1`; it does not emit user-facing guidance.
- All advisories/warnings shown to users must flow through `simulateSpendAuthority` and the authority contract.
- DailyState status (SAFE/TIGHT/RISKY) informs authority severity but is not itself a verdict or enforcement surface.

---

## Failure Handling
- Per-user failure writes `status=INSUFFICIENT_DATA` with `errors` populated; no partial writes elsewhere.
- Engine or data errors log with structured context; retries happen on next scheduled run or manual trigger.
- No mutations to buckets/ledger/sessions on failure paths.
### Write atomicity
- DailyState rows are written atomically.
- On failure, existing rows for `(userId, date)` are preserved unchanged.
- No partial or degraded writes replace a successful prior computation.

---

## Observability
- Metrics: `daily_state_runs_total{status=ok|fail}`, `daily_state_duration_ms`, `daily_state_status_breakdown{status}`.
- Logs: structured per user with `engineVersion`, `inputsVersion`, anomaly counts, and failure reasons.
- Alerts: only on systemic failure rate thresholds; no user-facing alerts in this spec.

---

## Out of Scope (Explicit)
- UI/notification wiring.
- Bucket or ledger mutation beyond `ensureBucketFresh` reads.
- New verification sources or Vine/device changes.
- Wallet pass behavior (remains 501 until enabled per `docs/wallet-pass.md`).

## Future/Target behavior (explicitly speculative)
- Add a production scheduler or job runner that triggers `run-daily-all` nightly.
- Expand DailyState inputs once real bank ingest is available.

## Related docs
- `docs/authority-v1.md`
- `docs/legal-constraints.md`
- `docs/api.md`

<!-- docs/decision-event-ledger.md -->
Status: Active
Last updated: 2026-01-03

# DecisionEvent Ledger (authority replay log)

Purpose: Immutable audit trail of every authority_v1 evaluation. Drives replay, analytics, and learning; never mutates engine state.

## Current behavior (enforced / in code)
- `DecisionEvent` rows are written by `simulateSpendAuthority` when `ok: true`.
- The ledger is advisory-only and does not gate transactions or mutate buckets/ledger balances.

## Model
- Table: `DecisionEvent`
- Columns: `id`, `userId`, `surface`, `amountCents`, `category`, `verdict`, `reasonCode` (top), `reasonCodes` (array JSON), `severity`, `inputsVersion`, `counterfactuals` (JSON), `createdAt`.
- Write rule: `simulateSpendAuthority` writes exactly one row when authority returns `ok: true`; fallback/blocked results do not write; no dedup/retry; no updates.

## Why it matters
- Replay: reproduce “why was this warning shown?” using `inputsVersion` + reasons.
- Governance: measure rule fire rates, severity distribution, and surface-specific pressure.
- Learning: training substrate without touching money (advisory-only).
- Defensibility: clear lineage between inputs, verdicts, and user-facing guidance.

## Invariants
- Advisory-only: never used for authorization or spend control.
- Immutable: rows are append-only; no edits or deletes by authority code paths.
- Deterministic linkage: `inputsVersion` ties ledger entries to exact input snapshots; engine/version changes require bumps.
- Event identity: each call to `simulateSpendAuthority` that returns `ok: true` produces exactly one DecisionEvent. Identical inputs may produce multiple events if evaluated multiple times; the ledger does not deduplicate by content.
- Ordering: `createdAt` reflects wall-clock time at write. Ordering is best-effort and used for analysis only; replay correctness depends on `inputsVersion` and stored fields, not event order.

## Anti-patterns (forbidden)
- Using DecisionEvent to gate transactions or modify balances.
- Aggregating DecisionEvent with session/ledger mutations in the same transaction.
- Writing synthetic events from UI or client code.

## TODO — Phase 2: Ledger Safety & Replay Integrity

Status: Not started  
Prerequisite: Authority Phase 1 hardened in production-like usage

Goals:
- Prove DecisionEvent ledger is append-only and immutable.
- Guarantee exactly-once writes per authority evaluation.
- Ensure deterministic replay equivalence for all stored events.
- Enforce strict separation between ledger writes and engine state mutations.

Planned work:
- [ ] Add immutability guards (no update/delete paths; schema + code-level tests)
- [ ] Add exactly-once semantics tests (no duplicates, no drops)
- [ ] Add replay equivalence tests using replayAuthority (verdict, severity, reasons, inputsVersion)
- [ ] Add failure-isolation tests (ledger failures must not affect authority output)
- [ ] Add invariant tests preventing downstream reinterpretation of stored events

Explicitly out of scope:
- Analytics
- Aggregation
- UI
- Learning
- Any spend control or enforcement

## Future/Target behavior (explicitly speculative)
- Stronger immutability tests and replay integrity tooling for offline analysis.

## Related docs
- `docs/authority-v1.md`
- `docs/legal-constraints.md`
- `docs/api.md`

<!-- docs/dev-route-inventory.md -->
Status: Active
Last updated: 2026-01-03

# Dev Route Inventory

Policy: `(user)` routes are user-facing only; `(dev)` routes are dev console only and gated (middleware on `/dev/*` and `/api/dev/*`).
Invariant: Dev routes may read, simulate, and replay state; they must not mutate user-facing financial state (buckets, ledger, sessions) except via explicit admin tools guarded under `/admin`.

## Current behavior (enforced / in code)

### User-facing routes
- `/signin` — shared auth entry.
- `/app` and `/app/autopilot` — user shell surfaces.
- `/app/onboarding/*` — onboarding flows for buckets/cards/rules.
- `/buckets`, `/history` — user shell summaries.

### Dev-only routes
- `/dev` — dev console dashboard.
- `/dev/buckets`, `/dev/history`, `/dev/statements`, `/dev/statements/[statementId]`.
- `/dev/cards`, `/dev/cards/[cardId]`.
- `/dev/engine/inspector`, `/dev/engine/guardrails`.
- `/dev/ingest`, `/dev/bank`, `/dev/evaluator`, `/dev/activity`.
- `/scan`, `/simulate`, `/simulations`, `/simulations/[simulationId]`, `/sessions`, `/sessions/[id]`.
- `/scan` — advisory-only surface that is user-semantic but currently dev-gated. Promotion to user shell requires explicit product approval and copy review per `docs/cherry-vision.md`.
- `/activity` — engine/ledger activity timeline (dev-only surface).
- `/activity` is a legacy dev surface retained for compatibility; `/dev/activity` is the canonical inspector going forward.
- `/vine-simulator`, `/bank-simulator`, `/admin`.

## Future/Target behavior (explicitly speculative)
- Implement marketing routes under `app/(marketing)` and update this inventory once live.
- Decide on legacy aliases in `lib/routes.ts` and either implement or remove them.

## Related docs
- `docs/routes-map.md`
- `docs/information-architecture.md`
- `docs/shell-architecture.md`

<!-- docs/dev-ui-parity.md -->
Status: Active
Last updated: 2026-01-03

# Dev UI Parity

Cherry policy: no important backend behavior is allowed to exist without a Dev Console surface.
Invariant: Dev UI surfaces may read, simulate, replay, and diagnose backend behavior. They must not mutate user-facing financial state except through explicit admin tools.

### Backend behavior classification

For parity purposes, backend behavior falls into three classes:

1. **Inspectable (required Dev UI)**
   Deterministic, decision-making, or stateful systems whose correctness affects user outcomes (e.g., engine decisions, guardrails, ingest, authority).

2. **Operational (no Dev UI required)**
   Infrastructure-only concerns with no decision semantics (e.g., logging, metrics export, auth plumbing).

3. **Transitional**
   Temporary shims or legacy paths scheduled for removal; must either gain a Dev UI or be deleted within one release cycle.

This table tracks only Inspectable systems.

## Current behavior

| Backend feature ID | Description | Code location | Effect | Dev UI surface | Status |
|--------------------|-------------|---------------|--------|----------------|--------|
| ENGINE_DECISION_CORE | Core decision solver and ranking of EngineDecision[] | lib/engine/solver.ts | Determines which card/action Cherry recommends | /dev/engine/inspector | implemented |
| GUARDRAILS_CORE | Hard + soft guardrails for unsafe spend, delays, and runway breaches | lib/engine/guardrails.ts | Blocks unsafe actions before scoring + tags soft warnings | /dev/engine/guardrails | implemented |
| SESSIONS_LIFECYCLE | Recommendation sessions create/confirm/verify | app/api/sessions/* | Persists advisory sessions and point offers | /sessions | implemented |
| BANK_INGEST_PIPELINE | Bank ingest upsert pipeline and CSV dev ingest | lib/bank/ingest.ts | Normalizes external bank events into BankTransaction | /dev/ingest, /dev/bank, /bank-simulator | implemented |
| VINE_CONTEXT_PIPELINE | Vine BLE/NFC ingest + run recommendation shim | lib/vine/run-recommendation.ts | Translates Vine device payloads into recommendation sessions | /vine-simulator | implemented |
| BUCKET_RUNTIME_GUARDRAILS | Bucket runtime math and guardrails | lib/buckets-runtime.ts | Computes remaining/committed spend for guardrails | /dev/buckets | implemented |
| OFFLINE_EVALUATOR | Offline evaluator against historical spend | lib/evaluator/offline-history.ts | Scores historical spend snapshots for diagnostics | /dev/evaluator | implemented |
| INVARIANTS_AND_ASSUMPTIONS | Engine invariants + guardrail enforcement checks | lib/engine-invariants.ts, `check:guardrails-core` | Validates solver + session guardrails before deploy | /admin (Invariants panel) | implemented |

Script hook: `check:dev-ui-parity` logs the current implemented vs missing counts (non-blocking for now).
Blocking criteria (future):
- A new Inspectable backend feature without a declared Dev UI surface.
- Removal of a Dev UI surface while its backend feature remains active.
Note: `/sessions` is a dev-only surface despite not living under `/dev/*`; it is gated and treated as part of the Dev Console.

## Future/Target behavior

- TODO: Add parity coverage for new backend subsystems as they ship.

## Related docs
- `docs/dev-route-inventory.md`
- `docs/routes-map.md`
- `docs/ci-and-guardrails.md`

<!-- docs/engine-roadmap.md -->
Status: Draft
Last updated: 2026-01-03

# Engine Roadmap

## Current behavior
- Freeze status: ACTIVE
- There is no automated enforcement of an engine feature freeze; this is a policy note only.

## Engine Freeze Policy (policy)
Cherry is currently under an engine feature freeze.

The freeze lifts only when all of the following are true:
- Autopilot v1 is live at `/app`.
- History and buckets surfaces are refactored onto the Cherry design system.
- Recent Autopilot decisions are visible in a history/retention loop.

While the freeze is active:
- No new action types.
- No new guardrail classes.
- No new objective terms.
- No new engine-side decision dimensions.
- No semantic changes to existing actions, guardrails, or objective scoring behavior (renaming, reweighting, reinterpretation counts as a change).

Any exception must be added here as a dated bullet with a short justification.

## Freeze Authority & Exceptions

During the engine freeze:
- Any change touching engine action enums, guardrail classes, objective terms, or decision dimensions requires explicit review.
- Review authority: repo owner (or designated engine owner).
- Approval must include:
  - a dated exception entry in this document
  - a link to the PR
  - a one-line justification

## Future/Target behavior
- Add a CI guardrail that fails if:
  - `EngineActionType`
  - `GuardrailKind`
  - `ObjectiveTerm`
  - engine decision dimension enums
  change without a matching entry in this document.
- Enforcement location: `check:guardrails-core`.
- Mechanism: enum snapshot hashing or AST diff against allowlist.

## Related docs
- `docs/cherry-vision.md`
- `docs/guardrails.md`

<!-- docs/guardrails-status.md -->
Status: Draft
Last updated: 2026-01-03

# Guardrails Status

## Current behavior
- The authoritative guardrail inventory lives in `scripts/guardrails/registry.mts` and `docs/guardrails.md`.
- This document is a legacy snapshot and is not exhaustive; treat it as historical context only.

## Guardrail System Health (Human Summary)

- Total registered guardrails: 53 (from `scripts/guardrails/registry.mts`).
- Enforced in CI: 53 (via `ci:verify` → `check` → `check:guardrails`; coverage enforced by `check:ci-guardrail-coverage`).
- Partial / legacy-allowlisted: 3 (floating-point money math allowlist, idempotent writes coverage, determinism guardrail allows global fake timers).
- Known gaps:
  - Idempotent writes: session/ledger coverage incomplete.
  - Deterministic time: global fake timers not banned.
  - Floating-point money math: legacy allowlist remains for older paths.

## Regression Policy

- Guardrail enforcement may only move forward.
- A guardrail marked enforced in CI must never revert to partial or advisory.
- Any downgrade requires:
  - explicit entry in this document
  - PR link
  - justification

### Legacy snapshot (partial, not authoritative)

| Guardrail # | Name | Enforcement (eslint/script/test/ci) | Fixtures (pos/neg) | CI wired? | Status / Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Randomness ban in `lib/**` | script (`check:repo-guardrails`), tests, ci | neg only | yes | enforced in `lib/**` except `lib/adapters/runtime/**` |
| 2 | Sorting without comparator | script (`check:ordering`), tests, ci | neg only | yes | enforced via guardrail tests (no ESLint selector yet) |
| 3 | Floating-point money math | repo script, tests, ci | pos+neg | yes | enforced forward; legacy allowlist present |
| 4 | No silent defaults in core | eslint, repo script, tests, ci | pos+neg | yes | enforced |
| 5 | Exhaustive switches | eslint, ci | none | yes | enforced via ESLint `switch-exhaustiveness-check` |
| 6 | Engine purity (no side effects) | scripts (`check:engine-date`, `check:engine-prisma`), repo backstop, tests, ci | pos+neg | yes | enforced (no side effects; pure compute) |
| 7 | Engine must not import Prisma | script (`check:engine-prisma`), repo backstop, ci | neg only | yes | enforced |
| 8 | Idempotent writes | tests (`tests/idempotency*.test.*`), ci | neg only | yes | partial (session/ledger coverage pending) |
| 9 | Time-free tests | script (`check:determinism`), tests, ci | neg only | yes | partial (no global fake timers) |
| 10 | SSR/user-page runtime purity | script (`check:user-pages-runtime`), repo backstop, tests, ci | pos+neg | yes | enforced for `app/(user)` boundaries |
| 11 | Migration safety | repo script, tests, ci | pos+neg | yes | enforced |
| 12 | Policy totality | runtime assertion, tests, ci | pos+neg | yes | enforced (closed verdict set) |

### Legacy backstops / boundary guardrails (partial)

- Repo backstop: `check:repo-guardrails` (randomness/time/engine-prisma/engine-side-effects + boundary checks)
- Side-effects boundary: `check:side-effects` (allowlist-driven)
- Script module semantics: `check:script-semantics`
- Config/identity/entropy backstops: `check:config`, `check:identity`, `check:server-entropy`
- Registry closure: `check:guardrail-name-path-bijection`, `check:no-orphan-check-files`, `check:execution-registry-completeness`, `check:no-orphan-scripts`
- CI gate: `check:ci-must-run-check`
- Boundary layer commit reference is historical and not enforced today.

### Command Gate (historical)

- `check:repo-guardrails`: pass
- `lint`: pass
- `typecheck`: pass
- `test`: pass
- `build`: pass

## Future/Target behavior (explicitly speculative)

- TODO: Replace this file with a generated report sourced from the guardrail registry.

## Related docs
- `docs/guardrails.md`
- `docs/ci-and-guardrails.md`
- `scripts/guardrails/registry.mts`

<!-- docs/guardrails-todo.md -->
Status: Deprecated
Last updated: 2026-01-02

# Guardrails and Script Hygiene TODO (Historical)

This document captured a migration plan that has since been implemented in guardrails and script standards. It is kept for historical context only.

## Current behavior
- Guardrail and script hygiene rules are enforced via `scripts/guardrails/registry.mts` and documented in `docs/guardrails.md` and `docs/script-standards.md`.
- Guardrail helper exclusivity, script runner contracts, and registry completeness are enforced in CI.

## Historical plan (archived)
The sections below describe the original fixed-point migration plan. Use them only for context.

---

### Guardrails & Script Hygiene — Fixed-Point Migration (Archived)

#### Goal (archived)
Reach a fixed point where all checks pass with zero warnings and no allowlists.

#### Phases (archived)
- Make rules explicit for scripts and guardrails.
- Mechanically clean up script violations.
- Ensure guardrails obey guardrails.
- Lock the fixed point by enforcing CI entrypoints.

## Future/Target behavior
- None. This plan is complete and superseded by current guardrail docs.

## Related docs
- `docs/guardrails.md`
- `docs/script-standards.md`
- `docs/ci-and-guardrails.md`

<!-- docs/guardrails.md -->
Status: Active
Last updated: 2026-01-18

# Guardrails

## Current behavior
- Guardrail and execution script registration is mandatory; registries are the only authority.
- CI runs `npm run ci:verify` as the sole truth gate; `check` remains pure (guardrails + lint + typecheck), and env checks live in `check:env`.
- Script conventions (no raw JSON.parse, no any, .mts only under scripts) live in `docs/script-standards.md`.
- Guardrail checks now enforce JSON.parse bans in scripts and npm arg forwarding (`check:script-json-parse`, `check:npm-arg-forwarding`).
- DB truth scripts (`scripts/db-check-*`) must import PrismaClient directly and never use app-level Prisma helpers.
- Accounting invariants run as deterministic guardrails over `lib/accounting` and its property tests.
- Engine optimality guardrail runs bounded oracle tests via `check:engine-optimality`.
- Engine optimality versions are frozen by `check:engine-optimality-version`.
- Guardrail runner supports `--aggregate` shadow execution; it accepts guardrail names only (no per-guardrail args) and reports in registry order by default (`--sort=name` for alphabetical).

## Guardrail Numbering (Legacy)
- Guardrail numbers are legacy identifiers; they do not imply ordering, completeness, or priority.
- Use domain headings and guardrail names for references and reviews.

## Regression Policy
- No guardrail may be weakened or removed without:
  - an explicit doc change in this file
  - a justification section
  - a PR reference
- Guardrail checks may only move from advisory → enforced or partial → enforced.
- Downgrades are exceptional events and must be documented.

## Domain: Registry Integrity (Authoritative)

### Invariant A — Name ↔ Path Bijection

- Every guardrail has exactly one:
  - npm script: `check:<name>`
  - registry key: `check:<name>`
  - file path: `scripts/check-<name>.mts`
- Any deviation is a hard CI failure.
- Why: Inline strings allow silent drift. Drift creates false confidence in CI coverage. Guardrails must be mechanically provable, not inferred.
- Enforcement: `check:guardrail-name-path-bijection`, `check:guardrail-registry`, `check:no-orphan-check-files`.

### Invariant B — Registry Is the Source of Truth

- Guardrail paths must not be constructed ad hoc.
- All guardrail execution resolves via `scripts/guardrails/registry.mts`.
- Constants may be introduced only to strengthen invariants (e.g. `CATCH_UNKNOWN_PATH`).
- Enforcement: `check:guardrail-execution`, `check:execution-registry-completeness`.

### Invariant C — Guardrails Are Unaddressable by Path

- Guardrail scripts cannot be executed directly via `node`, `tsx`, `ts-node`, workflows, docs, or nested npm scripts.
- Guardrails are named capabilities, not files.
- Enforcement: `check:guardrail-execution`, CI fixtures covering bypass attempts.

## Domain: Config & Boundary Safety

### Guardrail 6 — Config Immutability

- Server config is constructed once at the boundary (app/api or scripts) and then deep-frozen; `lockServerConfig()` prevents any subsequent mutation or re-registration.
- `setServerConfig()` throws after lock even with `allowOverwrite`; loaders cannot be registered once locked.
- Public and runtime configs are also deep-frozen on set to block incidental mutation during a request/job.
- Boundaries should call `initConfigFromEnv()` (app/api routes, scripts, test bootstrap) before doing work; this sets the config and locks it by default outside tests.
- Tests may inject configs with `allowOverwrite: true, lock: false` before calling `lockServerConfig()` to mimic boundary assembly; no fallback-to-env is permitted after lock.
- Guardrail check: `check:config-lock` asserts locking, immutability, and loader rejection.

### Guardrail 44 — Config Snapshot Integrity

- `tsconfig.base.json` is the sole semantic authority; all other tsconfigs are view-only, CI aggregators, or fixtures.
- Fixture tsconfigs may diverge semantically and are excluded from enforcement.
- NodeNext usage is quarantined to script configs only.
- `docs/config-snapshot.md` must list every config file and match on-disk contents.
- `.js` import specifiers are disallowed in app/components/lib/tests; they are permitted only in scripts.
- `next.config.ts` must exclude `.next/cache/**`, `.next/export-detail.json`, `.next/lock`, `.next/server/proxy.js`, `.git/**`, `docs/**`, `scripts/**`, `tests/**`, `types/**`, and dev-only toolchains under `node_modules/` from output tracing to avoid non-export build failures and oversized serverless bundles.
- Enforcement: `check:config-snapshot`.

### Authority `inputsVersion` Stability

`inputsVersion` is deterministic for a fixed `(engineVersion, inputs, snapshot)`. It is not
guaranteed to remain stable across different `engineVersion` values. Consumers must not compare
`inputsVersion` values across engine versions.

## Domain: Environment Contracts

### Guardrail 46 — Environment Import Integrity

- Every source file is owned by exactly one environment (`env:node`, `env:next`, `env:guardrail`).
- `env:node` may not import `env:next`, `next/*`, `react`, or `react-dom`.
- `tests/node/**` may only import `env:node`; `tests/next/**` may only import `env:next` or `env:node`.
- Enforcement: `check:environment-import-integrity`.

## Domain: DB Truth Lane

### Guardrail 32 — DB Truth Boundary

- DB truth scripts (`scripts/db-check-*`) must not import `lib/prisma` or any app-level Prisma helper.
- DB truth scripts must instantiate `PrismaClient` directly from `@prisma/client`.
- Enforcement: `check:db-truth-boundary`.

### Guardrail 33 — DB Runner Exclusivity

- DB truth scripts must execute via `scripts/execution/run-db.mts`.
- `check:db:*`, `check:db-ready`, and `check:run-db-tests` must not use the standard execution runner.
- Enforcement: `check:db-runner-exclusivity`.

### Guardrail 34 — DB Constraint Coverage

- Any migration that adds a `UNIQUE`, `FOREIGN KEY`, `NOT NULL`, or `CHECK` constraint must include a
  `tests/db/constraints/*` test that references the constraint.
- Guardrail parses migrations for new constraints and fails if none of the `tests/db/constraints` tests
  reference the constraint identifier.
- Enforcement: `check:db-constraint-coverage`.

### Guardrail 35 — DB Truth Surface

- DB truth scripts and DB tests are limited to assertions about existence, impossibility, and conservation.
- DB truth must not assert preferred outcomes, performance, query shape, or business logic behaviors.
- Enforcement: policy guardrail; changes require explicit review.

### Guardrail 36 — DB Constraint Naming

- Migrations must use explicit names for `UNIQUE`, `FOREIGN KEY`, and `CHECK` constraints.
- Naming format: `{table}__{columns}__{type}` where type is `unique`, `fk`, or `check`.
- Constraint names must be unique across the schema.
- Forward-only enforcement for migrations with a timestamp prefix >= `20260113000000`.
- Enforcement: `check:db-constraint-naming`.

### Guardrail 37 — DB Semantic Suite Minimum

- The DB semantic suite must include baseline tests for idempotency, atomicity, ledger conservation,
  cross-row conservation, causality, semantic uniqueness, and temporal immutability.
- Required files:
  - `tests/db/semantics/idempotency-no-double-apply.test.ts`
  - `tests/db/semantics/atomicity-no-partial-writes.test.ts`
  - `tests/db/semantics/ledger-conservation.test.ts`
  - `tests/db/semantics/ledger-cross-row-conservation.test.ts`
  - `tests/db/semantics/status-causality.test.ts`
  - `tests/db/semantics/ledger-semantic-uniqueness.test.ts`
  - `tests/db/semantics/temporal-immutability.test.ts`
- Enforcement: `check:db-semantic-suite-minimum`.

### Guardrail 38 — DB Semantic ORM Agnosticism

- DB semantic tests must assert violations using SQLSTATE codes or constraint identifiers.
- ORM-specific error types or error codes are forbidden in `tests/db/semantics`.
- Do not branch on Prisma error classes, `error.code`, or vendor-specific error strings.
- Enforcement: `check:db-semantic-orm-agnostic`.

### Guardrail 39 — Ledger Write Entry Points

- Direct `CherryPointLedger` writes are allowed only in approved entrypoints.
- Approved entrypoints: persistence adapter, session confirm/verify flows, demo seeding, and admin clear routes.
- Enforcement: `check:db-ledger-entrypoints`.

## Domain: Accounting Integrity

### Guardrail 40 — Accounting Invariants

- Property-based accounting invariants must remain green under fixed and rotating seed sets.
- Enforcement: `check:accounting-invariants`.

### Guardrail 41 — Replay Equals Materialized

- Event replay must match the incrementally materialized ledger state.
- Enforcement: `check:replay-equals-materialized`.

### Guardrail 42 — Append-Only Ledger

- Accounting transactions are immutable; corrections are append-only.
- Enforcement: `check:no-mutation`.

### Guardrail 43 — DB Accounting Replay

- DB materialized balances must match in-memory replayed ledger balances.
- Enforcement: `check:db-accounting-replay`.

### Guardrail 44 — Accounting Proof Coverage

- Every accounting axiom must be covered by at least one artifact and marked FULL.
- Enforcement: `check:accounting-proof-coverage`.

### Guardrail 45 — Guardrail Execution Parity

- `check` and `check:aggregate` must execute the same guardrails in registry order; only failure handling may differ.
- Enforcement: `check:guardrail-execution-parity`.
- Prevents skipped, reordered, or ad hoc guardrail execution lists.

## Domain: Loader & Guardrail Event Integrity

### Guardrail 7 — ESM Loader Totality

- ESM loader hooks must be total: every branch returns a valid `{ format, source }` or delegates to `defaultLoad`.
- Loader hooks must never return `undefined` sources; prefer deterministic sentinel modules for tests.
- Sentinel paths are allowed only under `CHERRY_TEST_LOADER_SENTINEL=1` and must return valid modules.
- Guardrail checks: `check:loader-contract` and `tests/node/guardrails/esm-loader-contract.test.ts`.

### Guardrail 8 — Guardrail Event Totality

- Guardrail events must include `timestamp` and `timestampSource` (`boundary` | `client` | `engine`).
- API routes must emit `timestampSource: boundary`; client components must emit `timestampSource: client`.
- Guardrail checks: `check:guardrail-time` and `tests/node/guardrails/guardrail-event-totality.test.ts`.

### Guardrail 9 — Prisma Adapter Readiness

- Prisma-backed adapters must assert model availability before reads/writes.
- Missing models throw `AppError('INTERNAL', 'Missing Prisma model: <name>', 500)` deterministically.
- Guardrail tests: `tests/node/guardrails/prisma-adapter-totality.test.ts`.

### Guardrail 10 — Side-Effect Expiration

- `legacy-combo` allowlist entries require `expiresBy: YYYY-MM-DD`.
- CI fails when expired, removed, or increased.
- Guardrail checks: `check:side-effects:diff`.

## Domain: Engine & Authority Safety

### Guardrail 11 — Engine Boundary No-Throw

- Engine-facing APIs (`safeSolveDecisionForWorld`, `simulateSpendAuthority`) must never throw.
- Invalid inputs return structured outcomes, not exceptions.
- Guardrail tests: `tests/node/guardrails/engine-no-throw.test.ts`.

### Guardrail 12 — Boolean Totality

- No implicit truthiness checks on non-boolean values.
- Conditionals must compare explicitly (`===`, `!==`, `<`, `>`) or use typed helpers.
- Guardrail checks: `check:implicit-boolean` and `tests/node/guardrails/no-implicit-boolean.test.ts`.

### Guardrail 13 — Branded Policy Types

Certain strings carry semantic meaning and must be branded.

Examples:
- IsoDateString
- MoneyCents
- EngineVersion

Rules:
- Branded types may ONLY be created via constructors.
- No direct literals.
- No casting.
- Violations fail CI.

Rationale:
Silent misuse of policy metadata causes long-term system rot.

Guardrail checks: `check:branded-literal` and `tests/node/guardrails/branded-type-enforcement.test.ts`.

## Meta-Guardrails (Guardrail System Integrity)

These guardrails exist to ensure the guardrail system itself cannot drift, fork, or be bypassed.

### Guardrail 14 — Guardrail Self-Consistency

- Guardrail scripts (registry `check:*` entries) must obey all active guardrails.
- No implicit booleans, `any`, branded literals, wall-clock time, or unsafe casts in guardrail scripts.
- Guardrail checks: `check:guardrail-self` and `tests/node/guardrails/guardrail-self-consistency.test.ts`.

### Guardrail 17 — Execution Exclusivity

- Guardrail scripts may only be executed via the `check:guardrails` entrypoint.
- Direct references to guardrail script file paths are forbidden in package scripts, workflows, docs, and guardrail code.
- Guardrail scripts are unaddressable by path; they are named capabilities executed via `check:*`.
- Guardrail check: `check:guardrail-execution`.

### Guardrail 18 — Registry Drift Prevention

- Changes to `scripts/guardrails/registry.mts` must include an update to this doc.
- Guardrail check: `check:guardrail-doc-sync`.

### Guardrail 19 — Helper Exclusivity (Guardrail Minimalism)

- One failure API: `scripts/guardrails/lib/fail.mts`.
- One JSON API: `scripts/guardrails/lib/read-json.mts`.
- One import API: `scripts/guardrails/lib/import-typed.mts`.
- One subprocess API: `scripts/guardrails/lib/run-tool.mts`.
- Zero allowlists, zero parallel helper stacks.
- Guardrail check: `check:guardrail-helpers-exclusive`.

**Invariant — Helper Exclusivity**
All guardrail and script helpers must be imported exclusively from
`scripts/guardrails/lib/*`.
Any duplication is a hard CI failure.

### Guardrail 20 — Subprocess Totality

- Guardrail scripts must execute tools via `scripts/guardrails/lib/run-tool.mts`.
- Direct use of `child_process`, `spawn`, `exec`, or `execa` inside guardrail code is forbidden.
- Guardrail check: `check:guardrail-subprocess-totality`.

### Guardrail 21 — Name/Path Bijection
- Legacy identifier; canonical definition lives under “Invariant A — Name ↔ Path Bijection.”

- Guardrail names must map to canonical script filenames: `check:<name>` → `check-<name>.mts` with `:` normalized to `-` under `scripts/`.
- Guardrail check: `check:guardrail-name-path-bijection`.

### Guardrail 22 — CI Truth Entry Point

- CI must include a step that runs `npm run ci:verify`.
- The last non-empty command in the CI job must be `npm run ci:verify`.
- CI must not invoke other npm scripts directly; `ci:verify` is the only entrypoint.
- Guardrail checks: `check:ci-must-run-check`, `check:ci-guardrail-coverage`.

### Guardrail 23 — Execution Registry Completeness

- Non-guardrail scripts that reference `scripts/` must be registered in `scripts/execution/registry.mts`.
- Registry entries must exist on disk and be present in `package.json` with a runner invocation.
- Execution script files under `scripts/` must be registered or deleted (no allowlists).
- Guardrail checks: `check:execution-registry-completeness`, `check:no-orphan-scripts`.

### Guardrail 24 — Orphan Check Files

- Any `check-*` file under `scripts/` must be registered in the guardrail registry.
- Guardrail check: `check:no-orphan-check-files`.

### Guardrail 25 — ESM Loader Totality
- Legacy identifier; canonical definition lives under “Guardrail 7 — ESM Loader Totality.”

**ESM Loader Totality Invariant**
- Any custom Node ESM loader hook (`load`, `resolve`) must be structurally total: no implicit fallthrough, no bare `return`, no `undefined` returns.
- Sync hooks must not return Promises.
- Loader hooks must return a valid `{ source }` object or delegate to the provided default hook.
- Guardrails: `check:esm-loader-totality`, `check:prisma-mock-loader-totality`.

### Guardrail 26 — Tool Determinism

**Tool Determinism Invariant**
- External tools (`rg`, `git`, `node`) must be preflight-checked before guardrail execution.
- All external tools must be invoked exclusively via `scripts/guardrails/lib/run-tool.mts`.
- Missing tools are fatal and must fail with actionable output.
- Guardrail: `check:guardrail-subprocess-totality`.

### Guardrail 27 — Guardrail Execution Invariant

**Guardrail Execution Invariant**
- Guardrails must be pure, deterministic, and executable in CI without external dependencies.
- Runtime I/O (network, sockets, filesystem writes, database clients) is forbidden.
- Guardrail: `check:guardrail-no-runtime-io`.

## Domain: Tooling & Script Contracts

### Guardrail 28 — TS Project Coverage

- Every TS source file must be owned by exactly one tsconfig project.
- Orphans and overlaps are CI failures.
- Guardrail: `check:ts-coverage`.

### Guardrail 29 — Script Import Policy

- Node scripts must use runtime extensions (`.js`/`.mjs`/`.cjs`) and relative imports.
- TS extension specifiers and `@/` aliases are forbidden in scripts.
- Guardrails: `check:no-ts-extension-imports`, `check:no-script-alias-imports`.

### Guardrail 30 — ESM Import Extensions

- All relative import/export specifiers must include runtime extensions.
- Applies to app, components, lib, scripts, tests, and runtime configs.
- Guardrail: `check:esm-imports`.

### Guardrail 31 — Type-Only Import Enforcement

- Symbols referenced only in type positions must use `import type` or `import { type ... }`.
- Prevents runtime graph pollution and ensures explicit ESM boundaries.
- Guardrail: `check:type-only-imports`.

### Guardrail 32 — Check Contract

- `ci:verify` must run `check`, `test`, and `build` in order.
- `check` must remain pure (no env-dependent scripts).
- `test` and `build` must not invoke guardrails; use `test:strict` and `build:strict` when needed.
- Guardrail: `check:check-contract`.

### Guardrail 33 — Script Runner Contract

- Package scripts that invoke files under `scripts/` must go through `npm run ts:esm`.
- Direct `node`, `tsx`, or `ts-node` usage in script commands is forbidden.
- Guardrail: `check:script-runner-contract`.

## Future/Target behavior

- TODO: Expand guardrail coverage and tests as new risk areas are identified.

## Related docs
- `docs/ci-and-guardrails.md`
- `docs/script-standards.md`
- `scripts/guardrails/registry.mts`
- `scripts/guardrails/run.mts`

<!-- docs/home-ui-contract.md -->
Status: Active
Last updated: 2026-01-03

# Home UI Contract (Idle / Observe)

## Purpose
- Define the renderer contract for the Home (Idle / Observe) surface at `app/(user)/app/page.tsx`.
- Keep Home advisory-only and separate from Autopilot (Decide). No authority, no routing, no “best card”.
- Align with `AGENTS.md`, `docs/legal-constraints.md`, and UI specs here. Two orthogonal modes remain non-negotiable: Home = Idle/Observe, Autopilot = Decide (optional, intent-driven).

## Current behavior (enforced / in code)
- `getHomeUiBundle` in `lib/home/ui-bundle.ts` returns a stubbed, read-only `HomeUiBundle` scoped to the signed-in user; no derived logic lives in the component.
- `HomeScreen` renders the bundle verbatim: Cherry header + subtitle + mode/simulation badges, a “This month” hero with badge + primary metric + buffer bar + one-sentence explanation + plan definition, a single dominant CTA (`Plan a purchase`) that routes to Autopilot intent declaration, and read-only sections for Heads up, Buckets (top 3), Upcoming, and Recent DecisionEvents.
- Layout is a single vertical column with neutral background, radius 16–24px, spacing 8/12/16/24/32. Cherry red is accent-only; severity uses neutrals/amber/orange bands (no alarm red).
- Severity is advisory only (info / caution / risk). No approval/decline/authorization language is present on Home.

## Future/Target behavior
- Populate `HomeUiBundle` from engine-derived month state, buckets runtime helpers, upcoming obligations, and decision event history once wiring is available.
- Preserve the same contract and max lengths; keep Home read-only and authority-free even after engine wiring lands. Autopilot (Decide) stays opt-in and separate.

## Contract: `HomeUiBundle`
- `mode` — explicit authority and data scope
  - `label` (string) — headline mode label (e.g., “Mode: Advisory only”).
  - `detail` (string) — one sentence clarifying power (“will not block or move money”).
  - `simulationLabel` (string) — badge for simulation/read-only data.
  - `simulationDetail` (string) — scope of data/simulation caveat.
- `plan` — plan name and framing
  - `name` (string) — short plan name (e.g., “Essentials-first budget”).
  - `detail` (string) — plan summary in one sentence.
- `monthState` — hero card
  - `title` (string) — usually “This month”.
  - `badge` — `{ label: string; tone: 'stable' | 'tight' | 'risky' }`.
  - `primaryMetric` — `{ kind: 'pace' | 'essentials_buffer' | 'safe_to_spend'; label; value; helper }`.
  - `bufferBar` — `{ label: string; usedPercent: number; remainingLabel: string }` visualizes buffer usage; percent is bounded [0,100].
  - `explanation` (string) — one-sentence, engine-generated, neutral.
  - `planDefinition` (string) — explicit one-line plan/guardrail statement.
  - `cta` — `{ label; href }` secondary CTA inside the hero.
- `headsUp[]` (max 3) — `{ id; title; detail; severity: 'info' | 'caution' | 'risk' }`; no enforcement language.
- `bucketPreview[]` (max 3) — `{ id; name; remaining; usedPercent }`; progress bars only (severity-banded rendering).
- `upcoming[]` (max 3) — `{ id; name; dateLabel; amountLabel? }`.
- `recent[]` (max 3) — `{ id; title; detail; amountLabel; category }` reflecting DecisionEvents.
- `emptyStates` — strings for the empty variants of each panel.

### Rendering rules
- Render bundle values verbatim; do not invent copy, re-interpret severity/metrics, or inject authority language.
- Layout: single-column stack, neutral background, card radius 16–24px, spacing 8/12/16/24/32 scale. Keep advisory mode visually distinct from Autopilot/Decide with a single mode banner and neutral styling.
- Primary CTA is singular and dominant: `Plan a purchase` routes to Autopilot intent declaration. Copy reiterates “simulation only / opt-in Autopilot”.
- Home shows state only: Heads up (max 3), Buckets preview (top 3), Upcoming, Recent DecisionEvents. No “best card”, no purchase recommendations, no authority verbs.
- Forbidden on Home: “approve”, “decline”, “authorize”, “terminal”, “proxy”, “best card”, or any implication of payment routing. Cross-check with `docs/legal-constraints.md`.

### Explanation semantics (non-negotiable)
- Explanations may describe state only.
- Explanations must not:
  - suggest actions
  - imply causality (“if you do X”)
  - reference cards, merchants, or categories as choices
  - compare alternatives
- Allowed forms:
  - descriptive (“Essentials buffer is partially used”)
  - temporal (“Mid-month snapshot”)
  - factual (“Two essential buckets are near limit”)

### Primary metric interpretation
- Primary metrics communicate state, not permission.
- They must not be framed as allowances, approvals, recommendations, or limits enforced by Cherry.

## Guardrails & tests
- Contract and guardrails enforced by `tests/home-ui-contract.test.ts` and Home surface tests; they ensure the bundle is authority-free, honors max lengths, and keeps Autopilot gated behind intent declaration.
- If Home behavior changes, update this document, `lib/home/ui-bundle.ts`, and associated tests together.

## Related docs
- `docs/legal-constraints.md`
- `docs/cherry-vision.md`
- `docs/authority-v1.md`

<!-- docs/income-regimes.md -->
Status: Draft
Last updated: 2026-01-03

# Income regimes and bucket synthesis (offline evaluator)

## Current behavior (enforced / in code)
- Regime inference and bucket synthesis are dev-only and diagnostic.
- Writes are limited to offline evaluator tables; no live Buckets/Sessions/Ledger updates.

## What this covers
- Income/P2P classification heuristics for CSV dev data.
- Monthly income snapshots → regime segmentation (rolling median shifts).
- Regime-specific bucket template synthesis for offline evaluator metrics.
- Guardrails: dev-only, diagnostic, no writes to live Buckets/Sessions/Ledger.

## Classification
- Income kinds: PAYROLL, ALLOWANCE, SIDE_GIG, REFUND, INTERNAL_TRANSFER, OTHER, NONE.
- P2P kinds: P2P_ALLOWANCE, P2P_REPAYMENT_IN/OUT, P2P_PSEUDO_MERCHANT_IN/OUT, NONE.
- Heuristics: keyword + cadence based (weekly Zelle allowance, monthly pseudo-merchant barbers, repayment memos). Refunds and reimbursements are treated as negative spend for bucket stress.
- Dev-only persistence: `classifyIncomeAndP2PForUser(userId, { persist: true, sourceFilter: ['csv_dev'] })` writes `incomeKind`/`p2pKind` on `BankTransaction`. Production blocks persistence.

## Regime detection
- Built from monthly net earned income (`payroll + allowance + side gig + P2P_ALLOWANCE`).
- Uses 3-month rolling median; regime changes when median shifts by ~35% and span ≥2 months.
- If no stable median exists over ≥3 months, classify as UNSTABLE regime; UNSTABLE regimes produce buckets but are flagged and excluded from comparative metrics.
- Fixed costs inferred from recurring debits (monthly/weekly cadence) and capped at 90% of income. Free cash = income − fixed (can be negative for underwater regimes).
- Stored in `HistoricalIncomeRegime` with inclusive month range and averages.

## Bucket synthesis (regime-specific)
- Synthesizes buckets: fixed_obligations, essentials_groceries, essentials_transport, essentials_personal_care, discretionary_social, discretionary_shopping, savings_buffer.
- Splits free cash into bands (essentials 40–60%, discretionary 20–40%, savings remainder) with floors and caps total limits at ≤1.2× income. Fixed obligations use inferred recurring amount.
- These bands are evaluator heuristics chosen for diagnostic contrast, not behavioral optimality.
- `HistoricalBucketTemplate` stores monthly limits, avg spend, and target share bps; rebuilt per user per evaluator run.

## Offline evaluator integration
- `scripts/run-offline-evaluator-moustafa.mts` now: classify income/P2P → rebuild regimes/templates → replay transactions.
- `HistoricalEngineEvaluation` rows store `regimeId`, `bucketKey`, and bucket usage before/after (bps). Stats are computed on regime-aware buckets, not flat heuristics.
- `/dev/evaluator` is read-only and shows instructions when regimes/templates are missing; no writes on page render.
- Evaluator outputs are run-scoped and must not be reused as inputs to subsequent runs or other users.

## Guardrails
- Dev-only: gated by `NODE_ENV !== 'production'` in classification persistence and regime/template writes.
- Diagnostic only: do not use regime/bucket inference for credit or live engine decisions without legal review.
- Regime inference must not be used to tailor live recommendations, nudges, or incentives without explicit policy approval.
- No live writes: Buckets, CherryPointLedger, RecommendationSession stay untouched; only offline tables mutate.
- Be conservative with P2P: when ambiguous, treat as repayment/social spend, not income.

## Epistemic limits (non-negotiable)

Income regime inference is heuristic and lossy.

The system explicitly tolerates:
- misclassification of income vs P2P
- delayed recognition of regime changes
- false positives in recurring pattern detection

The system explicitly does NOT assume:
- completeness of income capture
- correctness of merchant labeling
- that inferred regimes represent user intent

## Future/Target behavior (explicitly speculative)
- Improve regime detection with provider-native payroll metadata when real ingest arrives.

## Related docs
- `docs/offline-evaluator.md`
- `docs/legal-constraints.md`

<!-- docs/information-architecture.md -->
Status: Active
Last updated: 2026-01-03

# Information Architecture

## Overview
Cherry’s surfaces are intentionally split into three buckets so marketing, product, and dev work do not collide. This file is the source of truth for what lives where and must stay aligned with `docs/cherry-vision.md`, `docs/legal-constraints.md`, `docs/repo-structure.md`, and `docs/routes-map.md`.

**Audit status:** As of 2026-01-03, routes under `app/` are grouped under `(user)` and `(dev)`; `(marketing)` has no implemented pages yet. `/signin` remains a shared auth entry.
**Owner meaning:** Intended reviewer/maintainer for that route group; use CODEOWNERS when present.

## Current behavior (in repo today)
- Routes live under `app/(user)` and `app/(dev)` groups with `/signin` at the root.
- Marketing surfaces are planned but not implemented yet.

## Surfaces

### Marketing (app/(marketing)/*)
- **Purpose:** Acquisition storytelling, proof-first hero, and CTA to sign in.
- **Example routes:** none implemented yet.
- **Owner:** Growth/Product.

### User App (app/(user)/*)
- **Purpose:** End-user advisory surfaces: Autopilot, spend history, buckets, and card context.
- **Example routes:** `/app`, `/app/autopilot`, `/buckets`, `/history`, and the shared auth entry at `/signin`.
- **Owner:** Product.

### Dev Console / Lab (app/(dev)/*)
- **Purpose:** Simulations, engine introspection, ingest tooling, and admin utilities that are never user-facing.
- **Example routes:** `/dev` (console home), `/scan`, `/simulate`, `/sessions` (+ `/sessions/[id]`), `/simulations` (+ `/simulations/[simulationId]`), `/activity`, `/dev/buckets`, `/dev/history`, `/dev/statements` (+ `/dev/statements/[statementId]`), `/dev/cards` (+ `/dev/cards/[cardId]`), `/dev/engine/inspector`, `/dev/engine/guardrails`, `/dev/ingest`, `/dev/bank`, `/dev/evaluator`, `/vine-simulator`, `/bank-simulator`, and `/admin`.
- **Owner:** Devtools/Infra.

## Grouping rule (authoritative)
- Any route under `app/(dev)` must be gated by dev middleware.
- Any route under `app/(user)` must not import dev-only modules or expose dev tooling.
- `app/(marketing)` must not import auth-required server actions.

## Forbidden patterns
- No dev/simulator/admin tools under `(user)` unless explicitly documented as user-facing.
- No user-facing consumer flows under `(dev)`; dev console routes remain gated and labeled as such.
- No marketing or growth surfaces inside `(dev)` or `(user)`.
- No new top-level surface segments outside `(marketing)`, `(user)`, or `(dev)` without updating this document and `docs/routes-map.md` first.

## Extending the IA
- Additions or major reshapes require updating this file and `docs/routes-map.md` before implementation.
- Place new routes under the correct group (`(marketing)`, `(user)`, `(dev)`) and update navigation components that link to them.
- Cross-check legal guardrails in `docs/legal-constraints.md` and product identity in `docs/cherry-vision.md` whenever surfaces change.

## Future/Target behavior (explicitly speculative)
- Implement marketing routes under `app/(marketing)` with a clear CTA to `/signin`.
- Decide on `/autopilot`, `/cards`, and legacy `/home/*` aliases and implement or remove them from `lib/routes.ts`.

## Related docs
- `docs/routes-map.md`
- `docs/repo-structure.md`
- `docs/cherry-vision.md`

<!-- docs/legal-constraints.md -->
Status: Active
Last updated: 2026-01-03

# Cherry Legal & Identity Constraints

This document consolidates the non-negotiable legal and product identity boundaries for Cherry, Cherry Vine, and the Cherry Wallet Pass. It governs every code path and doc.

If any behavior or copy conflicts with this file, fix the code/docs to comply—do not weaken these rules.

## Purpose
- Provide a single place to confirm what Cherry, Vine, and the Wallet Pass may and may not do.
- Keep Cherry firmly out of payment rails, issuing, and money movement.
- Give developers a checklist before shipping features that touch merchants, cards, or wallet surfaces.

## Current behavior (enforced / in code)
- Cherry is an advisory system: observe → evaluate → recommend → reward. It never authorizes, routes, or settles payments.
- Cherry Vine is a context beacon only; it never accepts taps/swipes/PINs or connects to payment networks.
- The Wallet pass is a storeCard-style advisory scaffold and stays gated at 501 until certs and the feature flag exist.
- Key payment-rail wording is guarded by CI checks where implemented.

## Interpretation rule
- In case of conflict, this document overrides all other product, UI, and engine docs.
- Ambiguous features must be scoped conservatively toward advisory-only behavior.

## Cherry Is Not (Forbidden Behaviors)
- Not a credit card, debit card, prepaid card, or “smart fronting” card.
- Not a proxy BIN, program manager, processor, issuer, gateway, or money transmitter.
- Does **not** route, authorize, or intermediate payments; never sits in front of real cards.
- Does **not** store or process PCI cardholder data (PAN, CVV, track data, EMV blobs, PIN).
- Does **not** speak EMV, ISO8583, or any network authorization protocol.
- Does **not** hold funds, escrow money, or affect settlement in any way.

## Cherry Vine Is Not
- Not a payment terminal, reader, or tap/swipe/PIN device.
- Does **not** accept cardholder input of any kind.
- Does **not** connect to card networks, processors, acquirers, or issuer hosts.
- Does **not** emit or consume EMV/ISO8583 or POS payment protocols.
- Is strictly a **context beacon**: merchant/store IDs, amount, timestamp, and optional order metadata only.

## Cherry Wallet Pass Constraints
- Pass type must remain `storeCard`-style loyalty/advisory; **never** a payment pass.
- Must not present UI that implies “pay with Cherry” or that Cherry fronts transactions.
- Endpoint `GET /api/wallet/cherry-pass` stays gated (501) unless `CHERRY_WALLET_PASS_ENABLED=true` **and** all Apple Wallet env vars/certs exist.

## Data Boundaries
- Allowed data: merchant/store identifiers, order totals, timestamps, MCC/category, anonymized analytics, card metadata such as nickname/issuer/network/last4, Cherry Points balances, advisory session tokens.
- Forbidden data: PAN, CVV, track data, PINs, issuer credentials, raw network payloads, cryptograms, host responses, and any personally identifiable cardholder data beyond permitted metadata.

## Developer Rules
- Any feature near payments must be checked against this doc before shipping.
- Any design that resembles fronting/issuing/routing must be rejected or clearly scoped as “future regulated product, not Cherry.”
- Keep advisory boundaries intact: observe → evaluate → recommend → reward. No authorization or money movement.
- Cross-reference `docs/cherry-vision.md`, `docs/cherry-vine.md`, and `docs/wallet-pass.md` whenever modifying engine, Vine ingest, or Wallet surfaces.

## Future/Target behavior (explicitly speculative)
- Any expansion toward regulated payment functionality is out of scope for Cherry and would require new legal documentation and a product fork.

## Related docs
- `docs/cherry-vision.md`
- `docs/cherry-vine.md`
- `docs/wallet-pass.md`
- `docs/ci-and-guardrails.md`

<!-- docs/marketing-hero-spec.md -->
Status: Draft
Last updated: 2026-01-03

# Cherry Marketing Hero Spec

## Current behavior
- No marketing page is implemented yet; `app/(marketing)` is empty. This document is a forward-looking spec only.

## Future/Target behavior (explicitly speculative)
- Swap the mock animation for a live Lottie/MP4 tied to real engine traces.
- Wire CTAs to the chosen growth funnel (sign-in, app deep link) once finalized.
- Validate the loss-range copy with data; trim or localize once confirmed.

## Advisory Constraint (Marketing)
- All copy must describe Cherry as advisory-only.
- Cherry does not act at the moment of payment, route transactions, or influence authorization.
- Phrases like “picks”, “selects”, or “every purchase” must be interpreted as advisory recommendations shown before or after spend, not during authorization.
- Marketing pages must not imply terminal-level integration, automatic routing, or payment control.

Forbidden in marketing:
- “authorize”
- “route”
- “at checkout”
- “while you pay”
- “automatic payment”
- “tap with Cherry”

---

## 1. Psychological Strategy (Retain, Convert, Reduce Friction)
1. **Instant Value Compression (≤ 7 words).** One-line utility, one-line mechanism, one-line proof.
2. **Zero-Ambiguity Call to Action.** A single red primary button (no dual CTAs).
3. **Social Proof Early.** Trust leads immediately.
4. **Loss Aversion First.** “Stop losing money on bad card usage.”
5. **Cognitive Ease.** White background, red/green accents, large whitespace, minimal copy.
6. **Authority Bias.** “Powered by autonomous scoring engine” (or equivalent).
7. **Temporal Proximity Bias.** “Try it in 10 seconds.”

---

## 2. Hero Section Blueprint
**Layout**
-----------------------------------------------------------
|  LOGO (Cherry glyph) top-left — minimal                |
|                                                       |
|  [LEFT COLUMN]                                        |
|   H1: 6–7 words max                                   |
|   Subhead: one-line mechanism                         |
|   Proof bar                                           |
|   Primary CTA                                         |
|                                                       |
|  [RIGHT COLUMN]                                       |
|   Animated card-oracle screen mockup                  |
-----------------------------------------------------------

**Content (use literally)**
- **H1:** **Spend smarter automatically.**
- **Subhead:** Cherry picks the right card for every purchase—instantly, with zero setup.
- **Proof Bar:** • Backed by a real scoring engine  • Used by power spenders  • Privacy-first architecture
- **CTA:** **Get Started — Free**
- **Microcopy:** “No credit card required. No bank changes.”

**Visuals**
1. Right-side animation: rotating carousel — merchant → Cherry selects the optimal card → projected reward saved.
2. Color: Red accent, green micro-highlights, white background.
3. Typography: Heavy grotesk for headline; mono/semi-mono for sub-lines.

---

## 3. Mid-Hero Reinforcement (Below-the-Fold Immediately)
### “Why Cherry Works”
Three-column strip:
1. Autopilot Intelligence — “Real-time scoring across your wallets, cards, and habits.”
2. Maximized Rewards — “Never waste 3% cash-back again.”
3. No Setup Required — “Open the app, make a purchase, Cherry handles the math.”

### Loss Aversion Slice
Banner:
> “You’re losing $200–$800 yearly by using the wrong card.”
> **“Cherry closes that gap automatically.”**

---

## 4. Social Proof & Safety
**Trust Band:** “Trusted by students, engineers, and frequent travelers.”

**Testimonials (≤12 words, relief-focused):**
- “I stopped guessing which card to use.”
- “Cherry saves me money every week.”
- “This replaced three apps.”

---

## 5. Product Explanation Block
### “How Cherry Works” (≤20 words total)
1. Scan or connect your cards.
2. Cherry builds a private, local spending model.
3. Every purchase: one clear recommendation.

---

## 6. Final Conversion Section
- **H2:** **Make every purchase the right one.**
- **CTA:** **Start Cherry — Free**
- Secondary link: “Learn how it works.”

---

## 7. UI Components / Tokens
1. Red `#D1193A` (primary).
2. Green `#0EA463` (success indicators).
3. White `#FFFFFF` (background).
4. Shadow-sm + rounded-xl cards.
5. Asymmetric grid layout mirroring Apple financial surfaces.
6. Glass/blur only for demo accents, not primaries.

---

## 8. Reference Patterns (Do not copy, use as cues)
- **RocketMoney:** Value-first headers, short text, clear CTA.
- **AwardWallet:** Immediate function communication; structured, not dense.
- **MaxRewards:** Hero animation shows product doing something; good for right-column demo.
- Cherry should blend RocketMoney brevity + MaxRewards demonstration + Apple-like hierarchy.

---

## 9. Engineering Deliverables
1. Implement `/app/(marketing)/page.tsx`.
2. Container width `max-w-7xl`, `py-24`.
3. Grid: `grid grid-cols-1 md:grid-cols-2 gap-12`.
4. Type scale: `text-5xl font-semibold tracking-tight` for H1; `text-lg text-slate-600` for subhead.
5. CTA: `<Button variant="primary" className="bg-cherry-red hover:bg-cherry-red/90">Get Started — Free</Button>`.
6. Right column: Lottie/MP4 mock of “Cherry choosing a card.”
7. Trust bar immediately under fold.
8. Sticky CTA for mobile.

---

## 10. Optional Extensions
- Exact Figma wireframes (textual spec).
- Tailwind + React code for full hero page.
- Copy variants for A/B tests.
- Psychological rationale per phrase.

---

## 11. Figma Wireframes (Text Spec)
### Frames
1. Desktop 1440×900, 12-column grid, margin 96px, gutter 24px.
2. Mobile 390×844, margin 16px, single-column.

### Desktop Layout — Sections
**Hero**
- Top bar: Cherry logo; right “Sign in” link.
- Main grid: left columns 1–6 (copy stack), right columns 7–12 (mock/animation).
- Copy stack: H1, subhead, proof bar (pills), CTA button, microcopy.
- Mock: off-white card frame showing merchant, cards, recommendation, yearly savings.

**Section 2: “Why Cherry Works”** — three cards (icon, heading, one-line body).

**Section 3: Loss Aversion Banner** — pale red band: loss statement + “Cherry closes that gap automatically.”

**Section 4: Social Proof** — micro-heading, trust band (students/engineers/travelers), testimonial cards (≤12 words).

**Section 5: “How Cherry Works”** — 3-step timeline (icon, heading, one sentence).

**Section 6: Final Conversion** — centered: H2, subtext, primary CTA, “Learn how it works” link.

### Mobile Rules
- Stacked sections; hero mock below copy.
- Proof bar stacks (no dot separators).
- Testimonials become full-width vertical cards.
- Loss banner becomes two-line block.

---

## 12. Tailwind + React Implementation (Hero Page)
Reference implementation lives in `/app/(marketing)/page.tsx` using Button + Card primitives, light background, red primary CTA, and card-selection mock with progress indicator and recommendation list. CTA microcopy: “No credit card required. No bank changes.”

---

## 13. Conversion Copy Variants (A/B Sets)
**Variant A (Baseline)** — H1 “Spend smarter automatically.” Subhead “Cherry picks the right card…” CTA “Get Started — Free” Microcopy “No credit card required. No bank changes.”

**Variant B (Loss-aversion)** — H1 “Stop wasting rewards on every swipe.” Subhead “Cherry catches the best card…” CTA “Stop Losing Money” Microcopy “Takes under a minute. You keep your existing banks.”

**Variant C (Speed + authority)** — H1 “A scoring engine for your wallet.” Subhead “Cherry runs the math…” CTA “Try the Engine Free” Microcopy “No spreadsheets. No setup. Just a decision.”

**Loss Banner Variants**
- A: “You’re losing $200–$800 yearly by using the wrong card. Cherry closes that gap automatically.”
- B: “Every wrong swipe throws away rewards. Cherry stops the leak.”

**Testimonial Set 2**
- “Cherry just tells me which card to tap.”
- “Feels like auto-pilot for my credit cards.”
- “I stopped opening five apps before I pay.”

---

## 14. Psychological Deep-Dive (Phrase-Level)
- **H1:** “Spend smarter automatically.” — anchors spending domain, promises competence + automation.
- **Subhead:** “Cherry picks the right card…” — unit of action (card choice), total coverage, speed, zero setup.
- **Proof Bar:** “Backed by a real scoring engine · Used by power spenders · Privacy-first architecture” — authority + aspirational identity + objection handling.
- **CTA:** “Get Started — Free” — low-commitment, no monetary risk.
- **Safety Microcopy:** “No credit card required. No bank changes.” — disarms charge/migration fears.
- **Loss Banner:** frames status quo as cost; Cherry repairs it automatically.
- **Testimonials:** relief- and simplicity-focused to match money-anxious users.
- **How It Works:** scan/connect → private local model → one recommendation; teaches loop without over-explaining.

## Related docs
- `docs/information-architecture.md`
- `docs/routes-map.md`
- `docs/cherry-vision.md`

<!-- docs/offline-evaluator.md -->
Status: Draft
Last updated: 2026-01-03

# Offline evaluator (historical replay)

## Current behavior (enforced / in code)
- Offline evaluator replays historical `BankTransaction` rows through the engine and stores `HistoricalEngineEvaluation`.
- Writes are limited to offline tables; no Sessions, Ledger, or Buckets are touched.
- Offline evaluator results are not consumed by any user-facing or authority surfaces.

## What it is
- Read-only replay of historical bank transactions through the Cherry engine to answer “What would Cherry have told past-Moustafa?”.
- Inputs: `BankTransaction` rows (today from `csv_dev` SafeBalance ingest; later from Plaid/Teller).
- Outputs: `HistoricalEngineEvaluation` rows storing the engine’s best decision and scores per transaction.
- No Sessions, no Ledger, no Buckets are touched.

## Data flow
1) Ingest historical data: `npm run dev:ingest:moustafa-bank` → `BankTransaction` (`source="csv_dev"`).  
2) Evaluate offline: `npm run dev:evaluator:moustafa` → `HistoricalEngineEvaluation` via `lib/evaluator/offline-history.ts`.  
3) Inspect: `/dev/evaluator` (dev-only) + `/dev/bank` + `/history` + `/dev/statements`.

Schema: `HistoricalEngineEvaluation` (`runId`, `bankTransactionId` unique; stores decisionType, cardId, bucketId, rawDecision, scores, createdAt).

### Income regimes & buckets (offline-only)
- `lib/income/classifier.ts` classifies income/P2P (payroll, allowance, refunds, internal transfers, pseudo-merchant Zelle/Venmo).  
- `lib/income/monthly.ts` builds monthly income snapshots and segments regimes when rolling median income shifts.  
- `lib/buckets/regimes.ts` synthesizes regime-specific bucket templates (essentials/discretionary/savings + fixed obligations) and caps totals to ≤1.2× income.  
- `scripts/run-offline-evaluator-moustafa.mts` now rebuilds regimes/templates before replaying history and records `regimeId`, `bucketKey`, and bucket usage (before/after, bps) on each `HistoricalEngineEvaluation`.

## Guardrails
- Evaluator uses `evaluateTransactionOffline` (engine only) and **never** creates Sessions, Ledger rows, or mutates Buckets.
- Skips non-spend and tiny transactions (< $1) and marks them `NO_DECISION_SKIPPED`.
- Runs in dev context; production callers should 404/disable dev pages.
- Writes only to `HistoricalEngineEvaluation`, `HistoricalIncomeRegime`, and `HistoricalBucketTemplate`; does not touch `RecommendationSession` or `CherryPointLedger`.
- `/dev/evaluator` stays read-only. If no regimes/templates exist, it shows instructions instead of auto-running the builder.
- Regime/bucket synthesis is dev-only (`NODE_ENV !== production`) and scoped to `source="csv_dev"` data.
- Prisma readiness is enforced via `assertOfflineEvaluatorModelsReady()`; if the Prisma client is stale or migrations are missing, the page throws a clear error with steps (`npx prisma migrate deploy && npx prisma generate` then restart dev server). The page is additionally gated by `CHERRY_OFFLINE_EVALUATOR_ENABLED` (default `true`; set to `false` to disable without touching Prisma).

## Income regimes and P2P interpretation
- Income kinds: PAYROLL, ALLOWANCE, SIDE_GIG, REFUND, INTERNAL_TRANSFER, OTHER.
- P2P kinds: P2P_ALLOWANCE, P2P_REPAYMENT_IN/OUT, P2P_PSEUDO_MERCHANT_IN/OUT.
- Rolling median income shifts (>~35%) create new regimes (min 2 months per regime). Fixed costs are inferred from recurring debits and capped at 90% of income; free cash = income − fixed.
- Bucket templates per regime split free cash into essentials, discretionary, and savings bands with guardrails and minimum floors; fixed obligations sit in their own bucket.

## How to run
npm run dev:ingest:moustafa-bank          # load SafeBalance CSV → BankTransaction
npm run dev:evaluator:moustafa            # offline engine replay → HistoricalEngineEvaluation
npm run dev                               # then open /dev/evaluator (and /dev/bank, /history, /dev/statements)

Env controls:
- `BANK_INGEST_USER_EMAIL` / `BANK_INGEST_USER_ID` — pick the target user (same as ingest script).
- `EVALUATOR_RUN_ID` — override run id; default is `defaultRunIdForUser(userId, now)`.

## Future/Target behavior (explicitly speculative)
- Swap `csv_dev` source for Plaid/Teller once live.
- Smarter categorization (MCC → RewardCategory) before calling the engine.
- Deeper metrics: bucket breach detection, actual card used vs. recommended, paycheck proximity.
- Batch/cron to refresh evaluations nightly with new data.
- Per-regime UI summaries in `/dev/evaluator` and a toggle to compare regimes side-by-side.

## What to do next (high-level)
1) Offline evaluator: for each historical transaction, run the engine as if scanned pre-swipe; store the decision + scores; browse in `/dev/evaluator`.
2) Metrics: measure how often Cherry would have blocked risky/budget-breaking spends, recommended a different card/bucket, or warned on high-pain transactions. This is the first “is Cherry worth it?” dataset before live bank links.
3) Regime-aware insights: stress and soft-intervention rates are now computed against synthesized, per-regime bucket templates to avoid flat 0%/100% artifacts.

## Dependency on ingest invariants
- BankTransaction rows must remain unique on `(userId, externalId)`; ingest must never set the primary `id`.
- Re-running ingest should update, not duplicate; unstable `externalId` values will corrupt evaluator metrics.

### Writer/Reader contract
- Evaluator scripts must target the same users that own ingested transactions (csv_dev/Plaid/Teller) and use a stable `runId` such as `defaultRunIdForUser(userId, now)`, where `now` is explicitly passed from the caller.
- `/dev/evaluator` derives `userId` from the signed-in user and defaults `runId` to `defaultRunIdForUser(userId, now)`, falling back to the latest run if empty (callers must provide a deterministic `now`).
- If you point evaluator scripts at a different user (via env/CLI), also sign in as that user to view results.

### Debugging an empty /dev/evaluator
- Check counts: `BankTransaction` with `source="csv_dev"` for the logged-in user vs. `HistoricalEngineEvaluation` rows for the same user.
- Ensure ingest (`npm run dev:ingest:moustafa-bank`) and evaluator (`npm run dev:evaluator:moustafa`) both use the same `BANK_INGEST_USER_*` identity.
- Use the debug footer on `/dev/evaluator` to see userId, counts, and latest runId.

### Hydration/SSR rules for dev console
- Keep outer wrappers stable between empty/data states; only change inner content (e.g., swap empty copy vs. table rows).
- Avoid non-deterministic JSX in server components (`Date.now()`, `Math.random()`, `typeof window` checks). Compute values on the server before render.
- Fetch evaluator data once on the server for initial render; client refetches should not change structural markup.

## Related docs
- `docs/income-regimes.md`
- `docs/bank-ingest-notes.md`
- `docs/legal-constraints.md`

<!-- docs/repo-structure-plan.md -->
Status: Deprecated
Last updated: 2026-01-02

# Repo Structure Plan (Historical)

This plan is superseded by `docs/repo-structure.md`.

## Current behavior
- Use `docs/repo-structure.md` as the canonical layout reference.

## Historical notes (archived)
- The previous plan tracked a layout snapshot and proposed moves; no moves are required now.

## Future/Target behavior
- None. This document is archival.

## Related docs
- `docs/repo-structure.md`
- `docs/ci-and-guardrails.md`

<!-- docs/repo-structure.md -->
Status: Active
Last updated: 2026-01-03

# Cherry Repository Structure

Use this as the source of truth for where things live and where new code should go. See `AGENTS.md` for operating rules and `docs/legal-constraints.md` for product guardrails.

## Current behavior (enforced / in code)
- App Router routes are grouped under `app/(dev)`, `app/(user)`, and `app/(marketing)` with API routes in `app/api`.
- The engine lives in `lib/engine.ts` and `lib/engine/*` with invariants in `lib/engine-invariants.ts`.
- Prisma is only instantiated in `lib/prisma.ts` and consumed by adapters and API routes.
- Scripts are kept under `scripts/` and executed via the `ts:esm` runner.

## Top-Level Overview (curated)
.
├─ app/              # Next.js App Router UI + API entrypoints
│  ├─ (dev)/(user)/(marketing)  # route groups for console, user app, and marketing
│  └─ api/           # REST-ish handlers (scan, sessions, vine, wallet, admin, etc.)
├─ components/       # Shared UI components (client/server as needed)
├─ lib/              # Shared domain logic (engine, validation, enums, vine, wallet, auth helpers)
├─ prisma/           # Database schema and migrations
├─ scripts/          # Source scripts (ingest, seed, audit)
├─ dist-scripts/     # Built script artifacts (keep generated outputs here)
├─ data/             # MCC and other ingest inputs
├─ docs/             # Product + technical docs (vision, vine, wallet, API, agents, audits, structure)
├─ public/           # Static assets served by Next.js
├─ types/            # Shared TypeScript types
├─ .github/          # GitHub meta (e.g., copilot instructions)
├─ Config files      # tsconfig*.json, eslint.config.mjs, next.config.ts, package*.json, postcss.config.mjs
└─ .vscode/          # Editor settings (optional)

## Directory Purposes, Do/Don’t

### app/
- **Purpose:** All UI routes and API route handlers (Next.js App Router). This is the entrypoint for Observe/Recommend surfaces and API boundaries.
- **Put here:** Route files (`page.tsx`, `layout.tsx`), server components, client components for route-specific UI, API `route.ts` handlers.
- **Do NOT put:** Heavy domain logic (belongs in `lib/`), scripts, Prisma client instantiation (use `@/lib/prisma`).

### components/
- **Purpose:** Reusable UI blocks shared across routes.
- **Put here:** Presentational components, shared client/server components that aren’t route-specific.
- **Do NOT put:** Business logic, API helpers, data access.

### lib/
- **Purpose:** Shared domain logic and helpers.
- **Put here:** Engine (`lib/engine.ts`, `lib/engine/*`, `lib/engine-invariants.ts`), enums, validation schemas, auth helpers (`with-user`, `auth`), vine helpers (`lib/vine/*`), wallet helpers (`lib/wallet/*`), points/verification helpers.
- **Do NOT put:** Route handlers, Prisma client instantiation outside `lib/prisma`.

### prisma/
- **Purpose:** Database schema/migrations.
- **Put here:** `schema.prisma`, migration folders, Prisma scripts under `prisma/scripts/` if needed.
- **Do NOT move:** `schema.prisma` out of this directory.

### scripts/
- **Purpose:** Source scripts for maintenance/ingest/seed/audit.
- **Put here:** TS/JS scripts run via npm scripts (e.g., ingest MCC, seed demo, audit integrity).
- **Do NOT put:** Built artifacts (those belong in `dist-scripts/`).

### dist-scripts/
- **Purpose:** Generated/build outputs for scripts.
- **Put here:** Compiled script artifacts if needed for deployment/runtime.
- **Do NOT edit** by hand; treat as build output.

### data/
- **Purpose:** Input datasets (e.g., MCC TSV/PDF/JSON).
- **Put here:** MCC sources and similar static inputs for ingest scripts.
- **Do NOT put:** Generated outputs (those go to `dist-scripts/` or `data/mcc` outputs as appropriate).

### docs/
- **Purpose:** Canonical documentation.
- **Contains:** Product identity (cherry-vision), hardware (cherry-vine), wallet pass, API reference, agent guidance, audits (core-loop-audit), repo structure/plan.
- **Do NOT put:** Code, migrations, or scripts.

### public/
- **Purpose:** Static assets served by Next.js.
- **Put here:** Images, icons, fonts, manifest files.
- **Do NOT put:** Sensitive data or server code.

### types/
- **Purpose:** Shared TypeScript declarations.
- **Put here:** Global types that don’t fit elsewhere.
- **Do NOT put:** Business logic or React components.

### .github/
- **Purpose:** GitHub-specific config (actions, copilot instructions).
- **Do NOT put:** App code.

### Config files
- **Purpose:** Tooling configuration (Next.js, TypeScript, ESLint, PostCSS, package scripts).
- **Do NOT duplicate** conflicting configs; update central ones when structure changes.

## Mapping to Cherry’s Product Model
- **Observe/Recommend surfaces:** `app/` (UI routes like `/scan`, `/vine-simulator`, APIs like `/api/scan`, `/api/vine/order`).
- **Evaluate (engine):** `lib/engine.ts` + invariants, enums, validation in `lib/schemas/*` and `lib/validation.ts` helpers.
- **Reward (sessions/ledger):** `app/api/sessions/*` entrypoints backed by `lib` helpers and Prisma models (`RecommendationSession`, `CherryPointLedger`).
- **Vine context:** `lib/vine/*`, `app/api/vine/order`, UI `/vine-simulator`.
- **Wallet pass scaffold:** `lib/wallet/*`, `app/api/wallet/cherry-pass`.
- **Data/model:** `prisma/` schema + migrations, seeded via `scripts/`.
- **Docs:** `docs/` contains identity, hardware, wallet, API, and audit references to align code with product constraints.

## Conventions for New Code
- Keep API route handlers thin; push logic into `lib/`.
- Use `@/lib/prisma` for DB access; no new Prisma clients elsewhere.
- Validate inputs with Zod schemas in `lib/schemas/*` (and `lib/validation/autopilot/*` for Autopilot).
- Place new scripts in `scripts/` (source) and build to `dist-scripts/` only if needed.
- Keep docs in `docs/`; add cross-links when adding new surfaces.
- Maintain Next.js App Router patterns (server-first; mark client components explicitly).
- Preserve public API paths unless intentionally versioned.
- Use `git mv` for any relocations to keep history, and update path aliases/imports accordingly.

## Future/Target behavior (explicitly speculative)
- Route groups may be reorganized as the dev console and user surfaces evolve; update this file alongside `docs/repo-structure-plan.md`.

## Related docs
- `AGENTS.md`
- `docs/repo-structure-plan.md`
- `docs/ci-and-guardrails.md`

<!-- docs/routes-map.md -->
Status: Active
Last updated: 2026-01-02

# Routes Map

Canonical map of key routes, aligned to `docs/information-architecture.md`. Current behavior is derived from App Router pages under `app/`.

## Current behavior (enforced / in code)

| Path | Surface | Purpose | Owner | Notes |
| --- | --- | --- | --- | --- |
| /signin | User | Auth entry for user + dev shells | Auth/Product | Shared sign-in at root; do not bypass NextAuth. |
| /app | User | User shell for advisory entry | Product | Primary user shell. |
| /app/onboarding | User | Onboarding hub | Product | Buckets/cards creation flows. |
| /app/onboarding/buckets/new | User | New bucket flow | Product |  |
| /app/onboarding/buckets/[bucketId]/edit | User | Edit bucket | Product |  |
| /app/onboarding/cards/new | User | New card flow | Product |  |
| /app/onboarding/cards/[cardId]/edit | User | Edit card | Product |  |
| /app/onboarding/cards/[cardId]/rules/new | User | New reward rule | Product |  |
| /app/onboarding/cards/[cardId]/rules/[ruleId]/edit | User | Edit reward rule | Product |  |
| /app/autopilot | User | Autopilot detail surface | Product | Lives under `/app`. |
| /buckets | User | Buckets overview | Product | User shell outside `/app`. |
| /history | User | Spend history timeline | Product |  |
| /dev | Dev | Dev console dashboard | Devtools/Infra | Dev-only shell, gated by middleware. |
| /dev/buckets | Dev | Buckets management with diagnostics | Devtools/Infra | Dev-only. |
| /dev/history | Dev | Spend history inspector | Devtools/Infra | Dev-only. |
| /dev/statements | Dev | Statement rollups | Devtools/Infra |  |
| /dev/statements/[statementId] | Dev | Statement detail | Devtools/Infra |  |
| /dev/cards | Dev | Card management and reward rules | Devtools/Infra |  |
| /dev/cards/[cardId] | Dev | Card detail and reward rules | Devtools/Infra |  |
| /dev/ingest | Dev | Ingest dashboard | Devtools/Infra | Dev-only. |
| /dev/bank | Dev | Bank ingest debug view | Devtools/Infra | Dev-only. |
| /dev/evaluator | Dev | Offline evaluator UI | Devtools/Infra | Dev-only; gated by env flag. |
| /dev/engine/inspector | Dev | Engine inspector | Devtools/Infra | Dev-only. |
| /dev/engine/guardrails | Dev | Engine guardrails view | Devtools/Infra | Dev-only. |
| /dev/activity | Dev | Unified activity inspector | Devtools/Infra | Dev-only. |
| /activity | Dev | Engine/ledger activity timeline | Devtools/Infra | Dev-only path outside `/dev`. |
| /scan | Dev | Manual advisory session runner | Devtools/Infra | Dev-only path outside `/dev`. |
| /simulate | Dev | Simulation runner | Devtools/Infra | Dev-only path outside `/dev`. |
| /simulations | Dev | Simulation history list | Devtools/Infra | Dev-only. |
| /simulations/[simulationId] | Dev | Simulation detail | Devtools/Infra | Dev-only. |
| /sessions | Dev | Recommendation sessions list | Devtools/Infra | Dev-only. |
| /sessions/[id] | Dev | Session detail with verdicts | Devtools/Infra | Dev-only. |
| /vine-simulator | Dev | Vine context simulator | Devtools/Infra | Hardware mock; dev-only. |
| /bank-simulator | Dev | Bank/Plaid simulator | Devtools/Infra | Dev-only ingest helper. |
| /admin | Dev | Admin and tooling | Devtools/Infra | Dev-only resets/seeds. |

## Future/Target behavior (explicitly speculative)
- `lib/routes.ts` declares marketing and legacy paths (`/`, `/autopilot`, `/cards`, `/home/*`) that are not implemented as pages; add real routes or adjust constants when those surfaces land.
- Marketing and public landing pages live under `app/(marketing)` when implemented.

## Related docs
- `docs/information-architecture.md`
- `docs/repo-structure.md`
- `docs/api.md`
- `lib/routes.ts`

<!-- docs/script-standards.md -->
Status: Active
Last updated: 2026-01-02

# Script Standards

## Current behavior
- Scripts are ESM by extension; `.mts` only lives under `scripts/`, runtime code stays `.ts`.
- Guardrail entrypoints are registered in `scripts/guardrails/registry.mts` and must be reachable from `npm run check`.
- Execution entrypoints are registered in `scripts/execution/registry.mts` and run via `npm run ts:esm -- scripts/execution/run.mts <name>`.
- CI must run `npm run ci:verify` and it must be the final non-empty command in the job.
- JSON inputs must be parsed via `scripts/guardrails/lib/read-json.mts`; raw `JSON.parse` is forbidden outside that helper.
- NPM script args must be forwarded with `--` (use `npm run <script> -- <args>`).
- `any` is forbidden in scripts; use `unknown` plus explicit schema/type guards.
- `catch` params must be typed as `unknown` and normalized before use.
- Orphan scripts are forbidden; register or delete them.
- Package scripts that invoke `scripts/` files must use the `ts:esm` wrapper; direct `node`, `tsx`, or `ts-node` invocations are forbidden.
- Node scripts must use runtime extensions (`.js`/`.mjs`/`.cjs`) and avoid `@/` aliases.
- `.tmp/` is reserved for local tooling outputs and ignored by checks; never commit it.

## Future/Target behavior
- TODO: Keep execution and guardrail registries fully derivable from documented standards.

## Related docs
- `docs/guardrails.md`
- `docs/ci-and-guardrails.md`
- `scripts/execution/registry.mts`
- `scripts/guardrails/registry.mts`

<!-- docs/shell-architecture.md -->
Status: Active
Last updated: 2026-01-02

# Shell Architecture

Cherry runs two thin shells on one headless core.

## Current behavior (enforced / in code)

### Headless core (shared)
- `lib/engine/*`, `lib/services/*`, `lib/user-context.ts`, `lib/buckets/*`, `lib/verification/*`.
- Business logic, ingest, guardrails, and solver live here. No React in these modules.

### User shell
- Routes: `app/(user)/**` (`/app`, `/buckets`, `/history`).
- Allowed imports: shared UI (`components/ui/*`), headless services in `lib/**`.
- Forbidden: importing from `app/(dev)/**` or embedding business logic in components.

### Dev shell
- Routes: `app/(dev)/dev/**` (e.g., `/dev`, `/dev/buckets`, `/dev/engine/inspector`, `/dev/ingest`).
- Allowed imports: shared UI + headless services; may use dev-only helpers.
- Forbidden: importing from `app/(user)/**`.
- Access is gated by middleware; disabled in production unless `CHERRY_DEV_SHELL_ENABLED=true`.

### Enforcement
- Proxy (`proxy.ts`) gates `/dev` and `/api/dev/*`.
- Scripts:
  - `check:dev-ui-parity` — all backend features must have a dev surface.
  - `check:shell-boundaries` — blocks `(user) ↔ (dev)` imports.
  - `check:guardrails` — guardrail config sanity.
- CI (`test`) runs parity, shell-boundary, and guardrail checks alongside tests.

### Rules
- No business logic in React components; keep it in `lib/**`.
- User shell never imports dev shell; dev shell never imports user shell.
- Dev shell must remain behind the middleware gate in prod.

## Future/Target behavior

- TODO: Extend shell enforcement when new route groups or shells are introduced.

## Related docs
- `docs/repo-structure.md`
- `docs/routes-map.md`
- `docs/ci-and-guardrails.md`

<!-- docs/signin-tasks.md -->
Status: Active
Last updated: 2026-01-02

# Sign-in Page Tasks (Cherry)

`/signin` is live with split layout and credential + Google flows, but still needs polish and recovery flows. Auth stack: NextAuth (PrismaAdapter) in `app/api/auth/[...nextauth]/route.ts`; UI in `app/signin/page.tsx` and `app/signin/signin-card.tsx`; clients handle `401` by calling `signIn()` from `next-auth/react`.

## Current behavior (enforced / in code)
- `/signin` exists with credential + Google flows and links to `/signup` and `/forgot-password` (routes are stubs).
- Client auth errors are mapped to friendly messages; UI has show/hide and loading states.

## Completed
- Custom `/signin` page with split marketing/auth layout and pseudo-dashboard illustration.
- Error query params mapped to friendly messages; inline validation for empty fields.
- Credentials + Google buttons wired; mobile layout clean; links for `/signup` and `/forgot-password` are present (routes still stubs).
- Password show/hide toggle and loading state on submit.

## Future/Target behavior
Next tasks (sequential):
1. **Recovery flows**
   - Implement a real `/forgot-password` placeholder (even if it just states email reset is not yet available).
   - Wire password reset once a provider supports it, or hide the link if unsupported.
2. **Signup clarity**
   - Add a “Create account” path (if allowed) or explicitly state “Use Google to continue” if invite-only; hide `/signup` link otherwise.
3. **Branding polish**
   - Provider-specific icons/labels; ensure accessible focus/hover states and subtle animations.
4. **401 UX**
   - Audit client fetch calls (cards/buckets/simulations/sessions) to ensure `401` triggers `signIn()` or a CTA, not a silent failure.
5. **Copy alignment**
   - Reinforce Cherry’s identity (spending copilot, not a card) and link to docs/legal constraints if shown to users.

## Related docs
- `docs/architecture/auth.md`
- `AGENTS.md`

<!-- docs/system-overview.md -->
Status: Active
Last updated: 2026-01-03

# Cherry System Overview

## Intent

This document is a descriptive system overview.
It does not define product identity, legal scope, or future commitments.
When conflicts arise, defer to the referenced ground-truth documents.

Ground truth for product identity remains in:
- `docs/cherry-vision.md` (copilot, not a card)
- `docs/legal-constraints.md` (hard legal guardrails)
- `docs/cherry-vine.md` (context beacon)
- `docs/wallet-pass.md` (storeCard scaffold, 501 until certs)
- `docs/api.md` (endpoint contract, `/api/scan` advisory)

This file summarizes where those concepts live in code today and highlights gaps.

---

## Current behavior (enforced / in code)

### Core Loop Mapping (Observe → Evaluate → Recommend → Reward)
- **Observe**
  - Manual inputs: `/scan` dev UI (`app/(dev)/scan/ScanClient.tsx`) posts to `/api/scan` for advisory preview and can create sessions via `/api/sessions`.
  - Advisory-only: `/api/scan` in `app/api/scan/route.ts` runs the engine, allows `expectedAmountCents = 0`, and logs `DecisionEvent` telemetry but does not create sessions or ledger rows.
  - Context ingest: `/api/vine/order` (dev-only) accepts Vine terminal payloads or `OrderContext`, enforces freshness (~3 minutes), creates sessions, and logs authority decisions; simulator UI at `/vine-simulator`.
- **Evaluate**
  - Canonical engine: `lib/engine.ts` (+ invariants in `lib/engine-invariants.ts`), MCC-aware via `resolveCategory`; buckets are rolled in-memory and normalized via `lib/buckets-runtime.ts` before verdicts.
  - Zod schemas ensure typed inputs (`lib/schemas/*` + `parseJsonBody` in `lib/validation.ts`).
- **Recommend**
  - Decisions flow back to clients (`ScanClient`, Vine simulator) with bucket/card verdicts and Cherry incentive offers; `RecommendationSession` stores verdicts, coverageMode, orderToken, expiry.
- **Reward**
  - Claim: `/api/sessions/[id]/confirm` writes `CherryPointLedger` rows (PENDING), flags anomalies, freshens buckets via `ensureBucketFresh`, and increments `spentCents` once per session.
  - Verification: `/api/sessions/[id]/verify` flips ledger to POSTED/REVOKED (simulated today); stubs live in `lib/verification/*`.

---

## Data Model Snapshot (Prisma)
- `Bucket`: budgets per RewardCategory (`budgetAmount`, `spentCents`, `strictMode`, `periodStart/End`, legacy `currentAmount`); runtime balances (`committedCents`, `remainingCents`) come from `lib/buckets-runtime.ts`.
- `Card` + `RewardRule`: user cards and category multipliers.
- `RecommendationSession`: persisted recommendation (merchant/mcc/category/amount, verdicts, coverageMode, offered points, expiry, anomalies, orderToken/device/store/terminal IDs).
- `CherryPointLedger`: points movements (PENDING/POSTED/REVOKED) tied to sessions; anomalies recorded.
- `SimulatedTransaction`: sandbox simulations (do not represent verified spend).
- MCC mapping: `MerchantCategory`, `MccToRewardCategory`.
- Auth tables: NextAuth standard models.

---

## Current Strengths
- Single engine path (`lib/engine.ts`) used by `/api/scan`, `/api/sessions`, `/api/vine/order`; bucket rollover applied in memory for verdict accuracy.
- Session + ledger lifecycle exists with anomaly handling, verification stubs, and bucket spend increment on confirm.
- Dev tooling: Vine simulator UI, admin clear/seed endpoints, MCC ingest script, integrity audit script.
- UI surfaces: Manual Lookup & Rewards (`/scan`), Sessions list (`/sessions`), Vine simulator (`/vine-simulator`), Admin panel (`/admin`).
- Shared simulations history UI: `/simulate` and `/simulations` render `SimulationHistoryList` (`components/simulations/simulation-history-list.tsx`) with the dark-glass `EmptyStateCard`; extend it by mapping new fields into the `SimulationHistoryItem` shape (title/subtitle/status/meta/body/footer).

---

## Known Gaps / TODOs
- Multiple buckets per category are not prioritized beyond first-created; bucket selection remains naive.
- Vine ingest lacks HMAC/nonce verification and cleanup of expired order tokens (dev-only).
- Wallet pass remains gated; keep 501 until certs are provided and feature flag is on.
- Auto-verification is stubbed; future bank/receipt/Vine correlation should move ledger from PENDING → POSTED without manual calls.
 - Bucket cadence is confirm-only (plus optional Autopilot simulated commits); there is no per-transaction bucket ledger or reconciliation sweep.

---

## Next Focus Areas
1) **Bucket integrity**
   - Decide on bucket ledger semantics and multiple-bucket selection rules.
   - Keep `lib/buckets-runtime.ts` as the single source of truth for balances; ensure any legacy `currentAmount` mirrors derived remaining only.
   - Add tests for rollover, strict-mode overspend, and confirm-time spend increments.
2) **Vine hardening**
   - Add HMAC/nonce validation and token cleanup; keep freshness window documented.
   - Expose `expiresAt`/`orderToken` in simulator UI for clarity if needed.
3) **Verification loop**
   - Flesh out `autoVerifySession` to call `/api/sessions/[id]/verify` based on bank/receipt/Vine signals.
   - Ensure ledger/session anomalies are auditable via scripts or activity feed.
4) **Docs and guardrails**
   - Keep Wallet pass 501 messaging prominent; cross-link identity/legal docs from UI where surfaced.
   - Maintain API docs when shapes change and run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` after changes.

## Future/Target behavior (explicitly speculative)
- Automated verification from bank/receipt sources with background workers.
- Signed Vine payloads and device lifecycle enforcement.
- Bucket ledger for per-transaction accounting and reconciliation.

---

## References
- Identity: `docs/cherry-vision.md`
- Legal constraints: `docs/legal-constraints.md`
- Hardware: `docs/cherry-vine.md`
- Wallet: `docs/wallet-pass.md`
- API contract (including `/api/scan`): `docs/api.md`
- Agent ops: `AGENTS.md`, `.github/copilot-instructions.md`

## Documentation index (all markdown, non-fixture)

### Root docs
- `README.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `AUDIT.md`
- `DOC_REWRITE_TASK.md` (temporary)
- `.github/copilot-instructions.md`
- `.github/pull_request_template.md`
- `types/compat/README.md`

### Product identity and legal
- `docs/cherry-vision.md`
- `docs/legal-constraints.md`
- `docs/cherry-vine.md`
- `docs/wallet-pass.md`

### API, routes, and shells
- `docs/api.md`
- `docs/routes-map.md`
- `docs/information-architecture.md`
- `docs/dev-route-inventory.md`
- `docs/dev-ui-parity.md`
- `docs/shell-architecture.md`
- `docs/repo-structure.md`
- `docs/repo-structure-plan.md` (deprecated)

### Engine, authority, buckets
- `docs/authority-v1.md`
- `docs/authority-ui-contract.md`
- `docs/decision-event-ledger.md`
- `docs/buckets-rollover-plan.md`
- `docs/engine-roadmap.md`
- `docs/adapters.md`
- `docs/daily-state.md`

### Autopilot and UI contracts
- `docs/autopilot-master-spec.md`
- `docs/autopilot-engine-adapter.md`
- `docs/autopilot-integration-summary.md`
- `docs/home-ui-contract.md`
- `docs/signin-tasks.md`

### Verification, ingest, evaluator
- `docs/verification-flow.md`
- `docs/bank-ingest-notes.md`
- `docs/offline-evaluator.md`
- `docs/income-regimes.md`

### Guardrails, CI, scripts, linting
- `docs/ci-and-guardrails.md`
- `docs/guardrails.md`
- `docs/guardrails-status.md`
- `docs/guardrails-todo.md` (deprecated)
- `docs/script-standards.md`
- `docs/zod-style.md`
- `docs/audit-format.md`

### Architecture notes
- `docs/architecture/auth.md`
- `docs/architecture/typed-eslint-postmortem.md` (deprecated)
- `docs/architecture/compat-shims.md`

### Audits, plans, and drafts
- `docs/cherry-core-loop-engine-vine-wallet-audit.md`
- `docs/core-loop-audit.md` (deprecated)
- `docs/agent-run-summary.md` (deprecated)
- `docs/marketing-hero-spec.md` (draft)

## Related docs
- `AGENTS.md`
- `docs/ci-and-guardrails.md`

<!-- docs/verification-flow.md -->
Status: Draft
Last updated: 2026-01-02

# Verification flow

This document describes how sessions and ledger rows are verified today and where future automation should land.

## Current behavior (enforced / in code)

## Source of truth
- Sessions are created via `/api/sessions` or `/api/vine/order` and write `RecommendationSession` + `CherryPointLedger` (PENDING).
- Bank ingest populates `BankTransaction` rows (see `docs/bank-ingest-notes.md`) but does not mutate ledger/buckets directly.
- Verification advances sessions/ledger using `lib/verification/verify-session.ts`.

## Verification inputs
- `VerificationSignal` (`lib/verification/types.ts`):
  - `sessionId`, `userId` (required)
  - Optional: `amountCents`, `occurredAt`, `merchantFingerprint`, `verified` override
  - `source`: `"BANK" | "VINE" | "MANUAL"`

## Matching rules (verifySessionFromSignal)
- Loads session by `sessionId`/`userId`; finalized sessions short-circuit.
- Infers match when all true:
  - Amount within `max(100¢, 5%)` of `confirmedAmountCents ?? amountCents`.
  - Timestamp within 24h of session `createdAt`.
  - Merchant fingerprints equal when both provided.
- `verified` flag in the signal overrides the inference.

## Outcomes
- Match/verified: `RecommendationSession.status = VERIFIED`, `verificationStatus = VERIFIED`, ledger `PENDING → POSTED`, timestamps set, anomalies preserved.
- Mismatch/unverified: `status = REJECTED`, `verificationStatus = FAILED`, ledger `PENDING → REVOKED`, anomaly becomes `VERIFICATION_CONFLICT` when previously `NONE`.
- Bucket reversal: if unverified and bucket spend not yet reversed, `computeBucketReversal` rolls back `spentCents` (after `ensureBucketFresh`).

## Entry points
- Manual API: `/api/sessions/[id]/verify` now delegates to `verifySessionFromSignal` using the request body `{ verified: boolean }`.
- Dev trigger: `/api/dev/verification/trigger` accepts `sessionId`, optional `amountCents`, `merchantFingerprint`, `verified`.
- Bank ingest: currently does not auto-trigger verification; hook by queuing signals and calling `verifySessionFromSignal` in a worker/cron.

## Future/Target behavior (explicitly speculative)
- Automated signal ingestion from bank/receipt/Vine sources with background verification workers.
- Stronger merchant fingerprinting and receipt matching before posting ledger rows.

## Related docs
- `docs/bank-ingest-notes.md`
- `docs/legal-constraints.md`
- `docs/api.md`

<!-- docs/wallet-pass.md -->
Status: Active
Last updated: 2026-01-02

# Cherry Wallet Pass (Apple Wallet)

Refer to `docs/legal-constraints.md` for hard guardrails. The pass is loyalty/advisory only, never a payment instrument.

## Current behavior (enforced / in code)
- `GET /api/wallet/cherry-pass` returns 501 unless the feature flag is enabled and all Apple Wallet env vars are present.
- When gated, no filesystem or cert access occurs.
- When fully configured, a `storeCard` `.pkpass` is generated via `lib/wallet/cherryPass.ts`.

## Status and Positioning
- **Feature type:** Non-payment `storeCard` loyalty trigger (not a payment card, not a proxy BIN).
- **Current state:** Scaffolded only. `/api/wallet/cherry-pass` returns **501 Not Implemented** unless an explicit feature flag is enabled **and** all Apple Wallet env vars are present. By default, no filesystem or cert access occurs.
- **Role:** Triggers the “Manual Lookup & Rewards” flow; never fronts transactions or touches payment rails.

## Runtime Behavior (`GET /api/wallet/cherry-pass`)
- Requires authenticated user.
- Gating:
  - Feature flag: `CHERRY_WALLET_PASS_ENABLED` must equal `true`.
  - Required env vars:
    APPLE_WALLET_TEAM_ID=...
    APPLE_WALLET_PASS_TYPE_ID=pass.com.cherry.pass
    APPLE_WALLET_ORG_NAME=Cherry
    APPLE_WALLET_PASS_DESCRIPTION=Cherry Spending Copilot Pass
    APPLE_WALLET_CERT_PASSWORD=...
    APPLE_WALLET_CERT_PATH=./certs/pass-cert.p12
    APPLE_WALLET_WWDR_CERT_PATH=./certs/apple-wwdr.pem
  - If the flag is off or env is incomplete, the route returns `501` with JSON:
    { "error": "wallet_pass_not_configured", "reason": "wallet_pass_disabled" | "missing_env" }
- Only when the flag is **true** and env is complete does it call `lib/wallet/cherryPass.ts` to generate a `.pkpass`.

## Files and Code Hooks
- API handler: `app/api/wallet/cherry-pass/route.ts` (gated).
- Config helper: `lib/wallet/config.ts` (feature flag + env validation).
- Pass builder: `lib/wallet/cherryPass.ts` (reads certs; only invoked when gated OK).
- Local-only certs (never committed):
  - `certs/pass-cert.p12`
  - `certs/apple-wwdr.pem`
- `.gitignore` should exclude `certs/`, `*.p12`, `*.pem`, `*.pkpass`.

## Product Identity Guardrails
- Pass type: `storeCard`, never `payment`.
- Purpose: visual brand + trigger into advisory flow, not a funding instrument.
- Copy: avoid “pay with Cherry”; emphasize “Scan Cherry before you pay.”

## Future/Target behavior (explicitly speculative)
- Keep the gating; enable with `CHERRY_WALLET_PASS_ENABLED=true` and full env.
- Pass payload: user name, Cherry Points snapshot (placeholder), tagline “Scan Cherry before you pay,” QR/URL into the session flow.
- Consider adding deep link/App Clip URL when infrastructure is available.

## Related docs
- `docs/legal-constraints.md`
- `docs/cherry-vision.md`
- `docs/api.md`

<!-- docs/zod-style.md -->
Status: Draft
Last updated: 2026-01-02

# Zod and linting style guide

## Current behavior (enforced / in code)
- Zod schemas live in `lib/schemas/*` and parse JSON via `parseJsonBody` from `lib/validation.ts`.
- ESLint/TS rules enforce strict boolean expressions and ban `any`.

- All schemas must be explicit and strict: `z.object({...}).strict()`. Do not allow extra fields or implicit coercions.
- Nullable must be explicit: use `.nullable()` for fields that can be null; avoid implicit acceptance of null/undefined.
- Request bodies and ingest payloads should parse through Zod before use; avoid raw `JSON.parse` or `request.json()` without schema validation.
- `@typescript-eslint/strict-boolean-expressions` is enforced with nullable primitives allowed (strings, numbers, booleans, objects) but `any` remains disallowed.
- `any` is banned; prefer precise types or `unknown` + schema refinement.
- Prisma nullability is expected (relations/optional fields); model schemas and checks accordingly rather than suppressing lint.

## Future/Target behavior (explicitly speculative)
- Add shared schema utilities to reduce duplication across API routes.

## Related docs
- `docs/guardrails.md`
- `docs/script-standards.md`


