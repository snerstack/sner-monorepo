declare module "app-env" {
  interface ENV {
    VITE_SERVER_URL: string;
    VITE_HOST_TAGS: string[];
    VITE_SERVICE_TAGS: string[];
    VITE_VULN_TAGS: string[];
    VITE_NOTE_TAGS: string[];
    VITE_ANNOTATE_TAGS: string[];
  }

  const appEnv: ENV;
  export default appEnv;
}
