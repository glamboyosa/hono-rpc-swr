# @glamboyosa/hono-rpc-swr

A seamless integration of Hono RPC with SWR for React applications.

## Motivation

Hono RPC offers a powerful way to define and share API specifications between server and client, similar to tRPC. While this provides excellent type safety and developer experience, integrating it with data fetching libraries like SWR can be challenging or just very vanilla i.e. use the RPC function as the fetcher.

This package draws inspiration from tRPC's integrations with libraries like Tanstack Query, aiming to provide a similar intuitive, chainable API for Hono RPC users who prefer SWR for data fetching and state management.

`@glamboyosa/hono-rpc-swr` offers:

1. A seamless bridge between Hono RPC and SWR
2. An intuitive, chainable API that mirrors your RPC route structure
3. Full type safety, leveraging your existing Hono RPC types
4. Easy integration with React components

### Apps and Packages

This app is a Turborepo monorepo app and contains the following.

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).
