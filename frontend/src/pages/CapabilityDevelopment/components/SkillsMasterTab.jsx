import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Input, Button, Form, Select, Modal, AutoComplete,
    Tag, Spin, message, Typography, Space, Tooltip
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { getMasterSkills, addMasterSkill } from '../../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const SkillsMasterTab = () => {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState(null);
    const [skillNameInput, setSkillNameInput] = useState('');  // tracks modal input
    const [form] = Form.useForm();

    // ── fetch ──────────────────────────────────────────────────────────
    const fetchSkills = async () => {
        try {
            setLoading(true);
            const res = await getMasterSkills();
            setSkills(res.data?.data || []);
        } catch {
            message.error('Failed to load master skills');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSkills(); }, []);

    // ── derive unique types & categories from live API data ────────────
    const skillTypes = useMemo(
        () => [...new Set(skills.map(s => s.skillType).filter(Boolean))].sort(),
        [skills]
    );
    const skillCategories = useMemo(
        () => [...new Set(skills.map(s => s.skillCategory).filter(Boolean))].sort(),
        [skills]
    );

    // AutoComplete option arrays
    const typeOptions = skillTypes.map(t => ({ value: t }));
    const categoryOptions = skillCategories.map(c => ({ value: c }));

    // ── skill-name matching for the modal ──────────────────────────────
    const skillNames = useMemo(
        () => skills.map(s => s.skillName).filter(Boolean),
        [skills]
    );
    // options shown in AutoComplete: existing names that contain the typed text
    const skillNameOptions = useMemo(() => {
        if (!skillNameInput.trim()) return [];
        const q = skillNameInput.toLowerCase();
        return skillNames
            .filter(n => n.toLowerCase().includes(q))
            .map(n => ({ value: n, label: n }));
    }, [skillNameInput, skillNames]);
    // exact (case-insensitive) duplicate check
    const isExactDuplicate = useMemo(
        () => skillNames.some(n => n.toLowerCase() === skillNameInput.toLowerCase().trim()),
        [skillNameInput, skillNames]
    );

    // ── filtered rows ──────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return skills.filter(s => {
            if (filterType && s.skillType !== filterType) return false;
            if (q && !s.skillName?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [skills, search, filterType]);

    // ── add skill ──────────────────────────────────────────────────────
    const handleAdd = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await addMasterSkill(values);
            message.success(`Skill "${values.skillName}" added successfully`);
            form.resetFields();
            setSkillNameInput('');
            setModalOpen(false);
            fetchSkills();
        } catch (err) {
            if (err?.errorFields) return; // antd validation failure
            const errMsg = err?.response?.data?.error || 'Failed to add skill';
            message.error(errMsg);
        } finally {
            setSaving(false);
        }
    };

    // ── table columns ──────────────────────────────────────────────────
    const columns = [
        {
            title: 'Skill Name',
            dataIndex: 'skillName',
            sorter: (a, b) => a.skillName.localeCompare(b.skillName),
            render: name => <span style={{ fontWeight: '500', padding: '1rem' }}>{name}</span>,
        },
        {
            title: 'Type',
            dataIndex: 'skillType',
            width: 200,
            render: type => type
                ? <Tag color="blue">{type}</Tag>
                : <span style={{ color: '#9ca3af' }}>—</span>,
            // filter options come from live data
            filters: skillTypes.map(t => ({ text: t, value: t })),
            onFilter: (val, rec) => rec.skillType === val,
        },
        {
            title: 'Category',
            dataIndex: 'skillCategory',
            width: 200,
            render: cat => cat
                ? <Tag color="geekblue">{cat}</Tag>
                : <span style={{ color: '#9ca3af' }}>—</span>,
            filters: skillCategories.map(c => ({ text: c, value: c })),
            onFilter: (val, rec) => rec.skillCategory === val,
        },
    ];

    // ── render ─────────────────────────────────────────────────────────
    return (
        <div>
            {/* ── Header row ──────────────────────────────────────────── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10
            }}>
                <div>
                    <Title level={5} style={{ margin: 0, color: '#1f2937' }}>Master Skills List</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {filtered.length} of {skills.length} skills
                    </Text>
                </div>
                <Space wrap>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Search skill"
                        allowClear
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: 220 }}
                    />
                    {/* Filter by type — options populated from API */}
                    {/* <Select
                        placeholder="Filter by Type"
                        allowClear
                        value={filterType}
                        onChange={setFilterType}
                        style={{ width: 160 }}
                    >
                        {skillTypes.map(t => <Option key={t} value={t}>{t}</Option>)}
                    </Select> */}
                    <Tooltip title="Add a new skill to the master list">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setModalOpen(true)}
                        >
                            Add Skill
                        </Button>
                    </Tooltip>
                </Space>
            </div>

            {/* ── Table ────────────────────────────────────────────────── */}
            <Spin spinning={loading}>
                <Table
                    dataSource={filtered}
                    columns={columns}
                    rowKey="skillId"
                    size="middle"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 600 }}
                    style={{ border: '1px solid #eeeeee', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
                    locale={{ emptyText: loading ? ' ' : 'No skills found' }}
                />
            </Spin>

            {/* ── Add Skill Modal ──────────────────────────────────────── */}
            <Modal
                title={
                    <span style={{ fontWeight: 700, color: '#4f46e5' }}>
                        {/* <PlusOutlined style={{ marginRight: 8 }} />
                        Add New Master Skill */}
                    </span>
                }
                open={modalOpen}
                onCancel={() => { setModalOpen(false); form.resetFields(); setSkillNameInput(''); }}
                onOk={handleAdd}
                okText="Add Skill"
                confirmLoading={saving}
                okButtonProps={{ style: { background: '#4f46e5', borderColor: '#4f46e5' } }}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        label="Skill Name"
                        name="skillName"
                        rules={[{ required: true, message: 'Skill name is required' }]}
                    >
                        <AutoComplete
                            options={skillNameOptions}
                            placeholder="e.g. React, Python, Docker…"
                            value={skillNameInput}
                            onChange={val => {
                                setSkillNameInput(val);
                                form.setFieldValue('skillName', val);
                            }}
                            filterOption={false}  // we handle filtering in skillNameOptions
                            allowClear
                            onClear={() => setSkillNameInput('')}
                        />
                    </Form.Item>

                    {/* Inline duplicate warning */}
                    {isExactDuplicate && (
                        <div style={{
                            marginTop: -12, marginBottom: 12,
                            padding: '8px 12px', borderRadius: 6,
                            background: '#fffbeb', border: '1px solid #fcd34d',
                            color: '#92400e', fontSize: 13, display: 'flex', gap: 6,
                        }}>
                            ⚠️ <span><b>"{skillNameInput}"</b> already exists</span>
                        </div>
                    )}

                    {/* Skill Type — pick existing or type a new one */}
                    <Form.Item
                        label="Skill Type"
                        name="skillType"
                        tooltip="Pick an existing type or type a new one"
                    >
                        <AutoComplete
                            options={typeOptions}
                            placeholder="e.g. Technical, Soft Skill, etc."
                            filterOption={(input, option) =>
                                option.value.toLowerCase().includes(input.toLowerCase())
                            }
                            allowClear
                        />
                    </Form.Item>

                    {/* Skill Category — pick existing or type a new one */}
                    <Form.Item
                        label="Skill Category"
                        name="skillCategory"
                        tooltip="Pick an existing category or type a new one"
                    >
                        <AutoComplete
                            options={categoryOptions}
                            placeholder="e.g. Frontend, AI/ML, etc."
                            filterOption={(input, option) =>
                                option.value.toLowerCase().includes(input.toLowerCase())
                            }
                            allowClear
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SkillsMasterTab;
