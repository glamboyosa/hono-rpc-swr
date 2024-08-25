import useSWR, { Key, SWRConfiguration } from "swr";
import useSWRMutation, { SWRMutationConfiguration } from "swr/mutation";
import { hc, InferRequestType } from "hono/client";
import { Hono } from "hono";

type HTTPMethodSuffix = "$get" | "$post" | "$put" | "$patch" | (string & {});
type ContentType = "application/json" | "application/xml" | "text/plain";
type Headers = {
  "Content-Type"?: ContentType | (string & {});
} & Record<string, string>;
type ParamsType = {
  param?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Headers;
};

type SWRMethods<T> = {
  useSWR: (
    arg?: T extends { $get: (...args: any[]) => any }
      ? InferRequestType<T["$get"]>
      : never,
    options?: SWRConfiguration
  ) => ReturnType<typeof useSWR>;
  useSWRMutation: <M extends HTTPMethodSuffix>(
    method: M,
    arg?: T extends { [K in M]: (...args: any[]) => any }
      ? InferRequestType<T[M]>
      : never,
    options?: SWRMutationConfiguration<
      T extends { [K in M]: (...args: any[]) => any }
        ? Awaited<ReturnType<T[M]>>
        : never,
      any,
      Key,
      any
    >
  ) => ReturnType<typeof useSWRMutation>;
};

type EnhancedClientType<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends (...args: any[]) => any
        ? T[K] extends {
            [method in HTTPMethodSuffix]: (...args: any[]) => Promise<any>;
          }
          ? T[K] & SWRMethods<T[K]>
          : T[K]
        : EnhancedClientType<T[K]>;
    } & SWRMethods<T>
  : T;

function createHonoRPCSWR<T extends Hono<any, any, any>>(
  baseUrl: string
): EnhancedClientType<ReturnType<typeof hc<T>>> {
  const client = hc<T>(baseUrl);

  function enhanceClient(obj: any, path: string[] = []): any {
    return new Proxy(obj, {
      get(target, prop: string) {
        if (prop === "useSWR") {
          return (params?: ParamsType, options?: SWRConfiguration) => {
            const key = [...path, "$get"];
            return useSWR(key, () => target.$get(params), options);
          };
        }

        if (prop === "useSWRMutation") {
          return <M extends HTTPMethodSuffix>(
            method: M,
            arg?: any,
            options?: SWRMutationConfiguration<any, any, Key, any>
          ) => {
            const key = [...path, method];
            return useSWRMutation(
              key,
              () => (target[method] as Function)(arg),
              options
            );
          };
        }

        const value = target[prop];
        if (typeof value === "object" && value !== null) {
          return enhanceClient(value, [...path, prop]);
        }
        return value;
      },
    });
  }

  return enhanceClient(client) as EnhancedClientType<ReturnType<typeof hc<T>>>;
}

export { createHonoRPCSWR };
