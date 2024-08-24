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
function getNestedProperty<T>(
  client: T,
  path: string[]
):
  | {
      [method in HTTPMethodSuffix]: (...args: any[]) => Promise<any>;
    }
  | undefined {
  const result = path.reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as any)[key];
    }
    return undefined;
  }, client);
  return result as
    | {
        [method in HTTPMethodSuffix]: (...args: any[]) => Promise<any>;
      }
    | undefined;
}

type SWRMethods<T> = {
  useSWR: (params?: ParamsType, options?: SWRConfiguration<T>) => any;
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
  ) => any;
};
type DeepPartialSWR<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends (...args: any[]) => any
        ? T[K] extends {
            [method in HTTPMethodSuffix]: (...args: any[]) => Promise<any>;
          }
          ? T[K] & SWRMethods<T[K]>
          : T[K]
        : DeepPartialSWR<T[K]>;
    } & SWRMethods<T>
  : T;
function createHonoRPCSWR<T extends Hono<any, any, any>>(
  baseUrl: string
): DeepPartialSWR<T> {
  const client = hc<T>(baseUrl);

  const buildPath = (path: string[] = []) => {
    return new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === "useSWR") {
            const prop = getNestedProperty(client, path);
            const $get = prop?.$get;
            return (
              arg?: typeof $get extends (...args: any[]) => any
                ? InferRequestType<typeof $get>
                : ParamsType,
              options?: SWRConfiguration
            ) =>
              useSWR(
                [...path],
                () => {
                  if (!$get) {
                    throw new Error(
                      `GET method is not supported for this endpoint`
                    );
                  }
                  return $get(arg);
                },
                options
              );
          }
          if (prop === "useSWRMutation") {
            return <M extends HTTPMethodSuffix>(
              method: M,
              arg?: any,
              options?: SWRMutationConfiguration<any, any, Key, any>
            ) => {
              const nestedProp = getNestedProperty(client, path);
              const requestFunction = nestedProp?.[method];

              if (!requestFunction) {
                throw new Error(
                  `HTTP method ${method} is not supported for this endpoint`
                );
              }

              return useSWRMutation(
                [...path],
                () => requestFunction(arg),
                options
              );
            };
          }
          return buildPath([...path, prop as string]); // Build path dynamically
        },
      }
    );
  };

  return buildPath() as DeepPartialSWR<T>;
}
export { createHonoRPCSWR };
