declare global {
  interface AppSettings {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    redirectUrl: string;
  }
}

export {};
