import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { hc } from "hono/client";
import { Hono } from "hono";
type HTTPMethodSuffix = "$get" | "$post" | "$put" | "$patch" | (string & {});

type SWRMethods = {
  useSWR: (params?: any, options?: any) => any;
  useSWRMutation: (options?: any) => any;
};
type DeepPartialSWR<T> = T extends (...args: any[]) => any
  ? T extends { [method in HTTPMethodSuffix]: Promise<any> }
    ? T & SWRMethods
    : T
  : {
      [K in keyof T]: DeepPartialSWR<T[K]>;
    } & SWRMethods;
export function createHonoRPCSWR<T extends Hono<any, any, any>>(
  baseUrl: string
): DeepPartialSWR<T> {
  const client = hc<T>(baseUrl);

  const buildPath = (path: string[] = []) => {
    return new Proxy(
      {},
      {
        get(target, prop: string) {
          if (prop === "useSWR") {
            return (params?: any, options?: any) =>
              useSWR(
                [...path],
                () => (client as any)[path[0]][path[1]].$get(params),
                options
              );
          }
          if (prop === "useSWRMutation") {
            return (options?: any) =>
              useSWRMutation(
                [...path],
                (_, { arg }: { arg: any }) =>
                  (client as any)[path[0]][path[1]].$post({ form: arg }),
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
