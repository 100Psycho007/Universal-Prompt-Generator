declare module 'robots-parser' {
  interface RobotsParserInstance {
    isAllowed(url: string, userAgent?: string): boolean | undefined
    isDisallowed(url: string, userAgent?: string): boolean | undefined
    getCrawlDelay(userAgent?: string): number | undefined
    getSitemaps(): string[]
  }

  function robotsParser(robotsUrl: string, robotsBody: string): RobotsParserInstance

  export default robotsParser
}
