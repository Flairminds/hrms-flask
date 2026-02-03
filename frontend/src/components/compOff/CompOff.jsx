import React, { useState } from 'react';
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, InputNumber, Space } from 'antd';
import stylesCompOff from './CompOff.module.css';
import moment from 'moment';

export const CompOff = ({ onSubmit }) => {
  const [itemCount, setItemCount] = useState(1);

  const handleAdd = (add) => {
    if (itemCount < 5) {
      add();
      // setItemCount(itemCount + 1); // logic is inside add() usually? No, AntD doesn't track count.
      // But we track itemCount state.
      // We should update it AFTER fields update?
      // fields.length logic?
      // AntD add() is async? No.
      setItemCount(prev => prev + 1);
    }
  };

  const handleRemove = (remove, name) => {
    remove(name);
    setItemCount(prev => prev - 1);
  }

  const areAllFieldsFilled = (users) => {
    if (!users) return false;
    return users.every(user => user.date && user.hours);
  };

  const disabledDate = (current) => {
    return current && current > moment().add(3, 'months');
  };

  return (
    <div className={stylesCompOff.main}>
      <div className={stylesCompOff.heading}>Holiday Worked On Data</div>

      <Form
        name="dynamic_form_nest_item"
        onValuesChange={(changedValues, allValues) => {
          if (areAllFieldsFilled(allValues.users)) {
            onSubmit(allValues.users);
          }
        }}
        style={{
          maxWidth: 600,
        }}
        autoComplete="off"
        initialValues={{ users: [{}] }}
      >
        <Form.List name="users">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Space
                  key={key}
                  style={{
                    display: 'flex',
                    marginBottom: 8,
                  }}
                  align="baseline"
                >
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyItems: 'center' }}>
                    <div>
                      <Form.Item
                        {...restField}
                        name={[name, 'date']}
                        rules={[{ required: true, message: 'Please select a date' }]}
                      >
                        <DatePicker disabledDate={disabledDate} />
                      </Form.Item>
                    </div>

                    <div>
                      <Form.Item
                        {...restField}
                        name={[name, 'hours']}
                        rules={[{ required: true, message: 'Please input the number of hours' }]}
                      >
                        <InputNumber min={1} max={8} defaultValue={0} />
                      </Form.Item>
                    </div>

                    <MinusCircleOutlined
                      onClick={() => handleRemove(remove, name)}
                      style={{ fontSize: '18px', color: '#ff4d4f', cursor: 'pointer', marginTop: '-20px' }}
                    />

                    {index === fields.length - 1 && itemCount < 5 && (
                      <PlusCircleOutlined
                        onClick={() => handleAdd(add)}
                        style={{ fontSize: '18px', color: '#1890ff', cursor: 'pointer', marginTop: '-20px' }}
                      />
                    )}
                  </div>
                </Space>
              ))}
            </>
          )}
        </Form.List>
      </Form>
    </div>
  );
};

export default CompOff;
