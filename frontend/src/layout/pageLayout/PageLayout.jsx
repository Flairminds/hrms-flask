import React from 'react'
import { Outlet } from 'react-router-dom'
import {Sidebar}  from '../../components/sidebar/Sidebar'
import {Navbar} from '../../components/navbar/Navbar'

export const PageLayout = ({isRole}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* <Navbar /> */}
      <div style={{ display: "flex",height:"100%"}}>
        <div  style={{height:"100%"}}>
          <Sidebar isRole={isRole}/>
        </div>
        {/* <div className="col m-0 p-0"> */}
          <Outlet />
        {/* </div> */}
      </div>
    </div>
  )
}

