import { Outlet } from 'react-router'
import Navbar from './Navbar'

 export default function LandingLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="">
        <Outlet />
      </main>
    </div>
  )
}


