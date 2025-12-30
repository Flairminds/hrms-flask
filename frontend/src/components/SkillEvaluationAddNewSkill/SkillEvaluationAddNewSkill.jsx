import React, { useState, useEffect } from "react";
import { Form, Input, InputNumber, Checkbox, Button, Select } from 'antd';
import styles from "./SkillEvaluationAddNewSkill.module.css";
import Cookies from 'js-cookie';

const { Option } = Select;

export const SkillEvaluationAddNewSkill = ({ skillsList, onAddSkill }) => {
  const [newSkill, setNewSkill] = useState({ skillId: null, skillName: "", skillType: "Secondary", evaluatorScore: 1, isReady: false, isCustom: false });
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(newSkill);
  }, [newSkill, form]);

  const handleFormChange = (changedValues) => {
    setNewSkill(prev => ({
      ...prev,
      ...changedValues
    }));
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      onAddSkill(values);
      form.resetFields();
      setNewSkill({ skillId: null, skillName: "", skillType: "Secondary", evaluatorScore: 1, isReady: false, isCustom: false });
    }).catch(error => {
      console.error('Validation failed:', error);
    });
  };

  return (
    <div className={styles.addSkillSection}>
      <h4>Add New Skill</h4>
      <Form form={form} layout="vertical" onValuesChange={handleFormChange} initialValues={{ skillType: "Secondary", evaluatorScore: 1, isReady: false, skillId: null }}>
        <Form.Item label="Skill Name" name="skillId">
          <Select
            placeholder="Select a skill"
            onChange={(value, option) => setNewSkill({
              ...newSkill,
              skillId: value,
              skillName: option?.children || "",
              isCustom: value === 'other'
            })}
            showSearch
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
            allowClear
          >
            {skillsList.map(skill => (
              <Option key={skill.SkillId} value={skill.SkillId}>
                {skill.SkillName}
              </Option>
            ))}
            <Option value="other">Other (Add new skill)</Option>
          </Select>
        </Form.Item>
        {newSkill.isCustom && (
          <Form.Item label="Custom Skill Name" name="skillName">
            <Input
              placeholder="Enter new skill name"
              onChange={(e) => setNewSkill({ ...newSkill, skillName: e.target.value })}
            />
          </Form.Item>
        )}
        <Form.Item label="Skill Level" name="skillType">
          <select
            onChange={(e) => setNewSkill({ ...newSkill, skillType: e.target.value })}
            className={styles.select}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d9d9d9', width: '100%' }}
          >
            <option value="Primary">Primary</option>
            <option value="Secondary">Secondary</option>
            <option value="CrossTechSkill">Cross Tech Skill</option>
          </select>
        </Form.Item>
        <Form.Item label="Evaluator Score" name="evaluatorScore">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <InputNumber
              min={0}
              max={5}
              step={0.1}
              style={{ width: '100px' }}
              precision={1}
            />
            <span style={{ color: getScoreFeedback(form.getFieldValue('evaluatorScore') || 1).color, fontWeight: 'bold' }}>
              {getScoreFeedback(form.getFieldValue('evaluatorScore') || 1).text}
            </span>
          </div>
        </Form.Item>
        <Form.Item name="isReady" valuePropName="checked">
          <Checkbox
            onChange={(e) => setNewSkill({ ...newSkill, isReady: e.target.checked })}
          >
            Is ready for customer-facing Level 1 assignment?
          </Checkbox>
        </Form.Item>
        <Button type="primary" onClick={handleSubmit} style={{ marginRight: 8 }}>
          Add Skill
        </Button>
      </Form>
    </div>
  );
};

const getScoreFeedback = (score) => {
  if (score === null || score === undefined) return { text: "No score provided", color: "#888" };
  if (score >= 0 && score <= 1) return { text: "Does not meet requirements", color: "#ff4d4f" };
  if (score > 1 && score <= 2) return { text: "Occasionally meets requirements", color: "#fa8c16" };
  if (score > 2 && score <= 3) return { text: "Meets requirements / Average", color: "#52c41a" };
  if (score > 3 && score < 5) return { text: "Above average", color: "#52c41a" };
  if (score === 5) return { text: "Exceeds expectations", color: "#52c41a" };
  return { text: "", color: "#000000" };
};

export default SkillEvaluationAddNewSkill;