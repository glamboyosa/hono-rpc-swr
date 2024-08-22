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
  useSWRMutation: (options?: SWRMutationConfiguration<T, any>) => any;
};

type DeepPartialSWR<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends (...args: any[]) => any
        ? T[K] extends {
            [method in HTTPMethodSuffix]: (...args: any[]) => Promise<any>;
          }
          ? T[K] & SWRMethods<Awaited<ReturnType<T[K][HTTPMethodSuffix]>>>
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
        get(target, prop: string) {
          if (prop === "useSWR") {
            const $get = getNestedProperty(client, path);

            return (
              arg?: typeof $get extends (...args: any[]) => any
                ? InferRequestType<typeof $get>
                : ParamsType,
              options?: SWRConfiguration
            ) =>
              useSWR(
                [...path],
                () => (client as any)[path[0]][path[1]].$get(arg),
                options
              );
          }
          if (prop === "useSWRMutation") {
            const $post = getNestedProperty(client, path);

            return (
              arg?: typeof $post extends (...args: any[]) => any
                ? InferRequestType<typeof $post>
                : ParamsType,
              options?: SWRMutationConfiguration<any, any, Key, ParamsType>
            ) =>
              useSWRMutation(
                [...path],
                (_: any, { arg }: { arg: any }) =>
                  (client as any)[path[0]][path[1]].$post(arg),
                options
              );
          }
          return buildPath([...path, prop as string]); // Build path dynamically
        },
      }
    );
  };

  return buildPath() as DeepPartialSWR<T>;
}
export { createHonoRPCSWR };
