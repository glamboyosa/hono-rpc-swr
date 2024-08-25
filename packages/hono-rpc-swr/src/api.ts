import useSWR, { Key, SWRConfiguration, SWRResponse } from "swr";
import useSWRMutation, {
  SWRMutationConfiguration,
  SWRMutationResponse,
} from "swr/mutation";
import { ClientResponse, hc, InferRequestType } from "hono/client";
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
type ExtractResponseType<T> =
  T extends Promise<ClientResponse<infer R, any, any>> ? R : never;

type SWRMethods<T> = {
  useSWR: (
    arg?: T extends { $get: (...args: any[]) => any }
      ? InferRequestType<T["$get"]>
      : never,
    options?: SWRConfiguration<
      T extends { $get: (...args: any[]) => any }
        ? ExtractResponseType<ReturnType<T["$get"]>>
        : never
    >
  ) => SWRResponse<
    T extends { $get: (...args: any[]) => any }
      ? ExtractResponseType<ReturnType<T["$get"]>>
      : never,
    any
  >;
  useSWRMutation: <M extends HTTPMethodSuffix>(
    method: M,
    options?: SWRMutationConfiguration<
      T extends { [K in M]: (...args: any[]) => any }
        ? ExtractResponseType<ReturnType<T[M]>>
        : never,
      any,
      Key,
      any
    >
  ) => SWRMutationResponse<
    T extends { [K in M]: (...args: any[]) => any }
      ? ExtractResponseType<ReturnType<T[M]>>
      : never,
    any,
    Key,
    T extends { [K in M]: (...args: any[]) => any }
      ? InferRequestType<T[M]>
      : never
  >;
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
          return (arg?: any, options?: SWRConfiguration) => {
            const fetcher = () =>
              target
                .$get(arg)
                .then((res: ClientResponse<any, any, any>) => res.json());
            return useSWR([...path], fetcher, options);
          };
        }

        if (prop === "useSWRMutation") {
          return <M extends HTTPMethodSuffix>(
            method: M,
            options?: SWRMutationConfiguration<any, any, Key, any>
          ) => {
            // const fetcher = (
            //   key: string[],
            //   { arg: mutationArg }: { arg: any }
            // ) =>
            //   (target[method] as Function)(mutationArg).then(
            //     (res: ClientResponse<any, any, any>) => res.json()
            //   );
            const fetcher = (key: string, { arg }: { arg: any }) =>
              (target[method] as Function)(arg).then(
                (res: ClientResponse<any, any, any>) => res.json()
              );
            return useSWRMutation([...path, method], fetcher, options);
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
