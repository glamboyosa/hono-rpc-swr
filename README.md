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

## Installation

```bash
npm install @glamboyosa/hono-rpc-swr
# or
yarn add @glamboyosa/hono-rpc-swr
# or
pnpm add @glamboyosa/hono-rpc-swr
```

## Usage

First, create your Hono RPC client:

```typescript
import { createHonoRPCSWR } from "@glamboyosa/hono-rpc-swr";
import type { AppType } from "./your-hono-app-type";

const client = createHonoRPCSWR<AppType>("https://api.example.com");
```

Then, use it in your React components:

```typescript
function TodoList() {
  const { data, error } = client.api.todo.useSWR();

  if (error) return <div>Failed to load</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <ul>
      {data.todos.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}

function AddTodo() {
  const { trigger, isMutating } = client.api.todo.useSWRMutation('$post');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const title = event.target.title.value;
    await trigger({ form: { id: Date.now().toString(), title } });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" />
      <button type="submit" disabled={isMutating}>
        Add Todo
      </button>
    </form>
  );
}
```

## API Reference

### `createHonoRPCSWR<T>(baseUrl: string)`

Creates a client that mirrors your Hono RPC structure, with `useSWR` and `useSWRMutation` methods added to each endpoint.

- `T`: Your Hono app type
- `baseUrl`: The base URL of your API

Returns the Hono client with SWR methods.

For each endpoint in your Hono RPC structure, the following methods are available:

#### `useSWR(arg?: InferRequestType<T['$get']>, options?: SWRConfiguration)`

Uses SWR to fetch data from the endpoint.

- `arg`: The argument to pass to the `$get` method
- `options`: SWR configuration options

Returns an `SWRResponse` object with strongly typed `data`.

#### `useSWRMutation(method: HTTPMethodSuffix, arg?: InferRequestType<T[M]>, options?: SWRMutationConfiguration)`

Uses SWR mutation to modify data at the endpoint.

- `method`: The HTTP method to use (e.g., '$post', '$put', '$patch')
- `arg`: The argument to pass to the method
- `options`: SWR mutation configuration options

Returns an `SWRMutationResponse` object with strongly typed `data`.

## Examples

This repository includes two example applications:

1. `web`: A Next.js application demonstrating usage with React and Next.js
2. `cfpages`: A Cloudflare Pages application showing integration with CF Pages & React

Check out these examples for practical usage patterns and best practices.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

```

```
