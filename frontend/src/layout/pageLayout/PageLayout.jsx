import React, { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../../components/sidebar/Sidebar'
import { MenuOutlined, CloseOutlined } from '@ant-design/icons'
import styles from './PageLayout.module.css'

export const PageLayout = ({ isRole }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className={styles.root}>
      {/* Hamburger — only rendered on mobile */}
      <button
        className={styles.hamburger}
        onClick={() => setSidebarOpen(o => !o)}
        aria-label="Toggle navigation"
      >
        {sidebarOpen ? <CloseOutlined /> : <MenuOutlined />}
      </button>

      {/* Backdrop — tap outside to close */}
      {sidebarOpen && (
        <div className={styles.backdrop} onClick={closeSidebar} />
      )}

      <div className={styles.body}>
        {/* Sidebar wrapper — class drives open/closed on mobile */}
        <div className={`${styles.sidebarWrapper} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <Sidebar isRole={isRole} onNavigate={closeSidebar} />
        </div>

        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
