declare module 'dj-config-mcp/src/config-utils.js' {
  export function isSensitiveKey(key: string): boolean;
  export function saveSecretToEnv(key: string, value: string): void;
  export function getConfigValue(key: string): { value: any; source: string };
  export function saveNonSecretToConfig(key: string, value: any, isGlobal: boolean): void;
  export function getAllConfigKeys(): string[];
  export function distributeConfigToClients(clients: string[]): void;
}