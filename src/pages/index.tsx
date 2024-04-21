import { YDocProvider } from '@y-sweet/react'
import { getOrCreateDocAndToken } from '@y-sweet/sdk'
import Dashboard from './dashboard'
//import dynamic from 'next/dynamic'
 
//const Dashboard = dynamic(() => import('./dashboard'), { ssr: false })


export default function Home(props:any) {
  return (
    //<YDocProvider clientToken={props.clientToken} setQueryParam="doc">
    <>
      <Dashboard />
    </>
    //</YDocProvider>
  )
}

/* export async function getServerSideProps({ query }: { query: any }) {
  const clientToken = await getOrCreateDocAndToken("yss://K3qTlmAvIfD4UxfQkAk.AAAgkTRnVxsuMpmal4foxkri0aUsy1wW3teYLqL3FyNHkSY@y-sweet.net/p/ICTGyKs0J1lMB_vREXc/", query.doc)
  return {
    props: {
      searchParams: query,
      clientToken,
    }
  }
} */