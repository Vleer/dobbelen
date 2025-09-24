declare module 'sockjs-client' {
  interface SockJSStatic {
    new (url: string): any;
  }
  const SockJS: SockJSStatic;
  export = SockJS;
}
