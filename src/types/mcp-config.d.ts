declare module 'dj-config-mcp' {
  export function configSet(key: string, value: string): Promise<void>;
  export function configGet(key: string): Promise<string | null>;
  export function configDelete(key: string): Promise<void>;
  export function configLoadEnv(): Promise<void>;
  
  const djConfig: {
    configSet: (key: string, value: string) => Promise<void>;
    configGet: (key: string) => Promise<string | null>;
    configDelete: (key: string) => Promise<void>;
    configLoadEnv: () => Promise<void>;
  };
  
  export default djConfig;
}

declare module 'dj-config-mcp/src/config-utils.js' {
  export function isSensitiveKey(key: string): boolean;
  export function saveSecretToEnv(key: string, value: string): void;
  export function getConfigValue(key: string): { value: any; source: string };
  export function saveNonSecretToConfig(key: string, value: any, isGlobal: boolean): void;
  export function getAllConfigKeys(): string[];
  export function distributeConfigToClients(clients: string[]): void;
}