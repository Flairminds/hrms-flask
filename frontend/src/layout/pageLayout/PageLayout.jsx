import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../../components/sidebar/Sidebar'
import { Navbar } from '../../components/navbar/Navbar'

export const PageLayout = ({ isRole }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* <Navbar /> */}
      <div style={{ display: "flex", flex: 1 }}>
        <div>
          <Sidebar isRole={isRole} />
        </div>
        <div style={{ flex: 1, background: '#f5f7fa', overflow: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

