import type { AppProps } from 'next/app'
import Head from 'next/head'
import './globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Universal IDE Database - Prompt Generator</title>
        <meta name="description" content="Generate customized prompts for 20+ IDEs" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}