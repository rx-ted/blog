export declare namespace ENV {
    export interface Config {
        baseUrl: string
    }
}
const baseUrl: string = import.meta.env.BASE_URL
export function getEnvConfig(): ENV.Config {
    return {
        baseUrl: baseUrl
    }
}
export const envConfig = getEnvConfig()