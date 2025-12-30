import React from 'react'
import styles from './TeamLeaves.module.css';
import { LeaveTablePending } from '../../components/leaveTable/LeaveTablePending.jsx'
import { Calendar, Empty, Select, theme } from 'antd';
import { Tag } from 'antd';
const options = [
  {
    value: '#07803E',
    label: "Approved"
  },
  {
    value: '#9D166B',
    label: "Rejected"
  },
  {
    value: 'green',
    label: "Pending"

  },
  {
    value: '#008D8D',
    label: "Canceled"
  },
];
const tagRender = (props) => {
  const { label, value, closable, onClose } = props;
  const onPreventMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <Tag
      color={value}
      onMouseDown={onPreventMouseDown}
      closable={closable}
      onClose={onClose}
      style={{
        marginInlineEnd: 4,
      }}
    >
      {label}
    </Tag>
  );
};

export const TeamLeaves = ({isRole , setIsRole}) => {
  const leaveOptions = [
    { value: 'Sick Leave', label: 'Sick Leave' },
    { value: 'Work from home', label: 'Work from home' },
    { value: 'Privilege Leave', label: 'Privilege Leave' },
  ];

  return (
    <div className={styles.mainContainer}>
      <div className={styles.tableContainer}>
        <LeaveTablePending isRole={isRole}/>
      </div>
    </div>
  )
}

