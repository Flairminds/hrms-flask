import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Button, message } from 'antd';
import { addUpdateSkill } from '../../../services/api';
import { getCookie } from '../../../util/CookieSet';

const { Option } = Select;

const AddEditSkillModal = ({ visible, onClose, skill, masterSkills, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const employeeId = getCookie('employeeId');

    useEffect(() => {
        if (visible && skill) {
            // Edit mode - populate form with existing skill data
            form.setFieldsValue({
                skillId: skill.SkillId,
                selfEvaluation: skill.SelfEvaluation,
                skillLevel: skill.SkillLevel,
                notes: skill.notes
            });
        } else if (visible) {
            // Add mode - reset form
            form.resetFields();
        }
    }, [visible, skill, form]);

    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            const payload = {
                skills: [{
                    employeeId,
                    skillId: values.skillId,
                    selfEvaluation: values.selfEvaluation,
                    skillLevel: values.skillLevel,
                    notes: values.notes
                }]
            };

            await addUpdateSkill(payload);
            message.success(skill ? 'Skill updated successfully' : 'Skill added successfully');
            form.resetFields();
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving skill:', error);
            message.error('Failed to save skill');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={skill ? 'Edit Skill Details' : 'Add New Skill'}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={500}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
            >
                <Form.Item
                    name="skillId"
                    label="Skill"
                    rules={[{ required: true, message: 'Please select a skill' }]}
                >
                    <Select
                        placeholder="Select a skill"
                        disabled={!!skill}
                        showSearch
                        filterOption={(input, option) =>
                            option.children.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {masterSkills.map(s => (
                            <Option key={s.value} value={s.value}>
                                {s.label}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="selfEvaluation"
                    label="Self Evaluation (1-5)"
                    rules={[
                        { required: true, message: 'Please rate your skill level' },
                        { type: 'number', min: 1, max: 5, message: 'Must be between 1 and 5' }
                    ]}
                >
                    <InputNumber
                        min={1}
                        max={5}
                        style={{ width: '100%' }}
                        placeholder="Rate from 1 to 5"
                    />
                </Form.Item>

                <Form.Item
                    name="skillLevel"
                    label="Skill Level"
                    rules={[{ required: true, message: 'Please select your skill level' }]}
                >
                    <Select placeholder="Select skill level">
                        <Option value="Beginner">Beginner</Option>
                        <Option value="Intermediate">Intermediate</Option>
                        <Option value="Advanced">Advanced</Option>
                        <Option value="Expert">Expert</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="Notes (Optional)"
                >
                    <Input.TextArea
                        rows={3}
                        placeholder="Add any notes about this skill..."
                    />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {skill ? 'Update' : 'Add'} Skill
                        </Button>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddEditSkillModal;
