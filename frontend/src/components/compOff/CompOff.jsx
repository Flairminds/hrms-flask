import React, { useState } from 'react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, InputNumber, Space } from 'antd';
import stylesCompOff from './CompOff.module.css';
import moment from 'moment';

export const CompOff = ({ onSubmit }) => {
  const [itemCount, setItemCount] = useState(1);

  const handleAdd = (add) => {
    if (itemCount < 5) {
      add();
      setItemCount(itemCount + 1);
    }
  };
  const areAllFieldsFilled = (users) => {
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
              {fields.map(({ key, name, ...restField }) => (
                <Space
                  key={key}
                  style={{
                    display: 'flex',
                    marginBottom: 8,
                  }}
                  align="baseline"
                >
                  <div style={{ display: 'flex', gap: '20px', paddingTop: '10px' }}>
                    <div>
                      <p className={stylesCompOff.heading}>Date</p>
                      <Form.Item
                        {...restField}
                        name={[name, 'date']}
                        rules={[{ required: true, message: 'Please select a date' }]}
                      >
                        <DatePicker disabledDate={disabledDate} />
                      </Form.Item>
                    </div>

                    <div>
                      <p className={stylesCompOff.heading}>Number of hours</p>
                      <Form.Item
                        {...restField}
                        name={[name, 'hours']}
                        rules={[{ required: true, message: 'Please input the number of hours' }]}
                      >
                        <InputNumber min={1} max={8} defaultValue={0} />
                      </Form.Item>
                    </div>

                    <MinusCircleOutlined
                      onClick={() => {
                        remove(name);
                        setItemCount(itemCount - 1);
                      }}
                    />
                  </div>
                </Space>
              ))}

              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => handleAdd(add)}
                  block
                  icon={<PlusOutlined />}
                  disabled={itemCount >= 5}
                >
                  Add
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </div>
  );
};

export default CompOff;
